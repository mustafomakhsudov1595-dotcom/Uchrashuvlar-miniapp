# VisionMonitor — kamera + AI orqali xodimlar nazorati

Veb-sayt: ro'yxatdan o'tish → shaxsiy kabinet → kamera qo'shish → AI xodimlarni kuzatadi → hisobot.

## Nimalarni aniqlaydi
| Hisobotda | Qanday aniqlanadi |
|---|---|
| Ishga **kelgan vaqti**, kechikish | Xodim kameralarda birinchi marta ko'ringan vaqt (ish boshlanishi sozlamalarda) |
| **Tashqariga chiqishlar** (soni va har birining davomiyligi) | Xodim `grace` soniyadan ortiq kameralarda ko'rinmasa — chiqdi; qaytganda — qaytdi |
| Ketgan vaqti, ishxonada bo'lgan jami vaqt | Oxirgi ko'ringan vaqt; ko'ringan intervallar yig'indisi |
| **Telefonda gaplashgan** (telefon quloq/bosh yonida) | YOLOv8 telefonni topadi, joylashuvi bosh sohasida bo'lsa — qo'ng'iroq |
| **Telefon ishlatgan** (qo'lda, ekranga qarab) | Telefon tana sohasida |
| **Gaplashib turgan** (telefonsiz) | MediaPipe FaceLandmarker: jag' ochilishi (jawOpen) ning 2.5 soniyalik o'zgarishi |
| Kim ekani | **ArcFace (InsightFace buffalo_l)** yuz tanish, ko'p kadrli ovoz berish; ishonch yetmasa — "Noma'lum" |
| **Jins** va taxminiy yosh | InsightFace genderage; xodim jinsi yuz rasmidan avtomatik aniqlanadi va tanishda qo'shimcha filtr bo'ladi |
| Isbot | Telefon/gaplashuv boshlanganda kadr saqlanadi, hisobotda ko'rinadi |

## Ishga tushirish
```bash
cd vision-monitor
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Linux serverda: sudo apt install libegl1 libgles2 libgl1
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Brauzerda `http://localhost:8000` → ro'yxatdan o'ting → **Bosh sahifa → "Demo ma'lumot yuklash"** bilan tizimni darhol sinab ko'ring.
Docker: `docker build -t visionmonitor . && docker run -p 8000:8000 -v vm_data:/data visionmonitor`

Birinchi ishga tushishda AI modellari (YOLO ~6 MB, FaceLandmarker ~4 MB, InsightFace buffalo_l ~280 MB) avtomatik yuklab olinadi (internet kerak), `data/models` ga saqlanadi.

## Haqiqiy kamerani ulash
**Kameralar → + Kamera qo'shish** — usullar quyida ("Kameraga qanday ulanadi").

Xodimlar → **📷 Yuz rasmi**: har xodimning 3–5 ta aniq rasmini yuklang.


## Shaxsni aniqlash: "xato qilgandan ko'ra bilmayman" tamoyili
Hech bir tizim 100% xatosiz emas, shuning uchun tizim **xato ism qo'ymaslikka** moslashtirilgan:
1. Bitta kadrga ishonilmaydi: har bir odam uchun so'nggi 12 ta yuz kuzatuvi "ovoz" beradi; xodim kamida 3 ta mos ovoz, ovozlarning 60%+ i va o'rtacha o'xshashlik ≥ 0.45 bo'lgandagina tasdiqlanadi.
2. 1-nomzod 2-nomzoddan kamida 0.08 yuqori bo'lishi shart (o'xshash odamlar adashmasligi uchun).
3. Jins mos kelmasa nomzod rad etiladi. Bir kadrda bitta xodim ikki odamga berilmaydi.
4. Xodim rasmi yuklanganda sifat tekshiriladi (yuz o'lchami, aniqligi, bitta odam), boshqa xodimga o'xshash yoki oldingi rasmdagi odamga o'xshamaydigan rasm rad etiladi.
5. Ishonchi yetmaganlar **Tanilmaganlar** bo'limiga tushadi: siz "bu falonchi" deb tasdiqlaysiz — tizim shu yuzni o'rganadi va o'tgan hisobotlar ham to'g'rilanadi.
6. Kiyim rangi bo'yicha kuzatuv: odam ustun/to'siq ortida 12 soniyagacha yo'qolib qaytsa, xuddi shu shaxs sifatida davom etadi.
Sozlash: `VM_ID_THRESHOLD` (qat'iylik), `VM_ID_MARGIN`. Qat'iyroq = kamroq xato, lekin ko'proq "Noma'lum".
Jins yuz orqali taxmin qilinadi (taxminan 95–97% aniq, yuz ko'rinmasa aniqlanmaydi); ko'p kadr bo'yicha ovoz berish bilan barqarorlashtirilgan va xodim kartasida qo'lda to'g'rilash mumkin.

## Kameraga qanday ulanadi (4 usul)
Muhim: **sayt kameraga ulanishi uchun ular bir-birini "ko'ra" olishi kerak.** Sayt internetdagi serverda, kamera esa ofis ichida bo'lsa, server kameraga to'g'ridan-to'g'ri ulana olmaydi (kamera orqasida router/NAT bor). Shuning uchun:

| Holat | Usul |
|---|---|
| Tizim **ofis ichidagi** kompyuter/serverda ishlaydi | **Kameralar → 🔍 Tarmoqdan qidirish** (ONVIF + port skaneri) yoki **📷 IP kamera** (IP + login/parol, "⚡ Avtomatik ulash" to'g'ri RTSP yo'lini o'zi topadi) |
| Tizim **internetda** (bulutda), kamera ofisda | **🖥 Ofis agenti**: ofisdagi kompyuterda `agent/camera_agent.py` kameradan kadr olib saytga HTTPS orqali yuboradi. Faqat chiquvchi ulanish — router portlarini ochish shart emas |
| Kamera yo'q, sinash yoki vaqtincha | **📱 Telefon/brauzer kamerasi**: maxsus havolani telefonda ochasiz (HTTPS kerak) |
| Kamera ochiq IP/DDNS bilan internetga ochilgan | **✍️ Manzil (URL)** — `rtsp://...` (xavfsizlik uchun tavsiya etilmaydi, agent yaxshiroq) |

Kamerada oldindan: RTSP/ONVIF yoqilgan, foydalanuvchi (login/parol) yaratilgan bo'lishi kerak (Hikvision/Dahua ilovasida yoki veb-panelda). Qo'llab-quvvatlanadigan markalar uchun yo'llar: Hikvision, Dahua/Imou, TP-Link Tapo, Reolink, Uniview, Axis, EZVIZ, Foscam, Xiaomi va umumiy yo'llar.

## Kamera o'rnatish bo'yicha tavsiyalar (aniqlik shunga bog'liq)
- Kamera xodimlarni **old tomondan, 2–5 metrdan, bosh balandligidan sal yuqoridan** ko'rsin; yuz yaxshi yoritilgan bo'lsin.
- Kirish eshigiga alohida kamera qo'ying ("Kirish/chiqish eshigi") — kelish/ketish vaqti aniq bo'ladi.
- Xodim hech bir kamerada ko'rinmasa "tashqarida" hisoblanadi, shuning uchun **ishxonaning hamma ish joylari kameralar bilan qoplangan** bo'lishi kerak, aks holda kameradan chetdagi joy "chiqib ketish" deb yozilishi mumkin.
- Quvvat: yolov8n bilan oddiy CPU da ~3–4 kamera × 4 kadr/s. Ko'proq uchun GPU (`VM_DEVICE=cuda:0`) va `VM_YOLO_MODEL=yolov8s.pt`.

## Sozlamalar (`.env.example`ga qarang)
Ish vaqti, chiqish deb hisoblash soniyasi (`grace`), hodisaning minimal davomiyligi, gaplashuv sezgirligi — kabinetdagi **Sozlamalar** bo'limida.

## Xavfsizlik
- Parollar PBKDF2-SHA256 bilan saqlanadi, kirishda xato urinishlar cheklanadi, kabinetlar bir-biridan ajratilgan.
- Internetga chiqarsangiz **HTTPS** (Caddy/nginx reverse proxy) ishlating. Kamera oqimi `<img>` orqali ko'rsatilgani uchun token URL da yuboriladi — HTTPS bunda majburiy.
- RTSP parollari bazada saqlanadi (ochiq matnda) — `data/` papkasini himoyalang.

## Cheklovlar (halol ma'lumot)
- Hech qanday AI 100% aniq emas. Telefon "qo'lda/quloqda" ekani qutilarning joylashuvidan baholanadi; telefon qo'l bilan to'sib qolsa yoki juda kichik ko'rinsa aniqlanmasligi mumkin. Gaplashuv — og'iz harakatiga qarab (yuz kameraga ko'rinib turishi kerak). Natijani hisobotdagi **rasm isboti** bilan tekshirib turing, va sezgirlikni sozlang.
- Muhim qarorlar (jarima, ishdan bo'shatish) uchun faqat avtomatik hisobotga tayanmang.
- **Huquqiy:** xodimlarni video kuzatish va yuz ma'lumotlarini (biometrik) qayta ishlash uchun xodimlardan yozma rozilik olish va kameralar haqida ogohlantirish kerak (O'zbekiston "Shaxsga doir ma'lumotlar to'g'risida"gi qonuni). Hujjatlashtirilgan rozilikni oling.

## Qanday sinovdan o'tgan
Dasturchi muhitida tekshirildi: ro'yxatdan o'tish/kirish, demo ma'lumot, kunlik/davr hisobotlari, CSV, jonli MJPEG oqim, YOLO bilan odam aniqlash va kuzatish, video manbadan to'liq konveyer, MediaPipe jag' ochilishi, **ArcFace**: bir odam turli kadrlarda 0.95–0.99 o'xshashlik bilan tanildi, begona yuzlar ≈0 (tanilmadi), jins aniqlandi, xodim rasmi sifat/o'xshashlik tekshiruvi, tanilmaganlar navbati, push-ingest (agent/telefon yo'li) kalit bilan, SSRF himoyasi, RTSP yo'l topish mantig'i (soxta RTSP server bilan: 401/404 farqi, maxsus belgili parol).
**Tekshirilmagan** (bu muhitda kamera/tarmoq yo'q): haqiqiy IP kameralar bilan ishlash, ONVIF multicast qidiruvi, brauzer orqali telefon kamerasi, haqiqiy ofis sharoitida yuz tanish aniqligi (yoritish, burchak, niqob/ko'zoynak). Birinchi o'rnatishda bir necha xodim bilan sinab, kerak bo'lsa `VM_ID_THRESHOLD` ni sozlang.

## Tuzilma
`app/main.py` (API) · `app/discovery.py` (kamera qidirish/avto-ulash) · `agent/` (ofis agenti) · `app/engine.py` (kamera ishchilari) · `app/ai/` (YOLO, yuz, kuzatuvchi, holat aniqlash) · `app/activity.py` (intervallar yozuvi) · `app/reports.py` (hisobotlar) · `web/` (interfeys)
