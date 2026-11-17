/* ASMO site logic: i18n, catalog, live 3D hero, calculator, form */
(function(){
'use strict';

/* ===== Fill these in with the real company details ===== */
const CONFIG={
  phone:'+998 XX XXX XX XX',
  telegram:'',          // masalan: 'asmo_uz' -> t.me/asmo_uz
  instagram:'',         // masalan: 'asmo.uz'
  address:{uz:"Farg'ona viloyati, Uchko'prik tumani",ru:'Ферганская область, Учкуприкский район'},
  mapQuery:"Uchko'prik tumani, Farg'ona viloyati"
};

const L=(uz,ru)=>({uz,ru});
const T={
uz:{
n_coll:'Kolleksiya',n_story:'Kompaniya',n_proc:'Surtish',n_calc:'Kalkulyator',n_contact:'Aloqa',n_cta:'Buyurtma',
h_eyebrow:"Farg'ona · 2019-yildan",h_t1:'Devor —',h_t2:"san'at asari.",
h_lead:"Premium dekorativ qoplamalar, grunt va suv asosli bo'yoqlar. Italy Quality belgisi bilan, O'zbekistonda ishlab chiqarilgan.",
h_cta1:"Kolleksiyani ko'rish",h_cta2:"Narx so'rash",h_hint:'Aylantirish uchun suring',h_pick:'Mahsulot tanlang',
chipA:'Qadoq',chipB:'Xususiyat',
bene:["Ichki va tashqi ishlar uchun","Nafas oluvchi qoplama","Yuviladigan sirt","Cho'tka yoki valik bilan","Ekologik tarkib","Product Guarantee"],
mq:['Lucida','Perla','Travertin','Milano','Eron tosh','Grunt','Vodoemulsiya'],
s_eyebrow:'Kompaniya',s_h:"Uchko'prikdan chiqqan italyancha sifat",
s_p1:"<strong>ASMO ishini 2019-yilda boshlagan.</strong> Ishlab chiqarish Farg'ona viloyati, Uchko'prik tumanida joylashgan.",
s_p2:"Biz dekorativ qoplamalar, 20 kg li grunt emulsiya va uch xil suv asosli bo'yoq chiqaramiz. Har bir qadoq Product Guarantee va Italy Quality belgisi bilan keladi.",
s_where:"Farg'ona viloyati, Uchko'prik tumani",st1:'yildan beri bozorda',st2:'mahsulot turi',st3:'1 kg qoplama sarfi (bir qatlam)',st4:'oy saqlash muddati',s_cap:'Lucida · Bikser',
c_eyebrow:'Kolleksiya',c_h:"Devorga xarakter beradigan qoplamalar",c_p:"Har bir mahsulot o'ziga xos sirt va yorug'lik o'yini beradi. Xonangizga mosini tanlang.",
l_tag:'Dekorativ qoplama',l_em:'yumshoq oltin nur',l_pick:'Lucida turi',
more:'Texnik ma\'lumot',order:'Buyurtma berish',
p_tag:'Perlamutr effekti',p_em:'sadaf yaltirashi',p_pick:'Rang tanlang',
p_d:"Perla marvarid kabi nur sochadigan dekorativ qoplama. Rangni tayyor to'plamdan tanlaysiz yoki koler pasta bilan o'zingiz tus berasiz.",
t_tag:'Tosh tekstura',t_em:'tosh va himoya',t_d:"Travertin tabiiy tosh teksturasini beradi, Travertin Lak uni yakuniy qatlam bilan himoyalaydi. Fasad va interyer uchun.",
m_eyebrow:'Yana ham',m_h:"Asos, yakun va bo'yoq",
cats:{},
sp:{pack:'Qadoq',use:'Qayerda',apply:'Surtish',cons:'Sarf',dil:'Suyultirish',tint:'Rang berish',temp:'Harorat',dry:'Quriish',shelf:'Saqlash',base:'Asos',kind:'Turi',price:'Narx'},
r_eyebrow:'Surtish tartibi',r_h:"Perla va Lucida qanday surtiladi",
steps:[["Asosni tayyorlang","Sirt toza, quruq, mustahkam va yog'siz bo'lsin."],["Akril grunt","To'ldiruvchili italiano gruntovka suriladi. 2–4 soat quriydi."],["Shpaklevka","Akril shpaklevka bilan tekis tekstura hosil qilinadi."],["Silliqlash","Quriganidan keyin jilvir qog'oz, so'ng finish grunt."],["Qoplama","Valik bilan 1–2 qatlam. To'liq quriishi 24 soat."]],
k_eyebrow:'Kalkulyator',k_h:'Qancha material kerak?',k_prod:'Mahsulot',k_area:'Devor maydoni',k_layers:'Qatlamlar soni',k_need:'Taxminiy sarf',k_buckets:'5 kg lik chelak',
k_note:"Hisob etiketkadagi sarfga asoslangan: 1 kg ≈ 5–6 m² (bir qatlam). Aniq sarf asos turi va surtish usuliga bog'liq.",
o_eyebrow:'Aloqa',o_h:"Narx va mavjudligini aniqlang",
cl:{addr:'Manzil',phone:'Telefon',tg:'Telegram',ig:'Instagram',map:'Xarita',mapt:'Xaritada ochish'},
f_name:'Ismingiz',f_phone:'Telefon',f_prod:'Mahsulot',f_msg:'Izoh',f_send:'Xabar tayyorlash',f_err:"Telefon raqamini to'liq kiriting.",
f_hello:"Assalomu alaykum! ASMO mahsulotlari bo'yicha so'rov:",f_copy:'Nusxa olish',f_copied:'Nusxa olindi',f_tg:'Telegramda yuborish',f_hint:'Xabar tayyor. Nusxa olib, Telegram yoki telefon orqali yuboring.',
foot:'© 2019–2026 ASMO Construction Products',foot2:"Farg'ona viloyati, Uchko'prik tumani",
vn:{purple:'Binafsha',gray:'Kulrang',green:'Yashil',blue:"Ko'k"}
},
ru:{
n_coll:'Коллекция',n_story:'Компания',n_proc:'Нанесение',n_calc:'Калькулятор',n_contact:'Контакты',n_cta:'Заказать',
h_eyebrow:'Фергана · с 2019 года',h_t1:'Стена —',h_t2:'произведение искусства.',
h_lead:'Премиальные декоративные покрытия, грунты и водоэмульсионные краски. Знак Italy Quality, сделано в Узбекистане.',
h_cta1:'Смотреть коллекцию',h_cta2:'Узнать цену',h_hint:'Потяните, чтобы повернуть',h_pick:'Выберите продукт',
chipA:'Фасовка',chipB:'Особенность',
bene:['Для внутренних и наружных работ','Дышащее покрытие','Моющаяся поверхность','Кисть или валик','Экологичный состав','Product Guarantee'],
mq:['Lucida','Perla','Travertin','Milano','Эрон тош','Грунт','Водоэмульсия'],
s_eyebrow:'Компания',s_h:'Итальянское качество из Учкуприка',
s_p1:'<strong>ASMO работает с 2019 года.</strong> Производство находится в Ферганской области, Учкуприкский район.',
s_p2:'Мы выпускаем декоративные покрытия, грунт-эмульсию 20 кг и три вида водоэмульсионных красок. Каждая упаковка имеет знаки Product Guarantee и Italy Quality.',
s_where:'Ферганская область, Учкуприкский район',st1:'лет на рынке',st2:'видов продукции',st3:'расход 1 кг (один слой)',st4:'месяцев срок хранения',s_cap:'Lucida · Биксер',
c_eyebrow:'Коллекция',c_h:'Покрытия, которые задают характер стене',c_p:'Каждый продукт даёт свою фактуру и игру света. Выберите подходящий для вашей комнаты.',
l_tag:'Декоративное покрытие',l_em:'мягкий золотой свет',l_pick:'Вид Lucida',
more:'Технические данные',order:'Заказать',
p_tag:'Перламутровый эффект',p_em:'жемчужный блеск',p_pick:'Выберите цвет',
p_d:'Perla светится как жемчуг. Цвет выбирается из готовой палитры или колеруется пастой.',
t_tag:'Фактура камня',t_em:'камень и защита',t_d:'Travertin создаёт фактуру натурального травертина, Travertin Lak защищает её финишным слоем. Для фасада и интерьера.',
m_eyebrow:'Ещё',m_h:'Основа, финиш и краска',
sp:{pack:'Фасовка',use:'Применение',apply:'Нанесение',cons:'Расход',dil:'Разбавление',tint:'Колеровка',temp:'Температура',dry:'Высыхание',shelf:'Хранение',base:'Основание',kind:'Вид',price:'Цена'},
r_eyebrow:'Порядок нанесения',r_h:'Как наносить Perla и Lucida',
steps:[['Подготовьте основание','Поверхность чистая, сухая, прочная, обезжиренная.'],['Акриловый грунт','Наносится итальяно-грунт с наполнителем. Сохнет 2–4 часа.'],['Шпатлёвка','Акриловой шпатлёвкой создаётся ровная структура.'],['Шлифовка','После высыхания наждачная бумага, затем финишный грунт.'],['Покрытие','Валиком в 1–2 слоя. Полное высыхание 24 часа.']],
k_eyebrow:'Калькулятор',k_h:'Сколько материала нужно?',k_prod:'Продукт',k_area:'Площадь стен',k_layers:'Количество слоёв',k_need:'Ориентировочный расход',k_buckets:'Вёдер по 5 кг',
k_note:'Расчёт по данным этикетки: 1 кг ≈ 5–6 м² (один слой). Точный расход зависит от основания и способа нанесения.',
o_eyebrow:'Контакты',o_h:'Узнайте цену и наличие',
cl:{addr:'Адрес',phone:'Телефон',tg:'Telegram',ig:'Instagram',map:'Карта',mapt:'Открыть на карте'},
f_name:'Ваше имя',f_phone:'Телефон',f_prod:'Продукт',f_msg:'Комментарий',f_send:'Подготовить сообщение',f_err:'Введите номер телефона полностью.',
f_hello:'Здравствуйте! Запрос по продукции ASMO:',f_copy:'Скопировать',f_copied:'Скопировано',f_tg:'Отправить в Telegram',f_hint:'Сообщение готово. Скопируйте и отправьте в Telegram или по телефону.',
foot:'© 2019–2026 ASMO Construction Products',foot2:'Ферганская область, Учкуприкский район',
vn:{purple:'Фиолетовый',gray:'Серый',green:'Зелёный',blue:'Синий'}
}};

/* ===== product data ===== */
const COV=L('1 kg ≈ 5–6 m² (bir qatlam)','1 кг ≈ 5–6 м² (один слой)');
const BR=L("Cho'tka / valik",'Кисть / валик');
const P=[
{id:'lucida-bikser',name:'Lucida Bikser',tex:['bikser','lucida_back'],view:true,
 tag:L('Qumli · Yangi','С песком · Новинка'),chipA:L('5 kg','5 кг'),chipB:L('Qumli tekstura','Фактура с песком'),
 d:L("Yumshoq oltin tekstura va yorug'lik-soya o'yini. Qumli tur sirtga chuqur tekstura beradi. Klassik va shinam interyer uchun.","Мягкая золотистая текстура и игра света и тени. Вариант с песком даёт глубокую фактуру. Для классического и уютного интерьера."),
 vars:[L('Qumli','С песком')],
 sp:[['pack',L('5 kg ±50 g','5 кг ±50 г')],['use',L("Ichki ishlar (etiketka bo'yicha)",'Внутренние работы (по этикетке)')],['apply',BR],['cons',COV],['shelf',L('12 oy','12 месяцев')]]},
{id:'lucida-premium',name:'Lucida Premium',tex:['premium','lucida_back'],view:true,
 tag:L('Qumsiz · Yangi','Без песка · Новинка'),chipA:L('5 kg','5 кг'),chipB:L('Qumsiz, silliq','Без песка, гладкая'),
 d:L("Qumsiz tur: sirt silliq, tekstura yumshoq oltin tusli. Yorug'lik bilan o'ynaydigan premium yakun.","Вариант без песка: гладкая поверхность с мягкой золотистой фактурой. Премиальный финиш, играющий со светом."),
 vars:[L('Qumsiz','Без песка')],
 sp:[['pack',L('5 kg ±50 g','5 кг ±50 г')],['use',L("Ichki ishlar (etiketka bo'yicha)",'Внутренние работы (по этикетке)')],['apply',BR],['cons',COV],['shelf',L('12 oy','12 месяцев')]]},
{id:'perla',name:'Perla',tex:['perla','perla_back'],view:true,
 tag:L('Sadaf effekti · Yangi','Перламутр · Новинка'),chipA:L('5 kg','5 кг'),chipB:L('Sadaf effekti','Перламутровый эффект'),
 d:L("Sadaf (perlamutr) effektli dekorativ qoplama. Sirtda marvarid yaltirashi paydo bo'ladi. Gipsli va betonli asoslarga.","Декоративное покрытие с перламутровым эффектом. На поверхности появляется жемчужный блеск. Для гипсовых и бетонных оснований."),
 vars:[L('Binafsha','Фиолетовый'),L('Kulrang','Серый'),L('Yashil','Зелёный'),L("Ko'k",'Синий')],
 sp:[['pack',L('5 kg ±50 g','5 кг ±50 г')],['base',L('Gips, beton','Гипс, бетон')],['use',L('Ichki va tashqi ishlar','Внутренние и наружные работы')],['apply',L('1–2 qatlam, valik yoki purkagich','1–2 слоя, валик или пульверизатор')],['cons',COV],['dil',L('Suv bilan 10% gacha','Водой до 10%')],['tint',L('Koler pasta 5% gacha','Колер-паста до 5%')],['temp',L('+5 … +30 °C','+5 … +30 °C')],['dry',L('24 soat','24 часа')],['shelf',L('12 oy','12 месяцев')]]},
{id:'travertin',name:'Travertin',png:'assets/travertin.webp',
 tag:L('Dekorativ tekstura','Декоративная текстура'),
 d:L("Tabiiy travertin toshini eslatuvchi dekorativ tekstura. Fasad va interyer devorlari uchun.","Декоративная текстура под натуральный травертин. Для фасадов и интерьеров."),
 vars:[],sp:[['pack',L('25 kg ±100 g','25 кг ±100 г')],['use',L('Ichki va tashqi ishlar','Внутренние и наружные работы')]]},
{id:'travertin-lak',name:'Travertin Lak',png:'assets/travertin-lak.webp',
 tag:L('New creation','New creation'),
 d:L("Travertin sirtini yakunlovchi va himoyalovchi lak. Dekorativ ichki va tashqi devor qoplamalari uchun.","Лак для завершения и защиты поверхности Travertin. Для декоративных внутренних и наружных покрытий."),
 vars:[],sp:[['use',L('Ichki va tashqi ishlar','Внутренние и наружные работы')],['kind',L('Himoya laki','Защитный лак')]]},
{id:'milano',name:'Milano',tex:['milano','milano_back'],view:true,
 tag:L('2 xil yakun','2 вида финиша'),chipA:L('Italy Quality','Italy Quality'),chipB:L('Glyans va mat','Глянец и мат'),
 d:L("Milano ikki xil yakun bilan chiqadi: yaltiroq (glyans) va yaltiramaydigan (mat).","Milano выпускается в двух финишах: глянцевом и матовом."),
 vars:[L('Glyans (yaltiroq)','Глянец'),L('Mat','Мат')],sp:[['kind',L('Dekorativ qoplama','Декоративное покрытие')],['price',L("Menejerdan so'rang",'Уточняйте у менеджера')]]},
{id:'eron-tosh',name:'Eron tosh',tex:['eron','eron_back'],view:true,
 tag:L('Tosh effekti','Эффект камня'),chipA:L('Italy Quality','Italy Quality'),chipB:L('Tosh effekti','Эффект камня'),
 d:L("Travertin turkumiga kiruvchi tosh teksturali qoplama. Fasad va interyerga mos.","Покрытие с каменной фактурой из линейки Travertin. Подходит для фасада и интерьера."),
 vars:[],sp:[['kind',L('Dekorativ qoplama','Декоративное покрытие')],['price',L("Menejerdan so'rang",'Уточняйте у менеджера')]]},
{id:'grunt',name:'Grunt emulsiya',tex:['grunt','grunt_back'],view:true,
 tag:L('Asos qatlam','Основа'),chipA:L('20 kg','20 кг'),chipB:L('Asos qatlam','Основа под покрытие'),
 d:L("Dekorativ qoplama ostiga suriladigan asos qatlam. Sirtni tayyorlaydi va qoplamaning yopishishini yaxshilaydi.","Основа под декоративное покрытие. Подготавливает поверхность и улучшает сцепление."),
 vars:[],sp:[['pack',L('20 kg','20 кг')],['kind',L('Grunt emulsiya','Грунт-эмульсия')]]},
{id:'vodoemulsiya',name:'Vodoemulsiya',tex:['vodo','vodo_back'],view:true,
 tag:L('Suv asosli','Водная основа'),chipA:L('Italy Quality','Italy Quality'),chipB:L('3 xil tur','3 вида'),
 d:L("Suv asosli bo'yoq, uch xil turda ishlab chiqariladi. Turini tanlashda menejer yordam beradi.","Водоэмульсионная краска, выпускается в трёх видах. Менеджер поможет выбрать нужный."),
 vars:[],sp:[['kind',L("Suv asosli bo'yoq",'Водоэмульсионная краска')],['price',L("Menejerdan so'rang",'Уточняйте у менеджера')]]}
];
const byId=id=>P.find(p=>p.id===id);
const HERO=['lucida-premium','lucida-bikser','perla','milano','eron-tosh','grunt','vodoemulsiya'];
const R=(id,v)=>`assets/renders/${id}-${v||'front'}.webp`;
const SW=['purple','gray','green','blue'];
const ICONS=[
'<svg viewBox="0 0 32 32"><path d="M4 15 16 5l12 10M7 13v14h18V13M13 27v-8h6v8"/></svg>',
'<svg viewBox="0 0 32 32"><path d="M3 11c4-4 6 4 10 0s6 4 10 0 5 2 6 1M3 18c4-4 6 4 10 0s6 4 10 0 5 2 6 1M3 25c4-4 6 4 10 0s6 4 10 0 5 2 6 1"/></svg>',
'<svg viewBox="0 0 32 32"><path d="M16 4C9 11 7 16 7 20a9 9 0 0 0 18 0c0-4-2-9-9-16zM12 21a4 4 0 0 0 4 4"/></svg>',
'<svg viewBox="0 0 32 32"><path d="M20 3l9 9-7 4-6-6zM16 10 6 20c-2 2-3 5-3 8 4 0 7-1 9-3l10-10"/></svg>',
'<svg viewBox="0 0 32 32"><path d="M5 27C5 12 14 5 28 4c0 14-6 23-20 23zM5 27 18 14"/></svg>',
'<svg viewBox="0 0 32 32"><path d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7zM11 16l4 4 7-8"/></svg>'];

/* ===== state & helpers ===== */
let lang='uz',heroId='lucida-premium',lucida='bikser',swatch='purple',layers=2,openId=null;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const t=k=>T[lang][k],loc=o=>o[lang];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const svgArrow='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h11M9 4l4 4-4 4"/></svg>';

/* ===== rendering ===== */
function specList(p){return p.sp.map(r=>`<div><dt>${t('sp')[r[0]]}</dt><dd>${esc(loc(r[1]))}</dd></div>`).join('');}
function renderStatic(){
  $$('[data-i]').forEach(e=>{const v=t(e.dataset.i);if(typeof v==='string')e.innerHTML=v;});
  $$('[data-aria]').forEach(e=>e.setAttribute('aria-label',t(e.dataset.aria)));
  document.documentElement.lang=lang;
  $$('.lang button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===lang));
  $('#chipAk').textContent=t('chipA');$('#chipBk').textContent=t('chipB');
  $('#bene').innerHTML=t('bene').map((x,i)=>`<li>${ICONS[i]}<span>${x}</span></li>`).join('');
  const m=t('mq').map(x=>`<span>${x}</span>`).join('');$('#mq').innerHTML=m+m+m+m;
  $('#steps').innerHTML='<i class="bar"></i>'+t('steps').map(s=>`<li><h3>${s[0]}</h3><p>${s[1]}</p></li>`).join('');
  renderHeroPick();setHeroText();renderLucida();renderPerla();renderCards();renderContact();calc();
  if(openId)fillModal(openId);
}
function renderHeroPick(){
  $('#pick').innerHTML=HERO.map(id=>`<button type="button" data-hero="${id}" aria-pressed="${id===heroId}" aria-label="${esc(byId(id).name)}"><img src="${R(id)}" alt="" width="56" height="52" loading="lazy"></button>`).join('');
}
function setHeroText(){
  const p=byId(heroId);
  $('#pName').textContent=p.name;$('#pSub').textContent=loc(p.tag);
  $('#chipA').textContent=loc(p.chipA);$('#chipB').textContent=loc(p.chipB);
  $$('#pick button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.hero===heroId));
}
function renderLucida(){
  const p=byId('lucida-'+lucida);
  const names={bikser:{uz:'Bikser · qumli',ru:'Биксер · с песком'},premium:{uz:'Premium · qumsiz',ru:'Premium · без песка'}};
  const btns=$$('#lSeg button');btns.forEach(b=>{b.textContent=names[b.dataset.v][lang];b.setAttribute('aria-pressed',b.dataset.v===lucida);});
  $('#lDesc').textContent=loc(p.d);$('#lSpecs').innerHTML=specList(p);
  $('#lOrder').dataset.order=p.id;
}
function setLucidaImages(){
  const a=lucida==='bikser';
  $('#lifeA').classList.toggle('on',a);$('#lifeB').classList.toggle('on',!a);
  $('#lbA').classList.toggle('on',a);$('#lbB').classList.toggle('on',!a);
}
function renderPerla(){
  const p=byId('perla');$('#pSpecs').innerHTML=specList(p).split('</div>').slice(0,6).join('</div>')+'</div>';
  $('#sw').innerHTML=SW.map(k=>`<button type="button" data-sw="${k}" aria-pressed="${k===swatch}" aria-label="${t('vn')[k]}"><span style="background-image:url(assets/parts/sw-${k}.jpg)"></span></button>`).join('');
  $('#saImg').style.backgroundImage=`url(assets/parts/sw-${swatch}.jpg)`;$('#saName').textContent=t('vn')[swatch];
}
function renderCards(){
  $('#cards').innerHTML=['milano','eron-tosh','grunt','vodoemulsiya'].map(id=>{const p=byId(id);
   return `<button type="button" class="card rv" data-open="${id}"><div class="im"><img src="${R(id)}" alt="${esc(p.name)}" width="896" height="831" loading="lazy"></div><div class="in"><span class="bd">${esc(loc(p.tag))}</span><h3>${esc(p.name)}</h3><p>${esc(loc(p.d).split('. ')[0].replace(/\.$/,''))}.</p><span class="go"><span>${t('more')}</span>${svgArrow}</span></div></button>`;}).join('');
  $$('#cards .card').forEach(c=>{if(rvObs)rvObs.observe(c);else c.classList.add('in');});
}
function renderContact(){
  const c=t('cl');let r=`<div><dt>${c.addr}</dt><dd>${esc(loc(CONFIG.address))}</dd></div><div><dt>${c.phone}</dt><dd>${esc(CONFIG.phone)}</dd></div>`;
  if(CONFIG.telegram)r+=`<div><dt>${c.tg}</dt><dd><a href="https://t.me/${CONFIG.telegram}" target="_blank" rel="noopener">@${CONFIG.telegram}</a></dd></div>`;
  if(CONFIG.instagram)r+=`<div><dt>${c.ig}</dt><dd><a href="https://instagram.com/${CONFIG.instagram}" target="_blank" rel="noopener">@${CONFIG.instagram}</a></dd></div>`;
  r+=`<div><dt>${c.map}</dt><dd><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapQuery)}" target="_blank" rel="noopener">${c.mapt} →</a></dd></div>`;
  $('#cl').innerHTML=r;
  const s=$('#fs'),v=s.value;s.innerHTML=P.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');if(v)s.value=v;
}

/* ===== modal ===== */
const dlg=$('#dlg');
function fillModal(id){
  const p=byId(id),sp=t('sp');
  const views=p.view?['front','angle','back'].map(v=>R(id,v)):[p.png||R(id)];
  const show=src=>{$('#dbig').innerHTML=`<img src="${src}" alt="${esc(p.name)}" width="896" height="831">`;$$('#dth button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.src===src));};
  $('#dth').innerHTML=views.length>1?views.map(v=>`<button type="button" data-src="${v}" aria-label="view"><img src="${v}" alt=""></button>`).join(''):'';
  show(views[0]);
  $('#dth').onclick=e=>{const b=e.target.closest('button');if(b)show(b.dataset.src);};
  $('#dtag').textContent=loc(p.tag);$('#dn').textContent=p.name;$('#dd').textContent=loc(p.d);
  $('#dv').innerHTML=p.vars.map(v=>`<span>${esc(loc(v))}</span>`).join('');$('#dv').hidden=!p.vars.length;
  $('#ds').innerHTML=p.sp.map(r=>`<tr><th>${sp[r[0]]}</th><td>${esc(loc(r[1]))}</td></tr>`).join('');
  $('#do').textContent=t('order');$('#do').dataset.order=id;
}
function openModal(id){openId=id;fillModal(id);if(!dlg.open)dlg.showModal();}
dlg.addEventListener('close',()=>{openId=null;});
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
$('#dx').onclick=()=>dlg.close();

/* ===== global click delegation ===== */
document.addEventListener('click',e=>{
  const o=e.target.closest('[data-open]');if(o){openModal(o.dataset.open);return;}
  const h=e.target.closest('[data-hero]');if(h){setHero(h.dataset.hero);return;}
  const s=e.target.closest('[data-sw]');if(s){swatch=s.dataset.sw;renderPerla();$('#saImg').animate([{opacity:.2},{opacity:1}],{duration:450,easing:'ease-out'});return;}
  const lv=e.target.closest('#lSeg button');if(lv){lucida=lv.dataset.v;renderLucida();setLucidaImages();return;}
  if(e.target.closest('#lMore')){openModal('lucida-'+lucida);return;}
  const ord=e.target.closest('[data-order]');if(ord){$('#fs').value=ord.dataset.order;if(dlg.open)dlg.close();}
  const lg=e.target.closest('[data-lang]');if(lg){lang=lg.dataset.lang;try{localStorage.setItem('asmo-lang',lang)}catch(_){}renderStatic();}
});
$('#do').addEventListener('click',e=>{e.preventDefault();$('#fs').value=e.currentTarget.dataset.order;dlg.close();$('#contact').scrollIntoView({behavior:reduce?'auto':'smooth'});});

/* ===== nav, menu, progress, scrollspy ===== */
const hdr=$('#hdr'),prog=$('#prog'),totop=$('#totop'),menu=$('#menu'),burger=$('#burger');
function onScroll(){
  const y=scrollY,max=document.documentElement.scrollHeight-innerHeight;
  hdr.classList.toggle('stuck',y>8);prog.style.transform=`scaleX(${max>0?Math.min(1,y/max):0})`;totop.classList.toggle('on',y>900);
}
addEventListener('scroll',onScroll,{passive:true});onScroll();
totop.onclick=()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'});
function setMenu(open){menu.classList.toggle('open',open);burger.setAttribute('aria-expanded',open);document.body.style.overflow=open?'hidden':'';}
burger.onclick=()=>setMenu(!menu.classList.contains('open'));
menu.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});
addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false);});
matchMedia('(min-width:1021px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});
if('IntersectionObserver'in window){
  const links={};$$('#nav a').forEach(a=>links[a.getAttribute('href').slice(1)]=a);
  const spy=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){Object.values(links).forEach(a=>a.classList.remove('on'));const a=links[e.target.id];if(a)a.classList.add('on');}}),{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(links).forEach(id=>{const s=document.getElementById(id);if(s)spy.observe(s);});
}

