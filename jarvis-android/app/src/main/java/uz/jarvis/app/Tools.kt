package uz.jarvis.app

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.provider.AlarmClock
import android.provider.ContactsContract
import android.provider.Settings
import android.telephony.SmsManager
import android.view.KeyEvent
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.math.roundToInt

/** Telefonni boshqarish vositalari. */
object Tools {
    const val CONFIRM = "Tasdiq so'ralmoqda"
    private const val S = "string"
    private const val N = "number"
    private const val B = "boolean"

    class Fail(msg: String) : Exception(msg)

    private fun ctx(): Context = Jarvis.app
    private fun norm(s: String) = s.lowercase().replace(Regex("[’ʻʼ`‘´]"), "'").trim()
    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")

    /* ---------- Vosita ta'riflari (Claude uchun) ---------- */

    private fun tool(name: String, desc: String, vararg props: Pair<String, String>, req: List<String> = props.map { it.first }): JSONObject {
        val p = JSONObject()
        props.forEach { p.put(it.first, JSONObject().put("type", it.second)) }
        return JSONObject().put("name", name).put("description", desc)
            .put("input_schema", JSONObject().put("type", "object").put("properties", p).put("required", JSONArray(req)))
    }

    fun defs(web: Boolean): JSONArray {
        val a = JSONArray()
        fun t(name: String, desc: String, vararg props: Pair<String, String>, req: List<String> = props.map { it.first }) {
            a.put(tool(name, desc, *props, req = req))
        }
        t("call", "Telefon qo'ng'irog'i (kontakt nomi yoki raqam). Foydalanuvchidan ovozli tasdiq so'raladi.", "who" to S)
        t("sms", "SMS yuborish. Foydalanuvchidan ovozli tasdiq so'raladi.", "who" to S, "text" to S)
        t("whatsapp", "WhatsApp orqali xabar yuborish (Maxsus imkoniyatlar yoqilgan bo'lishi kerak). Tasdiq so'raladi.", "who" to S, "text" to S)
        t("find_contact", "Kontaktni qidirish", "name" to S)
        t("open_app", "Telefondagi ilovani nomi bo'yicha ochish (masalan Instagram, Kamera, Telegram)", "name" to S)
        t("open_url", "Havolani ochish", "url" to S)
        t("search", "Brauzerda Google qidiruvini ochish", "query" to S)
        t("youtube", "YouTube'da qidirish", "query" to S)
        t("maps", "Xaritada joy ko'rsatish", "query" to S)
        t("navigate", "Manzilga yo'l ko'rsatish", "query" to S)
        t("alarm", "Budilnik qo'yish (soat 0-23)", "hour" to N, "minutes" to N, req = listOf("hour"))
        t("timer", "Taymer (soniyalarda)", "seconds" to N)
        t("torch", "Chiroqni yoqish/o'chirish", "on" to B, req = listOf())
        t("volume", "Musiqa/media ovozini 0-100 foizga qo'yish", "level" to N)
        t("volume_adjust", "Ovozni oshirish yoki pasaytirish: direction = up yoki down", "direction" to S)
        t("media", "Media boshqaruvi: action = play_pause, next yoki previous", "action" to S)
        t("battery", "Batareya holati")
        t("settings", "Sozlama sahifasini ochish: wifi, bluetooth, display, sound, location, airplane, battery, apps, accessibility, main", "page" to S)
        t("note", "Daftarga yozib qo'yish", "text" to S)
        t("read_notes", "Daftarni o'qish")
        t("remember", "Foydalanuvchi haqidagi doimiy faktni xotiraga saqlash", "fact" to S)
        t("forget", "Xotiradan faktni o'chirish (kalit so'z bo'yicha)", "fact" to S)
        t("weather", "Ob-havo (shahar bo'sh bo'lsa Toshkent)", "city" to S, req = listOf())
        t("currency", "Valyuta konvertatsiyasi (USD, UZS, EUR, RUB…)", "amount" to N, "from" to S, "to" to S, req = listOf("from", "to"))
        t("screen_read", "Hozir ekranda turgan matn va tugmalarni o'qish (Maxsus imkoniyatlar kerak)")
        t("tap_text", "Ekrandagi matni yoki tavsifi bo'yicha elementni bosish", "text" to S)
        t("tap_xy", "Ekranda koordinata bo'yicha bosish (screen_read dagi x,y)", "x" to N, "y" to N)
        t("type_text", "Fokusdagi kiritish maydoniga matn yozish", "text" to S)
        t("press", "Tizim tugmasi: back, home, recents, notifications, quick_settings, lock", "key" to S)
        t("scroll", "Ekranni aylantirish: direction = down yoki up", "direction" to S)
        t("wait", "Kutish (soniya, eng ko'pi 10)", "seconds" to N)
        if (web) a.put(JSONObject().put("type", "web_search_20250305").put("name", "web_search").put("max_uses", 3))
        return a
    }

