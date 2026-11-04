// ====== MAHSULOTLAR ======
// price — DEMO narx (so'mda). Haqiqiy narxlarni shu yerda almashtiring.
// oldPrice — ixtiyoriy: chegirma ko'rsatish uchun (eski narx).
export const CATEGORIES = [
  { id: 'all', name: 'Hammasi', icon: '✨' },
  { id: 'laundry', name: 'Kir yuvish', icon: '🧺' },
  { id: 'clean', name: 'Uy tozaligi', icon: '🧽' },
  { id: 'battery', name: 'Batareykalar', icon: '🔋' },
  { id: 'other', name: 'Boshqa', icon: '🛠️' },
];

export const PRODUCTS = [
  { id: 1, cat: 'laundry', name: 'Ariel 4in1 Pods Original', desc: 'Kir yuvish kapsulalari, oilaviy qadoq. Dog‘larni oson yo‘qotadi, yorqin ranglar. Bolalardan himoya tizimi.', size: '55 yuvish', price: 189000, oldPrice: 219000, img: 'ariel-pods.jpg', hit: true },
  { id: 2, cat: 'laundry', name: 'Ariel All-in-1 Pods Mountain Spring', desc: 'Tez eriydigan kapsulalar, sovuq suvda ham samarali.', size: '65 kapsula', price: 215000, img: 'ariel-65.jpg' },
  { id: 3, cat: 'laundry', name: 'Kopum Plus Perfume Opera', desc: 'Xushbo‘y kir yuvish kukuni (Lush Serenity), hid kuchaytirgich bilan. Chuqur tozalik, matonni asraydi.', size: '3 kg · 51 yuvish', price: 98000, img: 'kopum.jpg', hit: true },
  { id: 4, cat: 'laundry', name: 'Yumsa Plus kir yumshatgich', desc: 'Super konsentrat. Hidlar: Orkide, Roza, Lilyum, Glamour, Love, Deluxe, Sensitive.', size: '4 litr', price: 79000, oldPrice: 92000, img: 'yumsa.jpg' },
  { id: 5, cat: 'laundry', name: 'Ecotab Antinakip Lime', desc: 'Kir yuvish mashinasi, choynak va dazmol uchun nakipga qarshi vosita.', size: '500 g', price: 36000, img: 'ecotab-antinakip.jpg', isNew: true },

  { id: 6, cat: 'clean', name: 'BioTaf Antizasor', desc: 'Quvurlardagi qattiq ifloslikni yo‘qotadi, yomon hidni bartaraf etadi. Tez ta’sir qiladi.', size: '175 g', price: 18000, img: 'biotaf.jpg', hit: true },
  { id: 7, cat: 'clean', name: 'Ecotab Tornado', desc: 'Quvurlarni tozalash uchun kuchli granulalar. Tirnalgan quvurlarga bardosh.', size: '175 g', price: 19000, img: 'ecotab-tornado.jpg' },
  { id: 8, cat: 'clean', name: 'Viva Plus gubkalari', desc: 'Ko‘p maqsadli idish yuvish gubkalari, kuchli tozalash qatlami, oson chayiladi.', size: '5 dona', price: 9000, img: 'viva.jpg' },
  { id: 9, cat: 'clean', name: 'Euro House gubkalari', desc: 'Rangli oshxona gubkalari. Amaliy, qulay va uzoq muddatli.', size: '5 dona', price: 8000, img: 'euro-house.jpg' },
  { id: 10, cat: 'clean', name: 'Air Smart 2in1 havo fresheri', desc: 'Hidlantiradi va yangilik bag‘ishlaydi. Turli yoqimli hidlar: qulupnay, anor, gul, dengiz, qarag‘ay, limon, vanil.', size: '300 ml', price: 22000, img: 'airsmart.jpg' },

  { id: 11, cat: 'battery', name: 'Duracell AA (LR6) Alkaline', desc: 'Uzoq ishlaydigan ishonchli ishqoriy batareyka, 1.5V.', size: '60 dona', price: 165000, img: 'duracell-aa.jpg' },
  { id: 12, cat: 'battery', name: 'Duracell AAA (LR03) Alkaline', desc: 'Uzoq ishlaydigan ishonchli ishqoriy batareyka, 1.5V.', size: '60 dona', price: 155000, img: 'duracell-aaa.jpg' },
  { id: 13, cat: 'battery', name: 'Raketa AA (LR6) Alkaline', desc: '+30% ko‘proq quvvat, 0% simob va kadmiy. Oqishdan himoyalangan.', size: '60 dona', price: 95000, img: 'raketa-aa.jpg', hit: true },
  { id: 14, cat: 'battery', name: 'Raketa AAA (LR03) Alkaline', desc: '+30% ko‘proq quvvat, 0% simob va kadmiy. Barqaror ishlash.', size: '60 dona', price: 90000, img: 'raketa-aaa.jpg' },
  { id: 15, cat: 'battery', name: 'Raketa 9V (6F22) tuzli', desc: 'Krona turidagi 9V batareyka, barqaror quvvat.', size: '10 dona', price: 45000, img: 'raketa-9v.jpg' },
  { id: 16, cat: 'battery', name: 'Soni AA (LR6) Alkaline', desc: 'Katta qadoq — ko‘proq son. Barqaror ishlash, uzoq muddatli energiya.', size: '60 dona', price: 75000, img: 'soni-aa.jpg' },
  { id: 17, cat: 'battery', name: 'Soni AAA (R03) Carbon', desc: 'Pult, o‘yinchoq, soat, fonar va boshqalar uchun. Kichik batareya — katta quvvat.', size: '60 dona', price: 50000, img: 'soni-aaa.jpg' },

  { id: 18, cat: 'other', name: 'G2 sichqonlar uchun yelimli tuzoq', desc: 'Zaharlarsiz, hidsiz, foydalanishga qulay. Uy va ombor uchun.', size: '1 dona', price: 7000, img: 'g2-glue.jpg' },
  { id: 19, cat: 'other', name: 'Chilling Bet universal yelim', desc: 'Aniq surtish uchun ingichka uchli yelim. Tez va qulay.', size: '4 dona', price: 14000, img: 'chilling-glue.jpg', isNew: true },
  { id: 20, cat: 'other', name: 'Hong Long HL-558 II ustara', desc: 'Klassik xavfsiz ustara (T-shaklli) + almashtiriladigan tig‘lar.', size: '1 dona', price: 25000, img: 'razor.jpg' },
];