/* ===== reveal + count-up ===== */
let rvObs=null;
function countUp(el){
  const to=+el.dataset.count,from=to>100?to-24:0,d=1300,t0=performance.now();
  (function f(n){const k=Math.min(1,(n-t0)/d),e=1-Math.pow(1-k,3);el.textContent=Math.round(from+(to-from)*e);if(k<1)requestAnimationFrame(f);})(t0);
}
if('IntersectionObserver'in window&&!reduce){
  document.documentElement.classList.add('js-rv');
  rvObs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rvObs.unobserve(e.target);e.target.querySelectorAll('[data-count]').forEach(countUp);}}),{threshold:.12,rootMargin:'0px 0px -5% 0px'});
  setTimeout(()=>$$('.rv:not(.in)').forEach(x=>x.classList.add('in')),6000);
}

/* ===== calculator (1 kg covers 5–6 m² per layer, from the label) ===== */
function calc(){
  const a=+$('#ka').value,pid=$('#kp').value;
  $('#kao').textContent=a+' m²';$('#ka').style.setProperty('--p',((a-5)/495*100)+'%');
  const mn=a*layers/6,mx=a*layers/5,nMn=Math.ceil(mn/5),nMx=Math.ceil(mx/5);
  $('#kr').textContent=`${mn.toFixed(1)} – ${mx.toFixed(1)}`;
  $('#kb').textContent=nMn===nMx?`${nMx}`:`${nMn} – ${nMx}`;
  const show=Math.min(nMx,8);
  $('#kbk').innerHTML=Array.from({length:show},(_,i)=>`<img src="${R(pid)}" alt="" style="animation-delay:${i*.05}s">`).join('')+(nMx>8?`<span style="align-self:center;margin-left:22px;color:var(--gold-hi)">+${nMx-8}</span>`:'');
}
$('#ka').addEventListener('input',calc);$('#kp').addEventListener('change',calc);
$('#kl').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;layers=+b.dataset.l;$$('#kl button').forEach(x=>x.setAttribute('aria-pressed',x===b));calc();});

