#!/usr/bin/env python3
"""Impro agent: Telegram'dan buyurtma -> GitHub Actions (bepul) -> video yoki sayt tayyorlab Telegram'ga qaytaradi.
Rejimlar: video | site. Sirlar muhit oʻzgaruvchilarida (BOT_TOKEN, GEMINI_API_KEY, PEXELS_API_KEY, CLOUDFLARE_*).
Logga buyurtma matni chop etilmaydi (repo ochiq boʻlishi mumkin)."""
import json, os, re, shutil, subprocess, sys, tempfile, textwrap, urllib.error, urllib.parse, urllib.request, uuid

W, H, FPS = 1080, 1920, 25
FONT = next((p for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'] if os.path.exists(p)), '')
VOICES = {'uz': ['uz-UZ-SardorNeural', 'uz-UZ-MadinaNeural'], 'ru': ['ru-RU-DmitryNeural'], 'en': ['en-US-GuyNeural']}
CHAT = os.environ.get('CHAT', '')


def log(*a):
    print(*a, flush=True)


def http(url, data=None, headers=None, method=None, timeout=120):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def tg(method, **data):
    tok = os.environ.get('BOT_TOKEN')
    if not tok or not CHAT:
        return None
    try:
        return json.loads(http(f'https://api.telegram.org/bot{tok}/{method}', json.dumps({'chat_id': CHAT, **data}).encode(), {'content-type': 'application/json'}))
    except Exception as e:  # noqa
        log('tg xato', type(e).__name__)
        return None


def tg_file(method, field, path, **data):
    tok = os.environ.get('BOT_TOKEN')
    if not tok or not CHAT:
        return None
    b = uuid.uuid4().hex
    parts = []
    for k, v in {'chat_id': CHAT, **data}.items():
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{field}"; filename="{os.path.basename(path)}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode() + open(path, 'rb').read() + b'\r\n')
    parts.append(f'--{b}--\r\n'.encode())
    try:
        return json.loads(http(f'https://api.telegram.org/bot{tok}/{method}', b''.join(parts), {'content-type': f'multipart/form-data; boundary={b}'}, timeout=300))
    except Exception as e:  # noqa
        log('tg fayl xato', type(e).__name__)
        return None


def llm(prompt, system='', want_json=False):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        raise RuntimeError('GEMINI_API_KEY yoʻq')
    last = None
    for model in [os.environ.get('GEMINI_MODEL'), 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash']:
        if not model:
            continue
        body = {'contents': [{'role': 'user', 'parts': [{'text': prompt}]}], 'generationConfig': {'temperature': 0.7, **({'responseMimeType': 'application/json'} if want_json else {})}}
        if system:
            body['systemInstruction'] = {'parts': [{'text': system}]}
        try:
            out = json.loads(http(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}', json.dumps(body).encode(), {'content-type': 'application/json'}, timeout=180))
            txt = ''.join(p.get('text', '') for p in out['candidates'][0]['content']['parts']).strip()
            if txt:
                return txt
        except urllib.error.HTTPError as e:
            last = e.code
            if e.code in (429, 500, 503):
                continue
        except Exception as e:  # noqa
            last = type(e).__name__
    raise RuntimeError(f'LLM ishlamadi ({last})')


def parse_json(t):
    t = re.sub(r'^```(?:json)?|```$', '', t.strip(), flags=re.M).strip()
    m = re.search(r'[\[{][\s\S]*[\]}]', t)
    return json.loads(m.group(0) if m else t)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-400:])
    return r.stdout


def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).strip() or 0)


# ---------------- VIDEO ----------------
def plan_scenes(prompt, lang):
    name = {'uz': 'Uzbek (Latin script)', 'ru': 'Russian', 'en': 'English'}.get(lang, 'Uzbek (Latin script)')
    out = parse_json(llm(
        f'Create a vertical Instagram Reels / Telegram video script (30-45 seconds total, 5-7 scenes) about:\n{prompt}\n\n'
        f'Voice-over and captions language: {name}. Strong hook in scene 1, clear call to action in the last scene. '
        'Each voice-over line max 22 words, natural spoken language. Never invent phone numbers, prices or addresses.\n'
        'Return JSON: {"title": str, "scenes": [{"voice": str, "caption": str (max 8 words), "query": str (2-3 English words for stock photo search)}], "hashtags": [str]}', want_json=True))
    scenes = [s for s in out.get('scenes', []) if s.get('voice')][:8]
    if len(scenes) < 2:
        raise RuntimeError('ssenariy yetarli emas')
    return out.get('title', ''), scenes, out.get('hashtags', [])


def fetch_image(query, dest):
    key = os.environ.get('PEXELS_API_KEY')
    if not key:
        return False
    try:
        d = json.loads(http('https://api.pexels.com/v1/search?' + urllib.parse.urlencode({'query': query, 'orientation': 'portrait', 'per_page': 3}), headers={'Authorization': key}))
        ph = (d.get('photos') or [None])[0]
        if not ph:
            return False
        open(dest, 'wb').write(http(ph['src']['large2x']))
        return True
    except Exception as e:  # noqa
        log('pexels xato', type(e).__name__)
        return False


def tts(text, lang, dest):
    for v in VOICES.get(lang, VOICES['uz']):
        try:
            run(['edge-tts', '--voice', v, '--text', text, '--write-media', dest])
            if os.path.exists(dest) and os.path.getsize(dest) > 1000:
                return True
        except Exception as e:  # noqa
            log('tts xato', str(e)[:80])
    return False


COLORS = ['0x1d2b53', '0x7e2553', '0x008751', '0xab5236', '0x29366f', '0x5f574f']


