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
| Kim ekani | OpenCV YuNet + SFace yuz tanish (xodim rasmi bilan); tanilmasa — "Noma'lum" |
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

Birinchi ishga tushishda AI modellari (YOLO ~6 MB, FaceLandmarker ~4 MB, SFace ~40 MB) avtomatik yuklab olinadi (internet kerak), `data/models` ga saqlanadi.

## Haqiqiy kamerani ulash
**Kameralar → + Kamera qo'shish**:
- IP kamera: `rtsp://login:parol@192.168.1.64:554/stream1` (Hikvision: `/Streaming/Channels/101`, Dahua: `/cam/realmonitor?channel=1&subtype=1`, Tapo: `/stream1`)
- Serverga ulangan USB kamera: `0`
- "Ulanishni tekshirish" tugmasi manzilni tekshiradi. Server kameraga tarmoq orqali yetib borishi shart.

Xodimlar → **📷 Yuz rasmi**: har xodimning 3–5 ta aniq rasmini yuklang.

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
Dasturchi muhitida tekshirildi: ro'yxatdan o'tish/kirish, demo ma'lumot, kunlik/davr hisobotlari, CSV, jonli MJPEG oqim, YOLO bilan odam aniqlash va kuzatish, video manbadan to'liq konveyer, MediaPipe jag' ochilishi. **Tekshirilmagan** (bu muhitda model yuklab bo'lmadi / kamera yo'q): SFace yuz tanish va haqiqiy RTSP kamera — ular birinchi marta sizning serveringizda sinab ko'rilishi kerak.

## Tuzilma
`app/main.py` (API) · `app/engine.py` (kamera ishchilari) · `app/ai/` (YOLO, yuz, kuzatuvchi, holat aniqlash) · `app/activity.py` (intervallar yozuvi) · `app/reports.py` (hisobotlar) · `web/` (interfeys)
