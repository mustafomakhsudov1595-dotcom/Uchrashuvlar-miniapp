# Sladus Ror: kinematik reklama (Higgsfield uchun to'liq paket, v2)

Etalon: "hurries Dates Almond Milk Chocolate" reklamasi (10.05 s, 9:16, 24 fps).
Sujet, sahna tartibi, kamera, kesishlar, rang va ritm o'zgarmaydi. Faqat mahsulot almashadi.
Kesish vaqtlari etalondan kadrma-kadr o'lchab chiqarilgan.

---

## 0. TAYYORGARLIK

### 0.1 Teglar
| Teg | Nima | Fayl (tayyorlab qo'yilgan) |
|---|---|---|
| `@image1` | **Sladus Ror konfeti**: ASOSIY MAHSULOT (banka o'rniga) | `out/refs/ref_image1_candy_single.png` (bitta konfet, shaffof fon) |
| `@image2` | **Bodom**: ingredient (xurmo o'rniga) | `out/refs/ref_image2_almond_cutout.png` yoki `ref_image2_almond_cream.jpg` |

Agar Higgsfield'ga rasmlarni teskari tartibda yuklasangiz, promptlardagi `@image1` va `@image2` ni o'zaro almashtiring.

### 0.2 Referens rasmlar haqida (muhim)
- Siz bergan konfet rasmi juda kichik edi (295×177 px, ikkita konfet, oq fon). Men uni sun'iy intellekt bilan 4x kattalashtirdim, fonini olib tashladim va bitta konfetni ajratdim (`ref_image1_candy_single.png`, 1724×716). Juftlik varianti: `ref_image1_candy_pair.png`.
- Yozuv "Sladus™ Ror" o'qiladi, lekin bu rasmni sun'iy intellekt kattalashtirgan. Qanotlardagi mayda "Sladus" yozuvlari taxminiy. **Agar konfetning yuqori sifatli (kamida 1500 px) fotosi bo'lsa, shuni ishlating**, natija ancha yaxshi bo'ladi.
- Bodom rasmi telefon skrinshoti edi (tugmalar va qora chiziqlar bor). Tozalangan variant: shaffof (`ref_image2_almond_cutout.png`) va krem fonli (`ref_image2_almond_cream.jpg`).
- Konfet o'ramining orqa va yon tomonlari rasmda yo'q. Aylanadigan sahnalarda (S3, S5, S6, S9) model ularni o'zi o'ylab topadi. Buni kamaytirish uchun 0.4-bo'limdagi tavsiyaga qarang.

### 0.3 MAHSULOT QULFI (PRODUCT LOCK): har bir promptga shu jumlani qo'shing
```
a small oval candy in satin champagne-gold foil with two rigid crinkled twist ends; the oval face is printed in dark maroon with "Sladus" (bold serif, small TM mark) above "Ror" (italic script); the right twist end is gold foil printed with repeating maroon "Sladus"; the left twist end is dark maroon-red printed with gold "Sladus" and one small green-and-white round emblem; wrapper closed, clean and dry
```
**BODOM QULFI:**
```
a whole natural almond with matte wrinkled light-brown skin, exactly as in @image2
```

### 0.4 Aylanish uchun tavsiya
Rasm modeliga toza konfet rasmidan (`@image1`) old, orqa va yon ko'rinishlarni (turnaround) yaratib, 2-3 ta qo'shimcha referens sifatida yuklang. Aylanadigan sahnalarda promptga qo'shing: "the wrapper stays rigid, the two twist ends keep their own colors, no extra wings".

### 0.5 Ikki rejim (Higgsfield modeliga qarab)
- **A rejim (ko'p referensli model):** `@image1` va `@image2` ni yuklang. Promptdagi `@teg` lar qoladi.
- **B rejim (faqat start frame):** start frame = tasdiqlangan kalit kadr (K1-K10, 4-bo'lim). Promptdan `@image1`/`@image2` so'zlarini olib tashlab, "the candy" / "the almond" deb yozing va 0.3-dagi QULF jumlasini qo'shing.

### 0.6 Nima almashdi (faqat shular)
1. **Metall banka → Sladus Ror konfeti** (`@image1`). Banka tik turgan joylarda konfet gorizontal yoki gorizontaldan ≤30° qiyshiq yotadi (yozuv o'qilishi uchun, 0.7-ga qarang).
2. **Xurmo → bodom** (`@image2`): S1 (hook), S3 (oldingi plandagi xira xurmolar), S8 (ikkiga bo'lingan xurmo o'rniga katta bodom).
3. **Yozuvlar:** "hurries" va "DATES ALMOND MILK CHOCOLATE 700 g" o'rniga faqat o'ramdagi "Sladus™ Ror". Qo'shimcha reklama da'vosi (claim), gramm yoki yangi yozuv yo'q.
4. **S10 (yakuniy kadr):** etalondagi bitta tik banka o'rniga bitta yotgan konfet.
5. **Palma barglari saqlanadi** (S7 da etalondagi sahna elementi). Xohlasangiz, ularni olib tashlash mumkin.

Konfet ichida nima borligi (yong'oq, krem) rasmdan ma'lum emas, shuning uchun o'ram doim yopiq ko'rsatiladi.

### 0.7 Poza xaritasi (banka → konfet)
- S3 oxiri, S5 o'rtasi, S7, S10: konfetning uzun o'qi gorizontal yoki ≤30° qiyshiq, "Sladus Ror" yuzi kameraga qaragan.
- S6 boshi (5.79-5.95 s): konfet kameraga yaqin, deyarli gorizontal, bir uchi lensga qarab.
- S6 davomi: diagonal.

---

## 1. KESISH XARITASI (etalondan o'lchangan)

**Qattiq kesishlar (hard cut), 1 kadrda:** 1.50 / 2.50 / 4.83 / 5.79 / 6.42 / 6.83 / 7.83 / 8.83 s.
**Yagona uzluksiz o'tish:** 4.17-4.21 s, 2 kadrlik tez zoom (S3 → S4).
**Dissolve, crossfade va morph YO'Q.** Har kesish tovush zarbasiga to'g'ri keladi.

| Sahna | Oyna (s) | Kesish oynasi (uzunligi) |
|---|---|---|
| S1 | 0.00-1.50 | 1.50 |
| S2 | 1.50-2.50 | 1.00 |
| S3 | 2.50-4.17 | 1.67 |
| S4 | 4.21-4.83 | 0.62 (oldida 4.17-4.21 zoom) |
| S5 | 4.83-5.79 | 0.96 |
| S6 | 5.79-6.42 | 0.63 |
| S7 | 6.42-6.83 | 0.41 |
| S8 | 6.83-7.83 | 1.00 |
| S9 | 7.83-8.83 | 1.00 |
| S10 | 8.83-10.05 | 1.22 |

**Davomiylik haqida:** Higgsfield modellari odatda 3-5 soniyalik klip beradi, davomiylik interfeysdan tanlanadi (promptdagi "seconds" so'zi uni boshqarmaydi). Har sahnani eng qisqa mumkin davomiylikda generatsiya qiling, so'ng montajda yuqoridagi oynani kesib oling. Rasm→video klip avval deyarli qimirlamaydi, shuning uchun tez sahnalarda (S4, S6, S7) klipning 0.3-1.0 s oralig'ini oling va promptga "motion already at full speed from the first frame" qo'shing. Model end-frame bersa, kalit kadrni END frame qilib qo'ying.

---

## 2. MASTER PROMPT (faqat ko'p sahnali modellar uchun)

Faqat bir klipda bir nechta sahnani tushunadigan modellarda ishlating. Boshqa modellarda 5-bo'limdagi sahnama-sahna usul ishonchliroq. Ba'zi modellarda maydon 2,500 belgidan oshmaydi, shuning uchun bu versiya qisqa.

```
Cinematic luxury product commercial, vertical 9:16, premium photoreal CGI, anamorphic macro lenses, shallow depth of field, warm golden backlight, glossy highlights. Palette: caramel gold, amber, molten milk chocolate, deep dark-chocolate black, plus the candy's own maroon and gold. Only product and ingredients in frame, no text overlays.
PRODUCT (@image1, exactly as in the image): small oval candy in satin champagne-gold foil, two rigid crinkled twist ends; oval face printed dark maroon "Sladus" (bold serif, small TM) above "Ror" (italic script); right twist end gold with maroon "Sladus"; left twist end dark maroon with gold "Sladus" and a small green-and-white emblem; INGREDIENT (@image2): whole natural almond, matte wrinkled light-brown skin.
Ten shots joined only by hard cuts (1.5, 2.5, 4.83, 5.79, 6.42, 6.83, 7.83, 8.83 s) plus one 2-frame whip-zoom (4.17-4.21 s). No dissolves.
1 (0-1.5): extreme macro, 4-5 almonds at the centre of a cocoa-powder and chocolate-chunk explosion on a diagonal glossy chocolate ribbon; camera rushes forward, one huge almond fills the lower right; last 0.2 s giant blurred ribbon with gold bokeh. No candy.
2 (1.5-2.5): weightless almonds over caramel-gold gradient, huge blurred ones in front, sharp midground; camera accelerates, motion blur grows.
3 (2.5-4.17): in a chocolate-caramel vortex with gold glitter spiral the candy, tilted 60 degrees, rolls near-horizontal; camera pulls back wide: candy over a flat chocolate pool, ring of gold dust, few almonds at the bottom edge.
4 (4.21-4.83): whip-zoom into extreme macro of the printed "Sladus Ror" on gold foil, tiny droplets, slow rotation.
5 (4.83-5.79): thick chocolate ribbon with fine granules; candy tumbles small, rushes toward the lens, frontal among chocolate beads, tilts close.
6 (5.79-6.42): candy very close, near-horizontal, twist end toward lens, amber turning deep brown, drifting among ribbons.
7 (6.42-6.83): candy before sharp green palm fronds, strands of gold glitter beads, dark vignette.
8 (6.83-7.83): slow-motion macro, one large tilted almond half sunk in molten chocolate, crown splash, black veined marble, chocolate slabs, gold bokeh, push-in with roll.
9 (7.83-8.83): empty wooden planks; candy drops in from top-right with gold dust; camera rolls into a gold-dust whirlpool; ends mid-spin.
10 (8.83-10.05): one candy lying on black marble with glowing gold veins, mirror reflection, light flare at its base, gold smoke behind, slow push-in, calm.
```

---

## 3. NEGATIVE PROMPT

Faqat model maydoni bo'lsa kiriting. Maydon yo'q modellarda (Veo/Seedance/Sora turlari) uni qo'shmang, 0.3 dagi QULF jumlasi va "wrapper stays clean" kabi ijobiy ko'rsatmalar yetarli.

```
misspelled text, extra letters, garbled lettering, extra logos, watermark, subtitles, captions, UI elements, people, hands, faces, redesigned candy, changed wrapper colors, silver foil, both twist ends the same color, extra twist ends, open or unwrapped candy, melted or deformed wrapper, chocolate covering the lettering, product morphing, hurries, 700 g, cylindrical tin, cans, jars, bottles, boxes, spoons, dates, walnut, hazelnut, pistachio, peeled or sliced almonds, dissolve, crossfade, morph transition, cold blue lighting, neon, flat lighting, blown-out highlights, low resolution, blurry lettering, jitter, flicker, camera shake, cartoon look, plastic look, banding, artifacts
```

---

## 4. KALIT KADRLAR (har sahnaning start framei)

Har kalit kadr promptiga shu **old qo'shimchani** qo'shing:
```
Use @image1 as the exact product reference (do not redesign it, keep wrapper colors and lettering) and @image2 as the exact almond reference. 9:16, photoreal, no UI, no black bars. PRODUCT LOCK: [0.3 dagi jumla]
```
Mos rasm modelini tanlang (bir nechta referensni qabul qiladigan: Nano Banana Pro, Seedream va shu kabi). Tartib: **avval K4 va K10** (yozuv sahnalari), keyin K3, qolganlarini oxirida. **Yozuvi 100% kattalikda o'qilmaydigan kadrni jonlantirmang.** Matn sahnalar uchun 6-8 variantdan eng yaxshisini tanlang.

| # | Kalit kadr (qisqa) |
|---|---|
| K1 | Violent cocoa-powder and chocolate-chunk explosion, four or five natural almonds (@image2) at the centre on a diagonal glossy chocolate ribbon, amber backlight, dark chocolate background. No candy. |
| K2 | Many natural almonds (@image2) floating at different depths over a warm caramel-gold gradient, huge blurred almonds in front, sharp midground, soft shadows on a caramel floor |
| K3 | Candy (@image1) tilted about 60 degrees inside a swirling chocolate-caramel vortex with a gold glitter spiral, a few blurred almonds in the foreground corners |
| K4 | Extreme macro of the printed "Sladus" over "Ror" on the satin gold foil face of the candy (@image1), slight tilt, crinkled foil pinch at the top edge, a few tiny water droplets near the edges only |
| K5 | Candy (@image1) small and tumbling in a thick glossy chocolate ribbon with a stream of fine granules, round chocolate beads in the air |
| K6 | Candy (@image1) very close to camera, nearly horizontal, one twist end toward the lens, bright amber gradient, dark chocolate ribbons beneath |
| K7 | Candy (@image1) before sharp green palm fronds, two strands of gold glitter beads on the right, dark vignette corners |
| K8 | One large almond (@image2) half sunk in molten chocolate with a crown splash on black veined marble, big dark-chocolate slabs in the blurred foreground, gold bokeh |
| K9 | Rough warm-brown wooden planks, the candy (@image1) entering from the top-right corner with a spray of gold dust |
| K10 | One candy (@image1) lying on glossy black marble with thin glowing gold veins, mirror reflection, soft golden light flare at its base, gold smoke behind |

---

## 5. RASKADROVKA (sahnama-sahna prompt)

**Har sahna promptining oxiriga bir xil uslub qo'shimchasi qo'shing** (ranglar sahnadan sahnaga siljimasligi uchun):
```
photoreal premium CGI product film, anamorphic macro, shallow depth of field, warm golden backlight, caramel-gold and deep chocolate palette, glossy highlights, no text overlays
```
Konfet bor sahnalarda yana qo'shing: "wrapper stays rigid and clean, the two twist ends keep their own colors, no extra wings".

### S1 · 0.00-1.50 s · HOOK (mahsulot yo'q)
Etalonda bu sahnada xurmo, shokolad va kakao changi bor, mahsulot YO'Q. Mahsulot faqat 2.5 s dagi zarbada birinchi marta chiqadi, bu reklamaning asosiy lahzasi.
- **Kamera:** to'g'ri oldinga tez harakat, sal roll. Oxirgi 0.2 s: ulkan xira shokolad lentasi va oltin bokeh kadrni yutadi.
- **Tovush:** boshida past zarba, so'ng shokolad shitirlashi.
```
Extreme macro, four or five whole natural almonds from @image2 sit as a small cluster at the centre of a violent explosion of cocoa powder and chocolate chunks, with a glossy molten milk-chocolate ribbon sweeping diagonally from top-left to bottom-right; the camera rushes straight forward so the almonds tumble toward the lens until one huge almond fills the lower right; in the last 0.2 seconds a giant out-of-focus chocolate ribbon with a gold bokeh flare swallows the frame. No candy, no packaging, no text anywhere in this shot. Slight camera roll, warm amber backlight, deep dark-chocolate shadows, motion already at full speed from the first frame.
```

### S2 · 1.50-2.50 s · Bodomlar havoda (hard cut bilan tugaydi)
- **Nima ko'rinadi:** havoda suzayotgan bodomlar, oldinda ulkan xira, o'rtada o'tkir. Oxirida kamera tezlashadi, motion blur o'sadi, kadr keskin uziladi (girdob YO'Q).
- **Tovush:** 1.8-2.45 s deyarli jimlik (eng past 2.1-2.2).
```
Weightless whole natural almonds from @image2 floating at different depths over a warm caramel-gold gradient background, huge out-of-focus almonds in the foreground, sharp wrinkled almonds in the midground, soft shadows on a caramel floor, almonds slowly tilting and rotating in the air while the camera drifts forward with a slight roll and accelerates into growing motion blur by the end of the shot. The shot ends abruptly (hard cut, no vortex in this shot).
```

### S3 · 2.50-4.17 s · MAHSULOT BIRINCHI MARTA (girdob)
- **Nima ko'rinadi:** 2.5 s da konfet allaqachon kadrda, ~60° qiyshiq, girdob aylanayotganda tikka yotadi (qo'shilgan oltin zarra spirali). 3.5 s dan kamera keng planga tortiladi: konfet tekis qora-shokolad hovuzi ustida, tubida oltin chang halqasi, chetda bir nechta bodom. Oxirida konfet aylanib orqa tomonini ko'rsatadi.
- **Tovush:** 2.5 s da eng kuchli zarba.
```
Cut straight into a swirling vortex of liquid milk chocolate and caramel with a continuous gold glitter spiral; the candy from @image1 is already in frame, tilted about 60 degrees, and rolls to a near-horizontal pose as the whole vortex rotates around it. Then the camera pulls back to a wide shot: the candy hovers over a flat dark chocolate pool with a flat ring of gold dust around its base, a few blurred almonds from @image2 in the foreground corners and bottom edge, the candy slowly turning to show its back side in the last moments. Its stiff crinkled foil twist ends stay rigid and glint. Keep the candy exactly as in @image1. The candy fills about half of the frame width.
```

### S4 · 4.21-4.83 s · MAKRO: YOZUV (oldidan 4.17-4.21 s zoom)
- **Nima ko'rinadi:** S3 dan 2 kadrlik tez zoom bilan konfet yuzidagi "Sladus™ Ror" yozuviga ulkan yaqinlashuv, tilt va sekin aylanish, tomchilar.
- **Tovush:** 4.2 s da zarba, 4.8 s da zarba.
- **Eng ishonchli yo'l:** bu sahnani tasdiqlangan K4 rasmidan **montajda** yasang (scale 100→125%, 3° tilt, motion blur, ustiga generatsiya qilingan oltin chang qatlamini Screen rejimida). Zoom (S3 → S4) ham montajda: S3 ning oxirgi kadridan K4 ga 2 kadrda scale + blur. AI yozuvni buzmaydi, chunki yozuv rasmning o'zida.
- **Video prompt (agar baribir video kerak bo'lsa):**
```
Extreme macro of the glossy satin gold foil face of the candy from @image1: the printed dark-maroon "Sladus" (bold serif, small TM) over "Ror" (italic script) fills the frame, tilted slightly and rotating slowly; the crinkled foil pinch where the oval meets a twist end curves across the top edge; a few tiny water droplets only near the edges and none on the letters; candy nearly static, only the camera moves, slow push-in; blurred almond from @image2 far behind at the bottom edge; shallow depth of field, warm backlight.
```

### S5 · 4.83-5.79 s · Shokolad oqimi (hard cut bilan tugaydi)
Etalonda mahsulot kichik bo'lib boshlanadi va kameraga qarab uchib keladi (push-in), keyin yaqinda qiyshayadi. Bodom YO'Q.
- **Tovush:** 4.8 s da zarba, 5.8 s da zarba.
```
A thick glossy milk-chocolate ribbon sweeps diagonally from bottom-left to top-right carrying a dense stream of fine chocolate granules. The candy from @image1 starts small in the middle of the stream, tumbling, and rushes toward the camera, growing to fill most of the frame; around the middle of the shot it is frontal with the "Sladus Ror" face toward the camera among round chocolate beads in the foreground and background, then it tilts and looms very close in the last moments. Beads and granules fly around the candy but never stick to it; the wrapper stays clean and glossy. No almonds in this shot. High-speed physics.
```

### S6 · 5.79-6.42 s · Diagonal suzish (hard cut bilan tugaydi)
```
The candy from @image1 starts very close to the camera, lying nearly horizontal with one twist end pointing at the lens, against a bright amber gradient with dark chocolate ribbons looping beneath it; within the first 0.15 seconds the background darkens to deep brown while the candy drifts and slowly tilts into a diagonal pose among the sweeping glossy ribbons, gold rim light on the foil, camera tracking quickly along the motion. Motion already at full speed from the first frame.
```

### S7 · 6.42-6.83 s · Palma barglari (hard cut bilan tugaydi)
```
The candy from @image1 floating with its long axis about 20 degrees off horizontal, face to the camera, in front of sharp green palm fronds arching in from the top-left, top-right and behind it, two hanging strands of gold glitter beads on the right, a dark chocolate ribbon sweeping diagonally across the lower left, dark vignette in the corners, warm amber background, shallow depth of field, calm and elegant.
```

### S8 · 6.83-7.83 s · SEKINLATILGAN MAKRO (hard cut bilan tugaydi)
Etalonda ikkiga bo'lingan xurmo ichida bodom. Bu yerda katta bodom shokolad tojiga botgan.
- **Tovush:** 6.8 s da zarba, 7.3-7.8 s past va yumshoq.
```
Slow-motion extreme macro: ONE large natural almond from @image2 fills about half of the frame, tilted about 15 degrees, sunk halfway into glossy molten milk chocolate with a crown-shaped splash around its base, on glossy black veined marble; two or three large square dark-chocolate slabs tumble in the blurred foreground (bottom-right and top-right), small chocolate crumbs hang in the air, warm golden bokeh background, a thin glowing golden sliver at the upper right; the camera pushes in slowly with a slight roll so the almond grows and tilts. No date, no candy, no text.
```

### S9 · 7.83-8.83 s · Yog'och va oltin chang girdobi (hard cut bilan tugaydi)
- **Tovush:** 7.9 s da zarba, 8.3-8.8 s girdob shitirlashi.
```
Rough warm-brown wooden planks, empty at first. The candy from @image1 enters from the top-right corner and drops diagonally onto the wood with a spray of gold dust; then the camera rolls and spins around it, the wood dissolving into a fast golden dust whirlpool with heavy rotational motion blur and streaking gold particles; the candy stays near the centre, still tilted and spinning, and the shot ends mid-spin (hard cut, no calm landing). Warm golden light.
```

### S10 · 8.83-10.05 s · YAKUNIY HERO KADR
Etalonda bitta tik banka, qora marmar (yoriqlari oltin yonadi), tagida yorug'lik, orqada oltin tutun. Bu yerda bitta yotgan konfet (zaxira quyida).
- **Tovush:** 8.8-9.2 s sekin puls, 9.3-10.0 s asta so'nish (9.9 s da deyarli jim).
```
Final hero shot: ONE gold-foil twist-wrapped candy from @image1 lying on its side on glossy black marble, long axis horizontal, turned about 20 degrees toward the camera so the "Sladus Ror" face reads clearly, about 55 percent of the frame width, centred in the lower-middle of the frame; perfect mirror reflection beneath it, thin glowing gold veins in the black marble, a soft golden light flare at its base, a drifting cloud of gold smoke and gold dust behind and to the right, deep black space above; very slow push-in, perfectly stable, "Sladus Ror" lettering clean and legible; ends on a quiet clear frame.
```
**Zaxira:** agar bitta konfet kichik ko'rinsa, rasmdagi juftlikni (ikkita konfet) ishlating va "exactly two candies" deb yozing, negative promptdan esa kerak bo'lsa "duplicate" so'zlarini olib tashlang. Bu qasddan o'zgartirish bo'ladi.

---

## 6. TOVUSH (alohida)

Hamma klipni **tovushsiz (muted)** generatsiya qiling. Bitta 10 soniyalik tovush izini alohida yarating (ElevenLabs SFX/Music, Suno yoki stok) va montajga qo'ying. Taxminan 70 BPM, -14 LUFS, so'z va qo'shiq yo'q (musiqa va effektlar bor).

| Vaqt (s) | Tovush |
|---|---|
| 0.0-1.5 | Past zarba, shokolad shitirlashi (ixtiyoriy, etalonda to'liq tasdiqlanmagan) |
| 1.8-2.45 | **Deyarli jimlik** (eng past 2.1-2.2) |
| 2.5 | **Eng kuchli zarba** (mahsulot chiqadi) + oltin jiringlash |
| 3.7-4.0 | Pasayish (makro oldidan) |
| 4.2 va 4.8 | Zarbalar |
| 5.8 | Zarba |
| 6.8 | Zarba |
| 7.3-7.8 | Past, yumshoq (sekin makro) |
| 7.9 | Zarba (yog'ochga tushish) |
| 8.3-8.8 | Girdob shitirlashi, past zarba, oltin chang |
| 8.8-9.2 | Sekin puls (~70 BPM) |
| 9.3-10.0 | Asta so'nish (9.9 s da deyarli jim) |

---

## 7. ISH TARTIBI (qadamlar)

0. Referenslarni tayyorlang (`out/refs/` dagi fayllar yoki sizning yaxshi fotongiz).
1. K4 va K10 ni yarating, yozuvni 100% da tekshiring.
2. Qolgan kalit kadrlar (K3, K1, K2, K5-K9).
3. Har sahnani modelning eng qisqa davomiyligida, past sifatli sinov rejimida generatsiya qiling, yaxshilarini yuqori sifatda qayta oling. Matnli sahnalar (S4, S10) uchun 6-8 urinish, qolganlariga 3-4.
4. Klipni 1-bo'limdagi oynaga kesing.
5. Hammasini **qattiq kesish** bilan yig'ing. S3 → S4 oralig'ida 2 kadrlik zoom qo'ying. Hech qanday dissolve qo'shmang.
6. Bitta tovush izi qo'ying (6-bo'lim).
7. Yagona rang grading (oltin-karamel), 24 fps ga keltiring, upscale va yengil plyonka donadorligi qo'shing.