def render_scene(i, sc, lang, work):
    img, aud, seg = f'{work}/i{i}.jpg', f'{work}/a{i}.mp3', f'{work}/s{i}.mp4'
    have_img = fetch_image(sc.get('query') or 'business', img)
    if not tts(sc['voice'], lang, aud):
        n = max(3.0, len(sc['voice']) * 0.07)
        run(['ffmpeg', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', f'{n:.2f}', '-c:a', 'libmp3lame', aud])
    d = duration(aud) + 0.5
    cap = textwrap.fill(sc.get('caption') or sc['voice'], 20)
    open(f'{work}/c{i}.txt', 'w', encoding='utf-8').write(cap)
    frames = int(d * FPS)
    text = (f"drawtext=fontfile='{FONT}':textfile='{work}/c{i}.txt':fontcolor=white:fontsize=72:line_spacing=14:"
            "x=(w-text_w)/2:y=h*0.66:box=1:boxcolor=black@0.55:boxborderw=32") if FONT else 'null'
    if have_img:
        vf = (f"scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,"
              f"zoompan=z='min(zoom+0.0006,1.12)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},{text}")
        inp = ['-i', img]
    else:
        vf = f'{text}'
        inp = ['-f', 'lavfi', '-i', f'color=c={COLORS[i % len(COLORS)]}:s={W}x{H}:r={FPS}']
    run(['ffmpeg', '-y', *inp, '-i', aud, '-t', f'{d:.2f}', '-vf', vf, '-r', str(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '23',
         '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest', seg])
    return seg


def make_video(prompt, lang, scenes_file=None):
    work = tempfile.mkdtemp()
    if scenes_file:
        data = json.load(open(scenes_file))
        title, scenes, tags = data.get('title', ''), data['scenes'], data.get('hashtags', [])
    else:
        tg('sendMessage', text='🧠 Ssenariy yozyapman…')
        title, scenes, tags = plan_scenes(prompt, lang)
    tg('sendMessage', text=f'🎬 {len(scenes)} ta sahna tayyorlanmoqda, 3-8 daqiqa…')
    segs = [render_scene(i, sc, lang, work) for i, sc in enumerate(scenes)]
    lst = f'{work}/list.txt'
    open(lst, 'w').write(''.join(f"file '{s}'\n" for s in segs))
    out = os.path.join(os.environ.get('OUT_DIR', work), 'video.mp4')
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', out])
    log('video tayyor', round(os.path.getsize(out) / 1e6, 1), 'MB')
    cap = (title + '\n\n' + ' '.join('#' + t.lstrip('#') for t in tags[:8]))[:1000]
    r = tg_file('sendVideo', 'video', out, caption=cap, supports_streaming='true', width=W, height=H)
    if not (r and r.get('ok')):
        tg_file('sendDocument', 'document', out, caption=cap)
    return out


# ---------------- SAYT ----------------
def make_site(prompt, lang):
    tg('sendMessage', text='🧠 Sayt kodini yozyapman…')
    out = parse_json(llm(
        f'Build a complete, modern, mobile-first single-page website for this business/request:\n{prompt}\n\n'
        'Requirements: ONE self-contained HTML file with inline CSS and minimal JS; semantic HTML; good SEO (title, meta description, Open Graph, headings, alt texts, JSON-LD LocalBusiness if relevant); '
        f'beautiful professional design (gradient hero, cards, sticky call-to-action, smooth scroll); content language: {"Uzbek (Latin)" if lang == "uz" else lang}. '
        'Do NOT invent phone numbers, addresses or prices: use clearly marked placeholders like [telefon] if not provided. No external images; use CSS/SVG/emoji.\n'
        'Return JSON: {"slug": "latin-kebab-3-20-chars", "html": "<full html>"}', want_json=True))
    html = out.get('html', '')
    if '<html' not in html.lower() or len(html) < 800:
        raise RuntimeError('sayt kodi yaroqsiz')
    slug = re.sub(r'[^a-z0-9-]+', '-', str(out.get('slug', 'site')).lower()).strip('-')[:20] or 'site'
    name = f'site-{slug}-{uuid.uuid4().hex[:4]}'
    d = tempfile.mkdtemp()
    os.makedirs(f'{d}/public')
    open(f'{d}/public/index.html', 'w', encoding='utf-8').write(html)
    json.dump({'name': name, 'compatibility_date': '2025-09-01', 'assets': {'directory': './public'}}, open(f'{d}/wrangler.jsonc', 'w'))
    tg('sendMessage', text='🚀 Cloudflare’ga joylayapman…')
    res = subprocess.run(['npx', '--yes', 'wrangler@4', 'deploy'], cwd=d, capture_output=True, text=True, timeout=600)
    m = re.search(r'https://[\w.-]+\.workers\.dev', res.stdout + res.stderr)
    if res.returncode != 0 or not m:
        raise RuntimeError('joylashda xato: ' + (res.stderr or res.stdout)[-300:])
    url = m.group(0)
    tg('sendMessage', text=f'✅ Sayt tayyor:\n{url}\n\nKod faylini ham yuboraman.')
    tg_file('sendDocument', 'document', f'{d}/public/index.html', caption=f'{name} · index.html')
    return url


def main():
    kind = sys.argv[1] if len(sys.argv) > 1 else ''
    prompt, lang = os.environ.get('PROMPT', ''), os.environ.get('LANG_', 'uz')
    try:
        if kind == 'video':
            make_video(prompt, lang, os.environ.get('SCENES_FILE'))
        elif kind == 'site':
            make_site(prompt, lang)
        else:
            raise RuntimeError('nomaʼlum rejim')
    except Exception as e:  # noqa
        log('XATO', str(e)[:300])
        tg('sendMessage', text=f'❌ Bajarilmadi: {str(e)[:300]}')
        sys.exit(1)


if __name__ == '__main__':
    main()
