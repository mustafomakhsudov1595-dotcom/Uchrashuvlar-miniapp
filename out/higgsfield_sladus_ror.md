# Sladus Ror — kinematik reklama (Higgsfield uchun to'liq paket)

Etalon: "hurries Dates Almond Milk Chocolate" reklamasi (10 s, 9:16, 24 fps).
Sujet, sahna tartibi, kamera, o'tishlar, rang va ritm **o'zgarmaydi**. Faqat mahsulot almashadi.

## 0. Teglar (Higgsfield'ga yuklash tartibi)

| Teg | Rasm | Vazifasi |
|---|---|---|
| `@image1` | Sladus Ror konfeti (oltin folga o'ramli, jigarrang burama uchlari) | ASOSIY MAHSULOT (idish o'rniga) |
| `@image2` | Bodom | Ingredient (xurmo o'rniga bodom) |

Agar Higgsfield'da rasmlarni teskari tartibda yuklagan bo'lsangiz, promptdagi `@image1` va `@image2` ni o'zaro almashtiring.

### Nima almashdi (faqat shular)
1. **Idish → Sladus Ror konfeti** (`@image1`). Idish aylanib uchgan joylarda konfet o'ramining uchlari (burama qanotlar) ham harakatlanadi.
2. **Xurmolar → bodomlar** (`@image2`): 1-sahna (hook) va 8-sahna (sekinlatilgan makro).
3. **Palma barglari** (idish dizayniga xos edi) → xira oltin folga bargchalari (7-sahna).
4. **Yozuvlar:** "hurries" va "DATES ALMOND MILK CHOCOLATE 700 g" o'rniga faqat o'ramdagi "Sladus Ror" yozuvi. Qo'shimcha da'vo, gramm yoki yangi yozuv YO'Q.

Konfet ichida nima borligi (nuqta, bodom, krem) rasmdan ma'lum emas, shuning uchun konfet ichi ko'rsatilmaydi. O'ram doim yopiq.

---

## 1. MASTER PROMPT (butun 10 soniya, bitta generatsiya)

> Eslatma: 10 soniyalik ko'p sahnali promptni bitta generatsiyada berish mumkin, lekin mahsulot izchilligi uchun 2-bo'limdagi sahnama-sahna usul ancha ishonchli.

```
Cinematic luxury product commercial, vertical 9:16, 24 fps, 10 seconds, hyper-realistic CGI product-film look, anamorphic macro lenses, shallow depth of field, ultra-sharp product, glossy liquid-chocolate simulation, warm golden backlight. Palette strictly: caramel gold, amber, molten milk chocolate, deep dark-chocolate black, metallic gold highlights. No people, no hands.

PRODUCT (use @image1 exactly as in the reference, same shape, same gold foil twist-wrap, same brown twisted ends, same "Sladus Ror" lettering, never change or redesign): a small gold-foil twist-wrapped chocolate candy. INGREDIENT (use @image2 exactly): a whole roasted almond.

Shot list, connected by fluid chocolate-wave and gold-dust-vortex transitions, hard cuts only where stated:
[0.0-1.5s] HOOK: extreme macro, camera rushing forward through a violent ribbon of glossy molten milk chocolate; almonds (@image2) and gold candies (@image1) tumble toward the lens, cocoa powder bursts, droplets in slow motion. HARD CUT.
[1.5-2.4s] Weightless almonds floating at different depths over a warm caramel-gold gradient, huge out-of-focus almonds in the foreground, sharp wrinkled almonds in the midground, soft shadows on a caramel floor, slow drifting camera with slight roll. Camera dives into a swirling vortex of liquid chocolate and caramel.
[2.4-4.0s] PRODUCT REVEAL: inside the chocolate-caramel vortex with golden glitter trails, the gold candy (@image1) rotates into frame, tumbling, its twisted wrapper ends fluttering, foil catching sparkling highlights; a ring of gold dust orbits it; camera pulls back as it hovers over a chocolate whirlpool.
[4.0-4.6s] Fast push-in to an extreme macro of the gold foil wrapper: crisp legible embossed "Sladus Ror" lettering, foil crinkle highlights, tiny condensation droplets, a blurred almond at the bottom edge.
[4.6-5.8s] A diagonal wave of molten chocolate whips across the frame throwing chocolate beads and crumbs; the candy is knocked into a spinning tumble, then settles front-and-center, wrapper facing the camera. HARD CUT.
[5.8-6.4s] The candy tilted diagonally, spinning among sweeping dark chocolate ribbons, gold rim light, dark brown background. HARD CUT.
[6.4-6.8s] The candy upright, floating in front of softly blurred golden foil leaves, drifting gold glitter. HARD CUT.
[6.8-7.75s] Slow-motion macro: a single almond (@image2) caught in a crown-shaped splash of molten chocolate on glossy black veined marble, chocolate shards and crumbs flying, golden bokeh background, camera slowly pushing in.
[7.75-8.6s] The candy spinning in a vortex of gold dust over a dark wooden surface, orbiting camera, particles streaking in a spiral, ending centered.
[8.6-10.0s] FINAL HERO: two gold candies (@image1) resting on glossy black veined marble, perfect mirror reflections, warm golden rim light, drifting gold smoke and dust behind, very slow push-in, perfectly stable, "Sladus Ror" lettering clean and legible, ends on a quiet clear frame.

Camera: continuous fast, smooth, physically plausible moves, whip-like speed at transitions, calm at the end. Lighting: warm golden backlight, strong specular highlights on foil and chocolate, deep contrast, rich blacks. Look: premium confectionery advertising, photoreal textures, subtle film grain, no text overlays.

Audio: deep cinematic sub-bass hits on transitions, shimmering gold chimes, liquid whooshes, slow pulse around 70 BPM, a brief silence just before the product reveal followed by one big hit, soft fade at the end. No voice, no speech, no singing.
```

## 2. NEGATIVE PROMPT (hamma sahnaga)

```
distorted or misspelled text on the wrapper, extra letters, garbled logo, extra logos, watermark, subtitles, captions, UI elements, people, hands, fingers, faces, animals, redesigned candy, changed wrapper colors, melted or warped wrapper, deformed candy shape, duplicate products, product morphing into another object, wrapper unfolding or open candy showing inside, wrong colors, white or blue or neon tones, cold lighting, flat lighting, overexposed highlights, blown-out whites, low resolution, blurry product, out-of-focus logo, jitter, flicker, camera shake, fisheye distortion, cartoon look, plastic look, cheap stock footage, oversaturated, banding, glitch, artifacts, dates, palm leaves, cans, jars, bottles, spoons, packaging boxes
```

---

## 3. KALIT KADRLAR (har sahna uchun birinchi kadr — rasm modelida yarating)

Birinchi kadr sifatini ushlab turish mahsulot izchilligining asosi. Rasm modeliga (Soul / Nano Banana yoki Higgsfield'dagi mavjud rasm modeli) `@image1` va `@image2` ni berib, quyidagi kadrlarni oling, so'ng har birini video modelda start frame qilib jonlantiring. Har kalit kadr: 9:16, fotoreal, issiq oltin orqa yorug'lik, chuqurlikda xira fon.

| # | Kalit kadr prompti (qisqa) |
|---|---|
| K1 | Macro of a violent glossy milk-chocolate splash with flying almonds (@image2) and a gold twist-wrapped candy (@image1), cocoa powder in the air, amber backlight, dark chocolate background |
| K2 | Many roasted almonds (@image2) floating at different depths over a warm caramel-gold gradient, huge blurred almonds in the foreground, sharp midground, soft shadows on a caramel floor |
| K3 | Gold foil candy (@image1) tumbling inside a swirling chocolate-caramel vortex, golden glitter ring orbiting it |
| K4 | Extreme macro of the gold foil wrapper of @image1, embossed "Sladus Ror" lettering crisp and legible, water droplets, blurred almond at the bottom |
| K5 | Candy (@image1) mid-tumble in front of a diagonal wave of molten chocolate with flying chocolate beads |
| K6 | Candy (@image1) tilted diagonally among dark chocolate ribbons, gold rim light |
| K7 | Candy (@image1) upright floating before softly blurred golden foil leaves, gold glitter in the air |
| K8 | One almond (@image2) in the center of a crown-shaped molten-chocolate splash on black veined marble, chocolate shards flying, golden bokeh |
| K9 | Candy (@image1) spinning inside a vortex of gold dust over a dark wooden surface |
| K10 | Two candies (@image1) resting on glossy black veined marble, mirror reflections, gold dust and smoke behind, dark background |

---

## 4. RASKADROVKA (sahnama-sahna reja + tayyor prompt)

Davomiylik: 10.05 s. Qattiq kesishlar (hard cut): 1.5 / 5.8 / 6.4 / 6.8 soniyalarda. Qolgan o'tishlar suyuq shokolad yoki oltin chang girdobi orqali (morph).
Har sahnani 1.2–2 soniyalik alohida generatsiya qiling, oxirida montajda yig'ing (CapCut, DaVinci yoki Higgsfield tahrirlagichi).

### S1 · 0.0–1.5 s · HOOK (hard cut bilan tugaydi)
- **Nima ko'rinadi:** shokolad to'lqini, bodomlar va konfetlar kameraga uchib keladi.
- **Kamera:** tez push-in, ozgina roll.
- **Tovush:** boshlanishida past zarba, shokolad shitirlashi.
- **Prompt:**
```
@image2 almonds and @image1 gold twist-wrapped candies tumble straight toward the lens through a violent ribbon-like splash of glossy molten milk chocolate, cocoa powder bursting in the air, droplets in slow motion. Extreme macro, fast push-in with a slight roll, warm amber backlight, deep dark-chocolate shadows, photoreal CGI luxury commercial, 9:16, 24fps, 1.5 seconds.
```

### S2 · 1.5–2.4 s · Bodomlar havoda
- **Nima ko'rinadi:** havoda suzayotgan bodomlar, katta xira bodomlar oldinda, o'tkir bodomlar o'rtada. Oxirida kamera shokolad girdobiga sho'ng'iydi.
- **Kamera:** sekin siljish, ozgina roll, yengil dolly-in.
- **Tovush:** deyarli jimlik, 2.0–2.25 s oralig'ida eng past daraja (reveal oldidan pauza).
- **Prompt:**
```
Weightless roasted almonds from @image2 floating at different depths over a warm caramel-gold gradient background, huge out-of-focus almonds in the foreground, sharp wrinkled almonds in the midground, soft shadows on a caramel floor, slow tilting and rotating in the air, camera drifting forward with a slight roll, warm rim light, shallow depth of field. At the end the camera dives into a swirling vortex of liquid chocolate and caramel. 9:16, 24fps, 1 second.
```

### S3 · 2.4–4.0 s · MAHSULOT BIRINCHI MARTA (girdob)
- **Nima ko'rinadi:** shokolad-karamel girdobi, oltin zarra izlari, konfet aylanib kiradi, o'ram uchlari hilpiraydi. Oltin chang halqasi atrofida aylanadi. Kamera orqaga tortiladi.
- **Kamera:** spiral yaqinlashish, keyin sekin pull-back.
- **Tovush:** 2.5 s da eng kuchli zarba, oltin jiringlash.
- **Prompt:**
```
Camera spirals into a swirling vortex of liquid milk chocolate and caramel with golden glitter trails. The gold foil candy from @image1 rotates into frame, tumbling, its twisted wrapper ends fluttering, the foil catching sparkling highlights; a ring of gold dust orbits around it. The camera pulls back as the candy hovers over a chocolate whirlpool. Keep the candy exactly as in @image1, same gold foil, same brown twisted ends, same "Sladus Ror" lettering. 9:16, 24fps, 1.6 seconds.
```

### S4 · 4.0–4.6 s · MAKRO: YOZUV
- **Nima ko'rinadi:** oltin folgadagi "Sladus Ror" yozuviga tez yaqinlashish, folga burmalari, suv tomchilari.
- **Kamera:** tez push-in, ozgina tilt.
- **Tovush:** 4.2 s da zarba.
- **Muhim:** AI yozuvni buzishi mumkin. Agar bu kadrda harflar buzilsa, yozuvni montajda matn/logotip qatlami sifatida qo'ying (rasm bo'yicha aniq "Sladus Ror").
- **Prompt:**
```
Fast push-in to an extreme macro of the gold foil wrapper of the candy from @image1, crisp perfectly legible embossed "Sladus Ror" lettering, foil crinkle highlights glinting, tiny water droplets on the surface, a blurred almond at the bottom edge of the frame, shallow depth of field, slight tilt, warm backlight. 9:16, 24fps, 0.8 seconds.
```

### S5 · 4.6–5.8 s · SHOKOLAD TO'LQINI (hard cut bilan tugaydi)
- **Nima ko'rinadi:** diagonal shokolad to'lqini zarralarni sochadi, konfet uchib aylanadi, 5.5 s da old tomon bilan to'g'ri turadi.
- **Kamera:** kuzatuv, ozgina zoom-out.
- **Tovush:** to'lqin shovqini, zarralar shitirlashi.
- **Prompt:**
```
A diagonal wave of molten chocolate whips across the frame throwing chocolate beads and crumbs into the air. The candy from @image1 is knocked into a spinning tumble, then stabilizes front and center with the wrapper facing the camera, surrounded by flying chocolate beads and a few almonds from @image2. Warm golden backlight, glossy highlights, high-speed physics, 9:16, 24fps, 1.2 seconds.
```

### S6 · 5.8–6.4 s · Diagonal aylanish (hard cut)
- **Nima ko'rinadi:** konfet diagonal holatda shokolad lentalari orasida aylanadi. Qorong'i jigarrang fon, oltin kontur yorug'lik.
- **Kamera:** konfet bo'ylab tez siljish.
- **Prompt:**
```
The candy from @image1 tilted diagonally and spinning among sweeping dark chocolate ribbons, gold rim light on the foil, dark brown background, camera tracking quickly along the motion, glossy reflections. 9:16, 24fps, 0.6 seconds.
```

### S7 · 6.4–6.8 s · Tik konfet, oltin barglar (hard cut)
- **Nima ko'rinadi:** konfet tik suzadi, orqada xira oltin folga bargchalari, oltin yaltiroq zarralar.
- **Prompt:**
```
The candy from @image1 floating upright in front of softly blurred golden foil leaves, drifting gold glitter in the air, shallow depth of field, warm backlight, calm and elegant. 9:16, 24fps, 0.4 seconds.
```

### S8 · 6.8–7.75 s · SEKINLATILGAN MAKRO (bodom + shokolad)
- **Nima ko'rinadi:** shokolad "toji" ichida bitta bodom, qora marmar, uchayotgan shokolad bo'laklari va uvoqlari, oltin bokeh. (Original: ikkiga bo'lingan xurmo ichida bodom.)
- **Kamera:** sekin push-in.
- **Tovush:** 6.8 s da zarba, so'ng yumshoq oltin jiringlash.
- **Prompt:**
```
Slow-motion extreme macro of a single almond from @image2 caught in a crown-shaped splash of molten milk chocolate on glossy black veined marble, chocolate shards and crumbs flying in the air, warm golden bokeh background, camera slowly pushing in, photoreal food-commercial look, glossy liquid chocolate, 9:16, 24fps, 1 second.
```

### S9 · 7.75–8.6 s · Oltin chang girdobi
- **Nima ko'rinadi:** konfet qorong'i yog'och yuzada aylanadi, atrofida oltin chang spirali, 8.5 s da markazda to'xtaydi.
- **Kamera:** orbit.
- **Tovush:** 8.3–8.5 s zarbalar, shitirlash.
- **Prompt:**
```
The candy from @image1 spinning inside a vortex of gold dust particles over a dark wooden surface, orbiting camera, particles streaking in a spiral, the candy ending centered and sharp, warm golden light, 9:16, 24fps, 0.85 seconds.
```

### S10 · 8.6–10.05 s · YAKUNIY HERO KADR
- **Nima ko'rinadi:** ikkita konfet jilvali qora marmarda, mukammal aks, orqada oltin tutun va chang. Barqaror kompozitsiya, "Sladus Ror" yozuvi aniq.
- **Kamera:** juda sekin push-in, oxirida tinch kadr.
- **Tovush:** 70 BPM sekin puls, oxirida asta so'nish.
- **Prompt:**
```
Final hero shot: two gold-foil twist-wrapped candies from @image1 resting on glossy black veined marble, perfect mirror reflections on the floor, warm golden rim light, drifting gold smoke and dust in the dark background, very slow push-in, perfectly stable composition, the "Sladus Ror" lettering clean and legible, premium confectionery advertising, ends on a quiet clear frame. 9:16, 24fps, 1.5 seconds.
```

---

## 5. TOVUSH (alohida)

Agar Higgsfield modeli tovush bermasa yoki yomon bersa, tovushni montajda qo'ying.

| Vaqt | Tovush |
|---|---|
| 0.0 | Past zarba, shokolad shitirlashi |
| 2.0–2.25 | Deyarli jimlik |
| 2.5 | Eng kuchli zarba + oltin jiringlash |
| 4.2 | Zarba (makro yozuv) |
| 5.9 | Qisqa zarba |
| 6.8 | Zarba (sekinlatilgan makro) |
| 8.3–8.5 | Girdob shitirlashi |
| 8.6–9.5 | Sekin puls (~70 BPM) |
| 9.5–10.0 | Asta so'nish |

Umumiy balandlik: taxminan -14 LUFS (etalon -13.6). Ovoz, so'z va qo'shiq YO'Q.

---

## 6. SIFAT UCHUN QOIDALAR (Higgsfield)

1. Format: 9:16, eng yuqori sifat, 24 fps, har sahna 1–2 s.
2. Har sahnada mahsulotni `@image1` bilan bering (start frame ham, matn ham). Mahsulot tegi tushib qolsa, konfet o'zgaradi.
3. Konfet kichik, shuning uchun makro kadrlarda (S4, S10) yozuvni tekshiring. Buzilgan bo'lsa, qayta generatsiya qiling yoki yozuvni montajda qo'ying.
4. Har sahnani 3–4 marta generatsiya qilib, mahsulot to'g'ri bo'lganini tanlang.
5. Kamera presetlarida (bor bo'lsa) push-in, orbit va whip-pan turlaridan foydalaning, lekin promptdagi harakatni o'zgartirmang.
6. Birlashtirgandan so'ng sifatni oshirish (upscale) va yengil plyonka donadorligi qo'shing, yagona rang grading qiling (oltin-karamel).
7. Qattiq kesishlar (1.5 / 5.8 / 6.4 / 6.8) ritmni belgilaydi, ularni silliqlamang.