/* ===== form ===== */
$('#fm').addEventListener('submit',e=>{
  e.preventDefault();
  const ph=$('#fp'),digits=ph.value.replace(/\D/g,'');
  if(digits.length<9){ph.setAttribute('aria-invalid','true');$('#fpe').textContent=t('f_err');ph.focus();return;}
  ph.removeAttribute('aria-invalid');$('#fpe').textContent='';
  const p=byId($('#fs').value);
  const msg=[t('f_hello'),`• ${t('f_prod')}: ${p?p.name:''}`,$('#fn').value&&`• ${t('f_name')}: ${$('#fn').value}`,`• ${t('f_phone')}: ${ph.value}`,$('#fm2').value&&`• ${$('#fm2').value}`].filter(Boolean).join('\n');
  const r=$('#res');r.hidden=false;r.innerHTML='';
  const ok=document.createElement('div');ok.className='ok';ok.textContent=t('f_hint');
  const pre=document.createElement('pre');pre.textContent=msg;
  const row=document.createElement('div');row.className='row';
  const cp=document.createElement('button');cp.type='button';cp.className='btn btn-line btn-sm';cp.style.color='#fff';cp.textContent=t('f_copy');
  cp.onclick=()=>{(navigator.clipboard?navigator.clipboard.writeText(msg):Promise.reject()).then(()=>cp.textContent=t('f_copied')).catch(()=>{const g=document.createRange();g.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(g);});};
  row.append(cp);
  if(CONFIG.telegram){const a=document.createElement('a');a.className='btn btn-gold btn-sm';a.target='_blank';a.rel='noopener';a.href=`https://t.me/${CONFIG.telegram}?text=${encodeURIComponent(msg)}`;a.textContent=t('f_tg');row.append(a);}
  r.append(ok,pre,row);
});
$('#fp').addEventListener('input',()=>{$('#fp').removeAttribute('aria-invalid');$('#fpe').textContent='';});

