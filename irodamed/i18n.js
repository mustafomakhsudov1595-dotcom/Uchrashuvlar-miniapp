/* Irodamed — 4 tilli interfeys: O'zbekcha (uz), Русский (ru), Қазақша (kk), English (en).
   HTML'da uz matni turadi (JS'siz ham o'qiladi). Boshqa tilga o'tilganda data-i18n kalitlari bo'yicha almashtiriladi. */
(function () {
  'use strict';
  var LANGS = ['uz', 'ru', 'kk', 'en'];
  var KEY = 'irodamed-lang';
  var A = "<a href=\"tel:+998951701011\">+998 95 170-10-11</a>";

  // kalit: [uz, ru, kk, en]
  var D = {
    'meta.title': ["Irodamed — Medical Clinic Center | Toshkent", "Irodamed — Medical Clinic Center | Ташкент", "Irodamed — Medical Clinic Center | Ташкент", "Irodamed — Medical Clinic Center | Tashkent"],
    'meta.desc': [
      "Irodamed — tibbiyot markazi (Toshkent, Olmazor tumani, Sebzor): UZI, Doppler, exokardiografiya, EKG, elastografiya, kolposkopiya, laboratoriya va mutaxassislar qabuli. Narxlar ro'yxati. Tel: +998 95 170-10-11, +998 90 021-46-46.",
      "Irodamed — медицинский центр (Ташкент, Алмазарский район, Себзор): УЗИ, допплер, эхокардиография, ЭКГ, эластография, кольпоскопия, лаборатория и приём специалистов. Прайс-лист. Тел.: +998 95 170-10-11, +998 90 021-46-46.",
      "Irodamed — медициналық орталық (Ташкент, Алмазар ауданы, Себзор): УДЗ, допплер, эхокардиография, ЭКГ, эластография, кольпоскопия, зертхана және мамандар қабылдауы. Бағалар тізімі. Тел.: +998 95 170-10-11, +998 90 021-46-46.",
      "Irodamed — medical center in Tashkent (Olmazor district, Sebzor): ultrasound, Doppler, echocardiography, ECG, elastography, colposcopy, laboratory and specialist consultations. Price list. Tel: +998 95 170-10-11, +998 90 021-46-46."],

    'aria.logo': ["Irodamed — bosh sahifa", "Irodamed — главная страница", "Irodamed — басты бет", "Irodamed — home"],
    'aria.menu': ["Asosiy menyu", "Главное меню", "Басты мәзір", "Main menu"],
    'aria.burger': ["Menyuni ochish", "Открыть меню", "Мәзірді ашу", "Open menu"],
    'aria.lang': ["Tilni tanlash", "Выбор языка", "Тілді таңдау", "Choose language"],
    'aria.call': ["Qo'ng'iroq qilish", "Позвонить", "Қоңырау шалу", "Call us"],

    'nav.svc': ["Xizmatlar", "Услуги", "Қызметтер", "Services"],
    'nav.docs': ["Shifokorlar", "Врачи", "Дәрігерлер", "Doctors"],
    'nav.price': ["Narxlar", "Цены", "Бағалар", "Prices"],
    'nav.spec': ["Mutaxassislar", "Специалисты", "Мамандар", "Specialists"],
    'nav.contact': ["Aloqa", "Контакты", "Байланыс", "Contact"],

    'hero.h1': ["Tibbiyot va diagnostika markazi", "Медицинский и диагностический центр", "Медициналық және диагностикалық орталық", "Medical and diagnostic center"],
    'hero.lead': ["UZI, Doppler, exokardiografiya, EKG, laboratoriya va tor mutaxassislar qabuli.", "УЗИ, допплер, эхокардиография, ЭКГ, лаборатория и приём узких специалистов.", "УДЗ, допплер, эхокардиография, ЭКГ, зертхана және тар мамандар қабылдауы.", "Ultrasound, Doppler, echocardiography, ECG, laboratory and consultations with specialists."],
    'hero.call': ["Qo'ng'iroq qilish", "Позвонить", "Қоңырау шалу", "Call us"],
    'hero.addr': ["Manzil va aloqa", "Адрес и контакты", "Мекенжай және байланыс", "Address and contacts"],
    'lbl.addr': ["Manzil", "Адрес", "Мекенжай", "Address"],
    'lbl.hours': ["Ish vaqti", "Время работы", "Жұмыс уақыты", "Opening hours"],
    'lbl.phone': ["Telefon", "Телефон", "Телефон", "Phone"],
    'addr.hero': [
      "Toshkent shahri, Olmazor tumani<br>Sebzor G'afur G'ulom ko'chasi,<br>Ts-17-18, 2B-uy",
      "г. Ташкент, Алмазарский район<br>Себзор, ул. Гафура Гуляма,<br>Ц-17-18, дом 2Б",
      "Ташкент қ., Алмазар ауданы<br>Себзор, Ғафур Ғұлам көшесі,<br>Ц-17-18, 2Б үй",
      "Tashkent, Olmazor district<br>Sebzor, G'afur G'ulom street,<br>Ts-17-18, building 2B"],
    'addr.contact': [
      "Toshkent shahri, Olmazor tumani,<br>Sebzor G'afur G'ulom ko'chasi,<br>Ts-17-18, 2B-uy",
      "г. Ташкент, Алмазарский район,<br>Себзор, ул. Гафура Гуляма,<br>Ц-17-18, дом 2Б",
      "Ташкент қ., Алмазар ауданы,<br>Себзор, Ғафур Ғұлам көшесі,<br>Ц-17-18, 2Б үй",
      "Tashkent, Olmazor district,<br>Sebzor, G'afur G'ulom street,<br>Ts-17-18, building 2B"],
    'addr.full': [
      "Toshkent shahri, Olmazor tumani, Sebzor G'afur G'ulom ko'chasi, Ts-17-18, 2B-uy",
      "г. Ташкент, Алмазарский район, Себзор, ул. Гафура Гуляма, Ц-17-18, дом 2Б",
      "Ташкент қ., Алмазар ауданы, Себзор, Ғафур Ғұлам көшесі, Ц-17-18, 2Б үй",
      "Tashkent, Olmazor district, Sebzor, G'afur G'ulom street, Ts-17-18, building 2B"],
    'addr.copy': [
      "Toshkent shahri, Olmazor tumani, Sebzor G'afur G'ulom ko'chasi, Ts-17-18, 2B-uy (mo'ljal: Usta Alim, 2A)",
      "г. Ташкент, Алмазарский район, Себзор, ул. Гафура Гуляма, Ц-17-18, дом 2Б (ориентир: Уста Алим, 2А)",
      "Ташкент қ., Алмазар ауданы, Себзор, Ғафур Ғұлам көшесі, Ц-17-18, 2Б үй (бағдар: Уста Алим, 2А)",
      "Tashkent, Olmazor district, Sebzor, G'afur G'ulom street, Ts-17-18, building 2B (landmark: Usta Alim, 2A)"],
    'addr.sheet': [
      "Irodamed — Sebzor G'afur G'ulom ko'chasi, Ts-17-18, 2B-uy, Toshkent",
      "Irodamed — Себзор, ул. Гафура Гуляма, Ц-17-18, дом 2Б, Ташкент",
      "Irodamed — Себзор, Ғафур Ғұлам көшесі, Ц-17-18, 2Б үй, Ташкент",
      "Irodamed — Sebzor, G'afur G'ulom street, Ts-17-18, building 2B, Tashkent"],
    'hours.hero': [
      "Du–Ju 8:00–17:00<br>Shanba 8:00–16:00<br>Yakshanba — dam olish kuni",
      "Пн–Пт 8:00–17:00<br>Суббота 8:00–16:00<br>Воскресенье — выходной",
      "Дс–Жм 8:00–17:00<br>Сенбі 8:00–16:00<br>Жексенбі — демалыс күні",
      "Mon–Fri 8:00–17:00<br>Saturday 8:00–16:00<br>Sunday — closed"],
    'hours.mf': ["Dushanba – Juma", "Понедельник – пятница", "Дүйсенбі – жұма", "Monday – Friday"],
    'hours.sat': ["Shanba", "Суббота", "Сенбі", "Saturday"],
    'hours.sun': ["Yakshanba", "Воскресенье", "Жексенбі", "Sunday"],
    'hours.off': ["Dam olish kuni", "Выходной", "Демалыс күні", "Closed"],

    // Xizmatlar
    'svc.h2': ["Xizmatlar", "Услуги", "Қызметтер", "Services"],
    'svc.ecg.t': ["EKG", "ЭКГ", "ЭКГ", "ECG"],
    'svc.ecg.p': ["Elektrokardiografiya", "Электрокардиография", "Электрокардиография", "Electrocardiography"],
    'svc.kolpo.t': ["Kolposkopiya", "Кольпоскопия", "Кольпоскопия", "Colposcopy"],
    'svc.kolpo.p': ["Ginekologik ko'rik", "Гинекологический осмотр", "Гинекологиялық тексеру", "Gynecological examination"],
    'svc.exoeg.t': ["Exo-EG", "Эхо-ЭГ", "Эхо-ЭГ", "Echo-EG"],
    'svc.exoeg.p': ["Bosh miyaning ultratovush tekshiruvi", "Ультразвуковое исследование головного мозга", "Бас миының ультрадыбыстық зерттеуі", "Ultrasound of the brain"],
    'svc.uzi.t': ["UZI", "УЗИ", "УДЗ", "Ultrasound"],
    'svc.uzi.p': ["Ultratovush tekshiruvi — barcha a'zolar", "Ультразвуковое исследование — все органы", "Ультрадыбыстық зерттеу — барлық ағзалар", "Ultrasound examination — all organs"],
    'svc.doppler.t': ["Doppler", "Допплер", "Допплер", "Doppler"],
    'svc.doppler.p': ["Qon oqimini tekshirish — barcha a'zolar", "Исследование кровотока — все органы", "Қан ағымын зерттеу — барлық ағзалар", "Blood flow examination — all organs"],
    'svc.echo.t': ["Exokardiografiya", "Эхокардиография", "Эхокардиография", "Echocardiography"],
    'svc.echo.p': ["Yurak ultratovush tekshiruvi", "УЗИ сердца", "Жүректің ультрадыбыстық зерттеуі", "Heart ultrasound"],
    'svc.elasto.t': ["Elastografiya", "Эластография", "Эластография", "Elastography"],
    'svc.elasto.p': ["Jigar, ko'krak, qalqonsimon bez", "Печень, молочная железа, щитовидная железа", "Бауыр, сүт безі, қалқанша без", "Liver, breast, thyroid"],
    'svc.lab.t': ["Laboratoriya", "Лаборатория", "Зертхана", "Laboratory"],
    'svc.lab.p': ["Laboratoriya xizmatlari", "Лабораторные услуги", "Зертханалық қызметтер", "Laboratory services"],
    'svc.massage.t': ["Bolalar massaji", "Детский массаж", "Балалар массажы", "Children's massage"],
    'svc.massage.p': ["Bolalar uchun massaj", "Массаж для детей", "Балаларға арналған массаж", "Massage for children"],

    // modal tavsifi
    'svc.exoeg.d': ["Bosh miyaning ultratovush tekshiruvi.", "Ультразвуковое исследование головного мозга.", "Бас миының ультрадыбыстық зерттеуі.", "Ultrasound examination of the brain."],
    'svc.exoeg.f1': ["Nurlanishsiz, og'riqsiz tekshiruv", "Без излучения и боли", "Сәулеленусіз, ауыртпайтын тексеру", "No radiation, painless"],
    'svc.exoeg.f2': ["Bosh miya tuzilmalarini ultratovush bilan baholaydi", "Оценка структур головного мозга с помощью ультразвука", "Бас ми құрылымдарын ультрадыбыспен бағалайды", "Evaluates brain structures with ultrasound"],
    'svc.uzi.d': ["Ultratovush tekshiruvi — barcha a'zolar.", "Ультразвуковое исследование — все органы.", "Ультрадыбыстық зерттеу — барлық ағзалар.", "Ultrasound examination — all organs."],
    'svc.uzi.f1': ["Nurlanishsiz, og'riqsiz tekshiruv", "Без излучения и боли", "Сәулеленусіз, ауыртпайтын тексеру", "No radiation, painless"],
    'svc.uzi.f2': ["Natija tekshiruv vaqtida ma'lum bo'ladi", "Результат известен во время исследования", "Нәтиже тексеру кезінде белгілі болады", "Results are available during the exam"],
    'svc.doppler.d': ["Qon oqimini ultratovush bilan tekshirish — barcha a'zolar.", "Исследование кровотока с помощью ультразвука — все органы.", "Қан ағымын ультрадыбыспен зерттеу — барлық ағзалар.", "Ultrasound examination of blood flow — all organs."],
    'svc.doppler.f1': ["Qon tomirlardagi qon oqimini baholaydi", "Оценивает кровоток в сосудах", "Қан тамырларындағы қан ағымын бағалайды", "Assesses blood flow in the vessels"],
    'svc.doppler.f2': ["Nurlanishsiz, og'riqsiz tekshiruv", "Без излучения и боли", "Сәулеленусіз, ауыртпайтын тексеру", "No radiation, painless"],
    'svc.echo.d': ["Yurak ultratovush tekshiruvi.", "Ультразвуковое исследование сердца.", "Жүректің ультрадыбыстық зерттеуі.", "Ultrasound examination of the heart."],
    'svc.echo.f1': ["Yurak kameralari va qopqoqlari holatini ko'rsatadi", "Показывает состояние камер и клапанов сердца", "Жүрек камералары мен қақпақшаларының жағдайын көрсетеді", "Shows the condition of heart chambers and valves"],
    'svc.echo.f2': ["Nurlanishsiz, og'riqsiz tekshiruv", "Без излучения и боли", "Сәулеленусіз, ауыртпайтын тексеру", "No radiation, painless"],
    'svc.ecg.d': ["Elektrokardiografiya — yurak ritmini baholash.", "Электрокардиография — оценка ритма сердца.", "Электрокардиография — жүрек ырғағын бағалау.", "Electrocardiography — assessment of the heart rhythm."],
    'svc.ecg.f1': ["Bir necha daqiqa davom etadi", "Длится несколько минут", "Бірнеше минутқа созылады", "Takes a few minutes"],
    'svc.ecg.f2': ["Og'riqsiz va xavfsiz", "Безболезненно и безопасно", "Ауыртпайды және қауіпсіз", "Painless and safe"],
    'svc.elasto.d': ["Jigar, ko'krak, qalqonsimon bez — to'qimalar qattiqligini baholash.", "Печень, молочная железа, щитовидная железа — оценка плотности тканей.", "Бауыр, сүт безі, қалқанша без — ұлпалардың тығыздығын бағалау.", "Liver, breast, thyroid — assessment of tissue stiffness."],
    'svc.elasto.f1': ["Ultratovush asosida bajariladi", "Выполняется на основе ультразвука", "Ультрадыбыс негізінде орындалады", "Performed using ultrasound"],
    'svc.elasto.f2': ["Jigar, ko'krak va qalqonsimon bez uchun", "Для печени, молочной и щитовидной желёз", "Бауыр, сүт және қалқанша без үшін", "For the liver, breast and thyroid"],
    'svc.kolpo.d': ["Ginekologik ko'rik.", "Гинекологический осмотр.", "Гинекологиялық тексеру.", "Gynecological examination."],
    'svc.kolpo.f1': ["Bachadon bo'ynini maxsus asbob bilan kattalashtirib ko'rish", "Осмотр шейки матки с увеличением специальным прибором", "Жатыр мойнын арнайы құралмен ұлғайтып қарау", "Magnified examination of the cervix with a special instrument"],
    'svc.kolpo.f2': ["Ginekolog tomonidan o'tkaziladi", "Проводит гинеколог", "Гинеколог жүргізеді", "Performed by a gynecologist"],
    'svc.lab.d': ["Laboratoriya xizmatlari.", "Лабораторные услуги.", "Зертханалық қызметтер.", "Laboratory services."],
    'svc.lab.f1': ["Qon tahlili va boshqa tekshiruvlar", "Анализ крови и другие исследования", "Қан талдауы және басқа зерттеулер", "Blood tests and other examinations"],
    'svc.lab.f2': ["Tahlillar ro'yxati va narxlari — «Narxlar» bo'limida", "Перечень анализов и цены — в разделе «Цены»", "Талдаулар тізімі мен бағалары — «Бағалар» бөлімінде", "The test list and prices are in the Prices section"],
    'svc.massage.d': ["Bolalar uchun massaj.", "Массаж для детей.", "Балаларға арналған массаж.", "Massage for children."],
    'svc.massage.f1': ["Bolalar uchun xizmat", "Услуга для детей", "Балаларға арналған қызмет", "A service for children"],
    'svc.massage.f2': ["Qabul vaqtini markazdan aniqlang", "Время приёма уточняйте в центре", "Қабылдау уақытын орталықтан нақтылаңыз", "Ask the center for appointment times"],
    'svc.note': ["Tayyorgarlik bo'yicha qo'ng'iroq qiling yoki narxlarni ko'ring.", "Подготовку к исследованию уточняйте по телефону или смотрите цены.", "Дайындық бойынша қоңырау шалыңыз немесе бағаларды қараңыз.", "Call us about preparation or view the prices."],
    'svc.prices': ["Narxlarni ko'rish", "Смотреть цены", "Бағаларды көру", "View prices"],

    'stage.aria': ["Xizmatlar bo'yicha 3D model", "3D-модель по услугам", "Қызметтер бойынша 3D-модель", "3D model of services"],
    'stage.canvas': ["Tanlangan xizmatning 3D modeli. Sudrab aylantirish mumkin.", "3D-модель выбранной услуги. Можно вращать, перетаскивая.", "Таңдалған қызметтің 3D-моделі. Сүйреп айналдыруға болады.", "3D model of the selected service. Drag to rotate."],
    'stage.hint': ["sudrab aylantiring", "потяните, чтобы повернуть", "бұру үшін сүйреңіз", "drag to rotate"],
    'stage.tabs': ["Model turi", "Тип модели", "Модель түрі", "Model type"],
    'cap.us': ["UZI · Doppler · Exo-EG · Elastografiya", "УЗИ · Допплер · Эхо-ЭГ · Эластография", "УДЗ · Допплер · Эхо-ЭГ · Эластография", "Ultrasound · Doppler · Echo-EG · Elastography"],
    'cap.heart': ["EKG · Exokardiografiya", "ЭКГ · Эхокардиография", "ЭКГ · Эхокардиография", "ECG · Echocardiography"],
    'cap.lab': ["Laboratoriya", "Лаборатория", "Зертхана", "Laboratory"],
    'cap.colpo': ["Kolposkopiya", "Кольпоскопия", "Кольпоскопия", "Colposcopy"],
    'tab.us': ["UZI", "УЗИ", "УДЗ", "Ultrasound"],
    'tab.heart': ["Yurak", "Сердце", "Жүрек", "Heart"],
    'tab.lab': ["Laboratoriya", "Лаборатория", "Зертхана", "Laboratory"],
    'tab.colpo': ["Kolposkopiya", "Кольпоскопия", "Кольпоскопия", "Colposcopy"],

    // Shifokorlar
    'docs.h2': ["Shifokorlar", "Врачи", "Дәрігерлер", "Doctors"],
    'dn.1': ["Yadgorova Shaxlo Sultanovna", "Ядгорова Шахло Султановна", "Ядгорова Шахло Султановна", "Yadgorova Shaxlo Sultanovna"],
    'dn.2': ["Nosirova Ziyoda Ulug'bekovna", "Носирова Зиёда Улугбековна", "Носирова Зиёда Улугбековна", "Nosirova Ziyoda Ulug'bekovna"],
    'dn.3': ["Seydukova Aliya Faridunovna", "Сейдукова Алия Фаридуновна", "Сейдукова Алия Фаридуновна", "Seydukova Aliya Faridunovna"],
    'dn.4': ["Ismoilova Shaxina Baxramovna", "Исмоилова Шахина Бахрамовна", "Исмоилова Шахина Бахрамовна", "Ismoilova Shaxina Baxramovna"],
    'dn.5': ["Xolmanova Dildora Ismoilovna", "Холманова Дилдора Исмоиловна", "Холманова Дилдора Исмоиловна", "Xolmanova Dildora Ismoilovna"],
    'dn.6': ["Kosimov Saidakrom Olimjonovich", "Косимов Сайдакром Олимжонович", "Косимов Сайдакром Олимжонович", "Kosimov Saidakrom Olimjonovich"],
    'dn.7': ["Bakayev Iskandarbek Axrorovich", "Бакаев Искандарбек Ахрорович", "Бакаев Искандарбек Ахрорович", "Bakayev Iskandarbek Axrorovich"],
    'dn.8': ["Kadirova Umida Maxmudjonovna", "Кадирова Умида Махмуджоновна", "Кадирова Умида Махмуджоновна", "Kadirova Umida Maxmudjonovna"],
    'role.endo': ["Endokrinolog", "Эндокринолог", "Эндокринолог", "Endocrinologist"],
    'role.lor': ["LOR", "ЛОР", "ЛОР", "ENT specialist"],
    'role.neuro': ["Nevrolog-terapevt", "Невролог-терапевт", "Невролог-терапевт", "Neurologist, general practitioner"],
    'role.uro': ["Urolog", "Уролог", "Уролог", "Urologist"],
    'role.cardio': ["Kardiolog, terapevt", "Кардиолог, терапевт", "Кардиолог, терапевт", "Cardiologist, general practitioner"],
    'role.massage': ["Massaj", "Массажист", "Массажшы", "Massage therapist"],
    'doc.ask': ["Qabul vaqtini aniqlang", "Уточняйте время приёма", "Қабылдау уақытын нақтылаңыз", "Ask for appointment times"],
    'doc.daily': ["Har kuni", "Ежедневно", "Күн сайын", "Daily"],
    'docs.note': ["Qabul vaqtini oldindan aniqlang: " + A, "Время приёма уточняйте заранее: " + A, "Қабылдау уақытын алдын ала нақтылаңыз: " + A, "Please confirm appointment times in advance: " + A],

    // Mutaxassislar
    'spec.h2': ["Mutaxassislar", "Специалисты", "Мамандар", "Specialists"],
    'sp.1': ["Endokrinolog", "Эндокринолог", "Эндокринолог", "Endocrinologist"],
    'sp.2': ["Ginekolog", "Гинеколог", "Гинеколог", "Gynecologist"],
    'sp.3': ["LOR", "ЛОР", "ЛОР", "ENT specialist"],
    'sp.4': ["Urolog", "Уролог", "Уролог", "Urologist"],
    'sp.5': ["Androlog", "Андролог", "Андролог", "Andrologist"],
    'sp.6': ["Nevropatolog <small>bolalar va kattalar</small>", "Невропатолог <small>дети и взрослые</small>", "Невропатолог <small>балалар және ересектер</small>", "Neurologist <small>children and adults</small>"],
    'sp.7': ["Umumiy terapevt", "Общий терапевт", "Жалпы терапевт", "General practitioner"],
    'sp.8': ["Kardiolog-terapevt", "Кардиолог-терапевт", "Кардиолог-терапевт", "Cardiologist-therapist"],
    'spec.note': [
      "Qabul jadvali va yozilish uchun qo'ng'iroq qiling: " + A + " · <a href=\"#narxlar\">Narxlar</a>",
      "Расписание приёма и запись по телефону: " + A + " · <a href=\"#narxlar\">Цены</a>",
      "Қабылдау кестесі және жазылу үшін қоңырау шалыңыз: " + A + " · <a href=\"#narxlar\">Бағалар</a>",
      "Appointment schedule and booking: " + A + " · <a href=\"#narxlar\">Prices</a>"],

    // Aloqa
    'contact.h2': ["Aloqa", "Контакты", "Байланыс", "Contact"],
    'landmark': ["Mo'ljal: Usta Alim, 2A", "Ориентир: Уста Алим, 2А", "Бағдар: Уста Алим, 2А", "Landmark: Usta Alim, 2A"],
    'yandex': ["Yandex Maps'da aniq joylashuv", "Точное местоположение на Яндекс Картах", "Яндекс Карталарындағы нақты орны", "Exact location on Yandex Maps"],
    'copy': ["Manzilni nusxalash", "Скопировать адрес", "Мекенжайды көшіру", "Copy address"],
    'copied': ["Nusxalandi ✓", "Скопировано ✓", "Көшірілді ✓", "Copied ✓"],
    'map.btn': ["Xaritada ochish", "Открыть на карте", "Картада ашу", "Open in maps"],
    'map.title': ["Irodamed xaritada", "Irodamed на карте", "Irodamed картада", "Irodamed on the map"],
    'map.hit': ["Xaritani ilovada ochish", "Открыть карту в приложении", "Картаны қосымшада ашу", "Open the map in an app"],
    'sheet.title': ["Xaritada ochish", "Открыть на карте", "Картада ашу", "Open in maps"],
    'app.geo': ["Telefondagi xarita", "Карта в телефоне", "Телефондағы карта", "Phone map app"],
    'app.geo.s': ["Standart ilova", "Стандартное приложение", "Стандартты қосымша", "Default app"],
    'app.browser': ["Brauzer yoki ilova", "Браузер или приложение", "Браузер немесе қосымша", "Browser or app"],
    'app.exact': ["Aniq joylashuv", "Точное местоположение", "Нақты орны", "Exact location"],
    'close': ["Yopish", "Закрыть", "Жабу", "Close"],
    'foot.tag': ["Biz sizning sog'lig'ingizga g'ayg'uramiz", "Мы заботимся о вашем здоровье", "Біз сіздің денсаулығыңызға қамқорлық жасаймыз", "We care about your health"],

    // Narxlar
    'price.h2': ["Narxlar", "Цены", "Бағалар", "Prices"],
    'price.sub': ["Narxlar so'mda, 01.06.2026 holatiga.", "Цены в сумах, по состоянию на 01.06.2026.", "Бағалар сомда, 01.06.2026 жағдайына.", "Prices in UZS, as of 01.06.2026."],
    'price.ph': ["Xizmat yoki tahlil qidirish", "Поиск услуги или анализа", "Қызмет немесе талдау іздеу", "Search services or tests"],
    'price.clear': ["Tozalash", "Очистить", "Тазалау", "Clear"],
    'price.tabs': ["Narxlar bo'limlari", "Разделы цен", "Баға бөлімдері", "Price sections"],
    'price.empty': ["Hech narsa topilmadi. Aniq narxni qo'ng'iroq orqali bilib oling.", "Ничего не найдено. Уточните цену по телефону.", "Ештеңе табылмады. Бағасын телефон арқылы нақтылаңыз.", "Nothing found. Please call us to confirm the price."],
    'price.found': ["Topildi:", "Найдено:", "Табылды:", "Found:"],
    'price.name': ["Nomi", "Название", "Атауы", "Name"],
    'price.term': ["Muddat", "Срок", "Мерзімі", "Turnaround"],
    'price.cont': ["Idish / biomaterial", "Контейнер / биоматериал", "Контейнер / биоматериал", "Tube / specimen"],
    'price.price': ["Narx", "Цена", "Бағасы", "Price"],
    'price.unit': ["so'm", "сум", "сум", "UZS"],
    'price.note': [
      "Narxlar ma'lumot uchun berilgan va o'zgarishi mumkin. Aniq narx, tayyorgarlik va yozilish: " + A,
      "Цены приведены для информации и могут меняться. Точная цена, подготовка и запись: " + A,
      "Бағалар ақпарат үшін берілген және өзгеруі мүмкін. Нақты баға, дайындық және жазылу: " + A,
      "Prices are for reference and may change. For exact prices, preparation and booking call " + A],
    'price.nojs': ["Narxlarni ko'rish uchun JavaScript yoqilgan bo'lishi kerak. Narxlar uchun qo'ng'iroq qiling.", "Для просмотра цен нужен включённый JavaScript. Цены можно уточнить по телефону.", "Бағаларды көру үшін JavaScript қосылған болуы керек. Бағаны телефон арқылы нақтылаңыз.", "JavaScript is required to view prices. Please call us for prices."],

    // 404
    'nf.title': ["Sahifa topilmadi | Irodamed", "Страница не найдена | Irodamed", "Бет табылмады | Irodamed", "Page not found | Irodamed"],
    'nf.eyebrow': ["Xato 404", "Ошибка 404", "404 қатесі", "Error 404"],
    'nf.h1': ["Sahifa topilmadi", "Страница не найдена", "Бет табылмады", "Page not found"],
    'nf.p': ["Siz izlagan sahifa mavjud emas yoki ko'chirilgan. Bosh sahifaga qayting yoki bizga qo'ng'iroq qiling: +998 95 170-10-11.", "Такой страницы нет или она перемещена. Вернитесь на главную или позвоните нам: +998 95 170-10-11.", "Сіз іздеген бет жоқ немесе басқа жерге көшірілген. Басты бетке оралыңыз немесе бізге қоңырау шалыңыз: +998 95 170-10-11.", "The page you are looking for does not exist or has moved. Go back to the home page or call us: +998 95 170-10-11."],
    'nf.btn': ["Bosh sahifaga qaytish", "На главную", "Басты бетке оралу", "Back to home"]
  };

  var NAMES = { uz: "UZ", ru: "RU", kk: "KZ", en: "EN" };
  var DAYS = {
    uz: ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha'],
    ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    kk: ['Жк', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };
  var lang = 'uz';

  function idx(l) { var i = LANGS.indexOf(l); return i < 0 ? 0 : i; }
  function t(k) { var v = D[k]; return v ? (v[idx(lang)] || v[0]) : k; }

  function dayUnit(n) {
    if (lang === 'ru') return n === 1 ? 'день' : (n >= 2 && n <= 4 ? 'дня' : 'дней');
    if (lang === 'kk') return 'күн';
    if (lang === 'en') return n === 1 ? 'day' : 'days';
    return 'kun';
  }
  // "3-4" -> "3–4 kun"
  function fmtDays(s) {
    if (!s) return '';
    var m = /^(\d+)(?:-(\d+))?$/.exec(s); if (!m) return s;
    var last = parseInt(m[2] || m[1], 10);
    return (m[2] ? m[1] + '–' + m[2] : m[1]) + ' ' + dayUnit(last);
  }
  function fmtPrice(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  // data-sch="2,4|8:30–12:30" -> "Se, Pay 8:30–12:30"; "*|10:00–14:30" -> "Har kuni 10:00–14:30"
  function sched(spec) {
    var p = spec.split('|'), d = p[0], time = p[1] || '';
    var label = d === '*' ? t('doc.daily') : d.split(',').map(function (n) { return DAYS[lang][+n]; }).join(', ');
    return label + ' ' + time;
  }

  function apply(root) {
    root = root || document;
    var i;
    var els = root.querySelectorAll('[data-i18n]');
    for (i = 0; i < els.length; i++) els[i].innerHTML = t(els[i].getAttribute('data-i18n'));
    els = root.querySelectorAll('[data-i18n-attr]');
    for (i = 0; i < els.length; i++) {
      els[i].getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var kv = pair.split(':'); if (kv.length === 2) this.setAttribute(kv[0], t(kv[1]).replace(/<[^>]+>/g, ''));
      }, els[i]);
    }
    els = root.querySelectorAll('[data-sch]');
    for (i = 0; i < els.length; i++) els[i].textContent = sched(els[i].getAttribute('data-sch'));
  }

  function chrome() {
    document.documentElement.lang = lang;
    if (document.getElementById('langCur')) document.getElementById('langCur').textContent = NAMES[lang];
    var bs = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < bs.length; i++) {
      var on = bs[i].getAttribute('data-lang') === lang;
      bs[i].setAttribute('aria-current', on ? 'true' : 'false');
    }
    // sarlavha va tavsif
    var title = document.querySelector('title');
    if (title) title.textContent = title.hasAttribute('data-i18n') ? t(title.getAttribute('data-i18n')) : t('meta.title');
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', t('meta.desc'));
  }

  function setLang(l, persist) {
    if (LANGS.indexOf(l) < 0) l = 'uz';
    lang = l;
    if (persist !== false) { try { localStorage.setItem(KEY, l); } catch (e) {} }
    apply(document); chrome();
    try { document.dispatchEvent(new CustomEvent('irodamed:lang', { detail: l })); } catch (e) {}
  }

  window.I18N = { t: t, setLang: setLang, apply: apply, fmtDays: fmtDays, fmtPrice: fmtPrice, get lang() { return lang; }, langs: LANGS };

  function start() {
    var l = 'uz';
    try {
      var q = /[?&]lang=(uz|ru|kk|en)\b/.exec(location.search);
      if (q) l = q[1]; else l = localStorage.getItem(KEY) || 'uz';
    } catch (e) {}
    if (LANGS.indexOf(l) < 0) l = 'uz';
    lang = l;
    if (l !== 'uz') { apply(document); chrome(); } else { chrome(); }
    // til menyusi
    var btn = document.getElementById('langBtn'), menu = document.getElementById('langMenu');
    if (btn && menu) {
      var close = function () { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', function (e) { e.stopPropagation(); var open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
      menu.addEventListener('click', function (e) { var b = e.target.closest('[data-lang]'); if (b) { setLang(b.getAttribute('data-lang')); close(); btn.focus(); } });
      document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
    }
    try { document.dispatchEvent(new CustomEvent('irodamed:lang', { detail: l })); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