    /* ---------- Bajarish ---------- */

    fun run(name: String, a: JSONObject): String = try {
        exec(name, a)
    } catch (e: Fail) {
        e.message ?: "Xatolik"
    } catch (e: SecurityException) {
        "Ruxsat yo'q: ${e.message}. Ilovada 🛡 bo'limidan ruxsat bering."
    }

    private fun exec(name: String, a: JSONObject): String = when (name) {
        "call" -> {
            val (label, num) = resolve(a.getString("who"))
            confirmOr("$label ga qo'ng'iroq qilaymi?") { call(num, label) }
        }
        "sms" -> {
            val (label, num) = resolve(a.getString("who"))
            val text = a.getString("text")
            confirmOr("$label ga SMS yuboraymi: \"$text\"") { sms(num, text, label) }
        }
        "whatsapp" -> {
            val (label, num) = resolve(a.getString("who"))
            val text = a.getString("text")
            confirmOr("$label ga WhatsApp'da yuboraymi: \"$text\"") { whatsapp(num, text, label) }
        }
        "find_contact" -> {
            val r = findContacts(a.getString("name"))
            if (r.isEmpty()) "Topilmadi." else r.joinToString("\n") { "${it.first}: ${it.second}" }
        }
        "open_app" -> openApp(a.getString("name"))
        "open_url" -> { view(a.getString("url").let { if (it.startsWith("http")) it else "https://$it" }); "Ochilmoqda." }
        "search" -> { view("https://www.google.com/search?q=" + enc(a.getString("query"))); "Qidirilmoqda." }
        "youtube" -> { view("https://www.youtube.com/results?search_query=" + enc(a.getString("query"))); "YouTube ochilmoqda." }
        "maps" -> { view("https://www.google.com/maps/search/?api=1&query=" + enc(a.getString("query"))); "Xarita ochilmoqda." }
        "navigate" -> { view("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + enc(a.getString("query"))); "Yo'l ochilmoqda." }
        "alarm" -> {
            val h = a.getInt("hour"); val m = a.optInt("minutes", 0)
            start(Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR, h).putExtra(AlarmClock.EXTRA_MINUTES, m)
                .putExtra(AlarmClock.EXTRA_MESSAGE, "Jarvis").putExtra(AlarmClock.EXTRA_SKIP_UI, true))
            "Budilnik $h:${m.toString().padStart(2, '0')} ga qo'yildi."
        }
        "timer" -> {
            val s = a.getInt("seconds")
            start(Intent(AlarmClock.ACTION_SET_TIMER).putExtra(AlarmClock.EXTRA_LENGTH, s).putExtra(AlarmClock.EXTRA_SKIP_UI, true))
            "Taymer $s soniyaga qo'yildi."
        }
        "torch" -> torch(a.optBoolean("on", true))
        "volume" -> {
            val am = audio(); val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val lvl = a.getInt("level").coerceIn(0, 100)
            am.setStreamVolume(AudioManager.STREAM_MUSIC, (lvl * max / 100.0).roundToInt(), AudioManager.FLAG_SHOW_UI)
            "Ovoz $lvl%."
        }
        "volume_adjust" -> {
            val up = a.getString("direction").startsWith("up")
            audio().adjustStreamVolume(AudioManager.STREAM_MUSIC, if (up) AudioManager.ADJUST_RAISE else AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
            if (up) "Ovoz oshirildi." else "Ovoz pasaytirildi."
        }
        "media" -> {
            val code = when (a.getString("action")) {
                "next" -> KeyEvent.KEYCODE_MEDIA_NEXT
                "previous" -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
                else -> KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
            }
            audio().dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            audio().dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
            "Bajarildi."
        }
        "battery" -> {
            val bm = ctx().getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            "Batareya ${bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)}%${if (bm.isCharging) ", zaryadlanyapti" else ""}."
        }
        "settings" -> settings(a.getString("page"))
        "note" -> { Prefs.notes = (Prefs.notes + "\n" + a.getString("text")).trim(); "Yozib qo'ydim." }
        "read_notes" -> Prefs.notes.lines().filter { it.isNotBlank() }.mapIndexed { i, s -> "${i + 1}. $s" }.joinToString("\n").ifEmpty { "Daftar bo'sh." }
        "remember" -> { Prefs.memory = (Prefs.memory + "\n" + a.getString("fact")).trim(); "Esimda: ${a.getString("fact")}" }
        "forget" -> {
            val k = a.getString("fact").lowercase()
            val all = Prefs.memory.lines().filter { it.isNotBlank() }
            val keep = all.filter { !it.lowercase().contains(k) }
            Prefs.memory = keep.joinToString("\n")
            "${all.size - keep.size} ta yozuv o'chirildi."
        }
        "weather" -> weather(a.optString("city", ""))
        "currency" -> currency(a.optDouble("amount", 1.0), a.getString("from"), a.getString("to"))
        "screen_read" -> acc().readScreen()
        "tap_text" -> if (acc().tapText(a.getString("text"))) "Bosildi." else "Bunday element topilmadi. screen_read bilan ekranni qayta o'qing."
        "tap_xy" -> if (acc().tapAt(a.getDouble("x").toFloat(), a.getDouble("y").toFloat())) "Bosildi." else "Bosib bo'lmadi."
        "type_text" -> if (acc().typeText(a.getString("text"))) "Yozildi." else "Kiritish maydoni topilmadi (avval maydonni bosing)."
        "press" -> if (acc().press(a.getString("key"))) "Bajarildi." else "Bunday tugma yo'q."
        "scroll" -> if (acc().scroll(a.getString("direction"))) "Aylantirildi." else "Aylantiriladigan joy topilmadi."
        "wait" -> { Thread.sleep((a.optDouble("seconds", 1.0).coerceIn(0.0, 10.0) * 1000).toLong()); "Kutildi." }
        else -> "Noma'lum vosita: $name"
    }

    private fun acc(): JarvisAccessibility = JarvisAccessibility.instance
        ?: throw Fail("Ekranni boshqarish yoqilmagan. Ilovada 🛡 bo'limidan Maxsus imkoniyatlarni yoqing.")

    private fun confirmOr(question: String, action: () -> String): String {
        if (!Prefs.confirm) return action()
        Jarvis.pending = action
        return "$CONFIRM. Foydalanuvchiga faqat shuni ayt: \"$question\" Boshqa hech narsa qilma."
    }

    private fun start(i: Intent) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx().startActivity(i)
    }

    private fun view(url: String) = start(Intent(Intent.ACTION_VIEW, Uri.parse(url)))

    private fun audio() = ctx().getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private fun granted(p: String) = ctx().checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED

    /* ---------- Kontaktlar, qo'ng'iroq, SMS ---------- */

    private fun findContacts(q: String): List<Pair<String, String>> {
        if (!granted(Manifest.permission.READ_CONTACTS)) throw Fail("Kontaktlarga ruxsat yo'q. 🛡 bo'limidan ruxsat bering.")
        val qn = norm(q)
        val out = ArrayList<Pair<String, String>>()
        ctx().contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER),
            null, null, null
        )?.use { c ->
            while (c.moveToNext()) {
                val name = c.getString(0) ?: continue
                val num = c.getString(1) ?: continue
                val nn = norm(name)
                val first = nn.substringBefore(' ')
                if (nn.contains(qn) || (first.length >= 3 && qn.startsWith(first))) out.add(name to num)
            }
        }
        return out.distinctBy { it.second.filter(Char::isDigit) }
    }

    private fun resolve(who: String): Pair<String, String> {
        val digits = who.filter { it.isDigit() || it == '+' }
        if (digits.count { it.isDigit() } >= 5) return who to digits
        val found = findContacts(who)
        if (found.isEmpty()) throw Fail("\"$who\" kontaktlarda topilmadi.")
        val names = found.map { it.first }.distinct()
        if (names.size > 1) throw Fail("Bir nechta kontakt topildi: ${names.take(4).joinToString(", ")}. Aniqroq ayting.")
        return found[0]
    }

    private fun call(num: String, label: String): String {
        val i = if (granted(Manifest.permission.CALL_PHONE)) Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(num)))
        else Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + Uri.encode(num)))
        start(i)
        return "$label ga qo'ng'iroq qilinmoqda."
    }

    @Suppress("DEPRECATION")
    private fun smsManager(): SmsManager =
        if (Build.VERSION.SDK_INT >= 31) ctx().getSystemService(SmsManager::class.java) else SmsManager.getDefault()

    private fun sms(num: String, text: String, label: String): String {
        if (!granted(Manifest.permission.SEND_SMS)) throw Fail("SMS yuborishga ruxsat yo'q. 🛡 bo'limidan ruxsat bering.")
        val sm = smsManager()
        sm.sendMultipartTextMessage(num, null, sm.divideMessage(text), null, null)
        return "$label ga SMS yuborildi."
    }

    private fun whatsapp(num: String, text: String, label: String): String {
        var d = num.filter { it.isDigit() }
        if (d.length == 9) d = "998$d"
        view("https://wa.me/$d?text=" + enc(text))
        val svc = JarvisAccessibility.instance ?: return "WhatsApp ochildi, lekin yuborish uchun Maxsus imkoniyatlar kerak. Xabar tayyor turibdi."
        Thread.sleep(3500)
        for (w in listOf("Send", "Yuborish", "Отправить")) {
            if (svc.tapText(w)) return "$label ga WhatsApp xabari yuborildi."
        }
        return "WhatsApp ochildi, lekin yuborish tugmasi topilmadi. Xabar tayyor turibdi."
    }

    /* ---------- Ilovalar va sozlamalar ---------- */

    private val aliases = mapOf(
        "kamera" to "camera", "sozlamalar" to "settings", "telefon" to "phone", "xabarlar" to "messages",
        "soat" to "clock", "kalkulyator" to "calculator", "galereya" to "gallery", "kontaktlar" to "contacts",
        "xarita" to "maps", "brauzer" to "chrome", "pochta" to "gmail", "musiqa" to "music"
    )

    private fun openApp(name: String): String {
        val pm = ctx().packageManager
        val apps = pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
        val qs = listOfNotNull(norm(name), aliases[norm(name)])
        for (q in qs) {
            val hit = apps.firstOrNull { norm(it.loadLabel(pm).toString()) == q }
                ?: apps.firstOrNull { norm(it.loadLabel(pm).toString()).contains(q) }
            if (hit != null) {
                val i = pm.getLaunchIntentForPackage(hit.activityInfo.packageName) ?: continue
                start(i)
                Thread.sleep(1200)
                return "${hit.loadLabel(pm)} ochildi."
            }
        }
        return "\"$name\" ilovasi topilmadi."
    }

    private fun settings(page: String): String {
        val action = when (page.lowercase()) {
            "wifi" -> Settings.ACTION_WIFI_SETTINGS
            "bluetooth" -> Settings.ACTION_BLUETOOTH_SETTINGS
            "display" -> Settings.ACTION_DISPLAY_SETTINGS
            "sound" -> Settings.ACTION_SOUND_SETTINGS
            "location" -> Settings.ACTION_LOCATION_SOURCE_SETTINGS
            "airplane" -> Settings.ACTION_AIRPLANE_MODE_SETTINGS
            "battery" -> Settings.ACTION_BATTERY_SAVER_SETTINGS
            "apps" -> Settings.ACTION_APPLICATION_SETTINGS
            "accessibility" -> Settings.ACTION_ACCESSIBILITY_SETTINGS
            else -> Settings.ACTION_SETTINGS
        }
        start(Intent(action))
        return "Sozlama ochildi."
    }

    private fun torch(on: Boolean): String {
        val cm = ctx().getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val id = cm.cameraIdList.firstOrNull { cm.getCameraCharacteristics(it).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true }
            ?: throw Fail("Bu telefonda chiroq yo'q.")
        cm.setTorchMode(id, on)
        return if (on) "Chiroq yoqildi." else "Chiroq o'chirildi."
    }

    /* ---------- Internet: ob-havo, valyuta ---------- */

    private fun get(url: String): String {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 10000
        c.readTimeout = 15000
        return c.inputStream.bufferedReader().use { it.readText() }
    }

    private fun wx(c: Int) = when {
        c == 0 -> "ochiq"
        c < 4 -> "qisman bulutli"
        c < 50 -> "tuman"
        c < 70 -> "yomg'ir"
        c < 80 -> "qor"
        c < 90 -> "jala"
        else -> "momaqaldiroq"
    }

    private fun weather(city: String): String {
        var lat = 41.31; var lon = 69.28; var name = "Toshkent"
        if (city.isNotBlank()) {
            val g = JSONObject(get("https://geocoding-api.open-meteo.com/v1/search?name=${enc(city)}&count=1"))
            val r = g.optJSONArray("results")?.optJSONObject(0) ?: return "\"$city\" topilmadi."
            lat = r.getDouble("latitude"); lon = r.getDouble("longitude"); name = r.optString("name", city)
        }
        val w = JSONObject(get("https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=3"))
        val c = w.getJSONObject("current"); val d = w.getJSONObject("daily")
        val sb = StringBuilder("$name: hozir ${c.getDouble("temperature_2m").roundToInt()}° (his ${c.getDouble("apparent_temperature").roundToInt()}°), ${wx(c.getInt("weather_code"))}, shamol ${c.getDouble("wind_speed_10m").roundToInt()} km/soat.")
        val days = listOf("Bugun", "Ertaga", "Indinga")
        for (i in 0 until 3) {
            sb.append("\n${days[i]}: ${d.getJSONArray("temperature_2m_min").getDouble(i).roundToInt()}…${d.getJSONArray("temperature_2m_max").getDouble(i).roundToInt()}°, ${wx(d.getJSONArray("weather_code").getInt(i))}, yog'in ehtimoli ${d.getJSONArray("precipitation_probability_max").optInt(i)}%")
        }
        return sb.toString()
    }

    private fun currency(amount: Double, from: String, to: String): String {
        val f = from.uppercase(); val t = to.uppercase()
        val r = JSONObject(get("https://open.er-api.com/v6/latest/$f"))
        val rate = r.optJSONObject("rates")?.optDouble(t, Double.NaN) ?: Double.NaN
        if (rate.isNaN()) return "Valyuta kursini olib bo'lmadi."
        return "$amount $f = ${"%.2f".format(amount * rate)} $t (kurs ${"%.4f".format(rate)})"
    }
}