/* ===== hero: live 3D (falls back to the pre-rendered image) ===== */
const heroImg=$('#heroImg');
let hero3d=null;
function setHero(id){
  heroId=id;setHeroText();
  const p=byId(id);heroImg.src=R(id);heroImg.alt=p.name;
  if(hero3d)hero3d.show(id);
}
function initHero3D(){
  if(!window.THREE||!window.ASMO3D||!matchMedia('(min-width:1px)').matches)return;
  const viewer=$('#viewer');let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){return;}
  if(!renderer.getContext()){return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0,0);
  const cv=renderer.domElement;cv.setAttribute('aria-hidden','true');viewer.insertBefore(cv,viewer.querySelector('.chip'));
  const st=ASMO3D.stage(THREE,renderer),cam=st.cam;st.scene.environment&&0;
  const loader=new THREE.TextureLoader(),cache={};
  const isGL2=renderer.capabilities.isWebGL2,aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const tex=n=>cache[n]||(cache[n]=new Promise((ok,no)=>loader.load(`assets/tex/${n}.jpg`,x=>{x.encoding=THREE.sRGBEncoding;x.anisotropy=aniso;if(!isGL2){x.minFilter=THREE.LinearFilter;x.generateMipmaps=false;}ok(x);},undefined,no)));
  let group=null,rot=0,vel=0,dragging=false,lastX=0,idleAt=0,vis=true,anim=0,animDir=0,pending=null,sway=0,ready=false;
  const ELEV=.17,ZOOM=.9;
  function size(){const w=viewer.clientWidth,h=viewer.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);ASMO3D.frame(cam,w/h,ELEV,ZOOM);}
  size();new ResizeObserver(size).observe(viewer);
  async function build(id){
    const p=byId(id);const [f,b]=await Promise.all([tex(p.tex[0]),tex(p.tex[1])]);
    const g=ASMO3D.build(THREE,{front:f,back:b});g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;
  }
  async function show(id){
    pending=id;let g;try{g=await build(id);}catch(e){return;}
    if(pending!==id)return;
    const old=group;group=g;group.scale.setScalar(.001);st.scene.add(group);
    if(old){old.userData.out=true;setTimeout(()=>{st.scene.remove(old);old.traverse(o=>{if(o.geometry)o.geometry.dispose();});},400);}
    rot=0;vel=0;anim=0;animDir=1;
    if(!ready){ready=true;cv.classList.add('on');heroImg.classList.add('off');}
    if(reduce)group.scale.setScalar(1);
    draw();
  }
  const ease=x=>1-Math.pow(1-x,3);
  function draw(){
    if(!group)return;
    const home=Math.round(rot/(Math.PI*2))*Math.PI*2;
    if(!dragging){
      if(Math.abs(vel)>.0004){rot+=vel;vel*=.94;idleAt=performance.now();}
      else if(performance.now()-idleAt>900){rot+=(home-rot)*.045;}
    }
    sway=reduce||dragging?0:Math.sin(performance.now()/1900)*.16;
    group.rotation.y=rot+sway;
    if(animDir){anim=Math.min(1,anim+.045);group.scale.setScalar(.001+ease(anim));if(anim>=1)animDir=0;}
    renderer.render(st.scene,cam);
  }
  let raf=0;
  function loop(){raf=0;if(vis&&!document.hidden){draw();raf=requestAnimationFrame(loop);}}
  const kick=()=>{if(!raf)raf=requestAnimationFrame(loop);};
  new IntersectionObserver(es=>{vis=es[0].isIntersecting;if(vis)kick();}).observe(viewer);
  document.addEventListener('visibilitychange',kick);
  viewer.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;vel=0;viewer.setPointerCapture(e.pointerId);});
  viewer.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX;lastX=e.clientX;rot+=dx*.012;vel=dx*.012;});
  const up=()=>{dragging=false;idleAt=performance.now();};
  viewer.addEventListener('pointerup',up);viewer.addEventListener('pointercancel',up);
  viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')vel=-.14;if(e.key==='ArrowRight')vel=.14;});
  viewer.tabIndex=0;viewer.setAttribute('role','img');viewer.setAttribute('aria-label','ASMO 3D');
  hero3d={show};show(heroId);kick();
}

/* ===== init ===== */
try{const s=localStorage.getItem('asmo-lang');if(s&&T[s])lang=s;}catch(_){}
renderStatic();setLucidaImages();
if(rvObs)$$('.rv').forEach(x=>rvObs.observe(x));
if(document.readyState==='complete')initHero3D();else addEventListener('load',initHero3D);
})();
