package uz.jarvis.app

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Claude bilan suhbat va vositalarni chaqirish sikli. */
object Brain {
    class ApiError(val status: Int, msg: String) : Exception(msg)

    private val history = JSONArray()

    private fun system(): String {
        val now = SimpleDateFormat("EEEE, d MMMM yyyy, HH:mm", Locale("uz")).format(Date())
        val mem = Prefs.memory.lines().filter { it.isNotBlank() }.joinToString("; ").ifEmpty { "bo'sh" }
        return """Sen Jarvis — foydalanuvchining shaxsiy AI yordamchisisan (Tony Stark'dagi Jarvis kabi): aqlli, tezkor, ozgina quruq hazilli, "ser" deb murojaat qilasan. Sen foydalanuvchining Android telefonida ishlaysan va uni vositalar orqali boshqara olasan.
Javoblar OVOZDA o'qiladi: foydalanuvchi tilida (asosan o'zbek lotin), qisqa, oddiy matn, markdown va ro'yxat belgilarisiz.
Vositalardan so'ramasdan foydalan; bir nechta ish so'ralsa, hammasini bajar.
Qo'ng'iroq va SMS vositalari foydalanuvchidan ovozli tasdiq so'raydi: vosita "Tasdiq so'ralmoqda" desa, faqat berilgan savolni takrorla, boshqa hech narsa qilma.
Boshqa ilovalarda ish bajarish uchun: open_app, so'ng screen_read (ekranni o'qi), tap_text/tap_xy (bos), type_text (yoz), press (orqaga/uy), scroll. Har qadamdan keyin screen_read bilan natijani tekshir. Ilova ochilgach 1-2 soniya wait qil.
Faktlar, yangiliklar, narxlar uchun internetdan qidir. Foydalanuvchi haqida doimiy foydali narsani bilsang, remember bilan saqla.
Hozir: $now.
Xotira: $mem."""
    }

    fun record(user: String, outcome: String) {
        history.put(JSONObject().put("role", "user").put("content", user))
        history.put(JSONObject().put("role", "assistant").put("content", outcome))
    }

    private fun isRealUser(m: JSONObject): Boolean {
        if (m.optString("role") != "user") return false
        val c = m.opt("content")
        if (c is JSONArray) {
            for (i in 0 until c.length()) {
                if (c.optJSONObject(i)?.optString("type") == "tool_result") return false
            }
        }
        return true
    }

    private fun trim() {
        while (history.length() > 0 && (history.length() > 24 || !isRealUser(history.getJSONObject(0)))) {
            history.remove(0)
        }
    }

    fun ask(text: String, key: String): String {
        val mark = history.length()
        history.put(JSONObject().put("role", "user").put("content", text))
        trim()
        var web = Prefs.web
        var guard = 0
        try {
            while (guard++ < 16) {
                val body = JSONObject()
                    .put("model", Prefs.model)
                    .put("max_tokens", 1024)
                    .put("system", system())
                    .put("messages", history)
                    .put("tools", Tools.defs(web))
                val resp = try {
                    post(key, body)
                } catch (e: ApiError) {
                    if (web && e.status == 400) {
                        web = false
                        continue
                    }
                    throw e
                }
                val content = resp.getJSONArray("content")
                history.put(JSONObject().put("role", "assistant").put("content", content))
                val sb = StringBuilder()
                val uses = ArrayList<JSONObject>()
                for (i in 0 until content.length()) {
                    val b = content.getJSONObject(i)
                    when (b.optString("type")) {
                        "text" -> sb.append(b.optString("text"))
                        "tool_use" -> uses.add(b)
                    }
                }
                if (resp.optString("stop_reason") == "pause_turn") continue
                if (uses.isEmpty()) return sb.toString().trim().ifEmpty { "Bajarildi, ser." }
                if (sb.isNotBlank()) Jarvis.say(sb.toString().trim())
                val results = JSONArray()
                for (u in uses) {
                    Jarvis.updateStatus("Bajaryapman: " + u.optString("name"))
                    val out = try {
                        Tools.run(u.getString("name"), u.optJSONObject("input") ?: JSONObject())
                    } catch (e: Throwable) {
                        "Xatolik: ${e.message}"
                    }
                    results.put(
                        JSONObject().put("type", "tool_result")
                            .put("tool_use_id", u.getString("id"))
                            .put("content", out.take(8000))
                    )
                }
                history.put(JSONObject().put("role", "user").put("content", results))
            }
            return "Bajarildi."
        } catch (e: Exception) {
            while (history.length() > mark) history.remove(history.length() - 1)
            throw e
        }
    }

    private fun post(key: String, body: JSONObject): JSONObject {
        val c = URL("https://api.anthropic.com/v1/messages").openConnection() as HttpURLConnection
        c.requestMethod = "POST"
        c.connectTimeout = 15000
        c.readTimeout = 90000
        c.doOutput = true
        c.setRequestProperty("content-type", "application/json")
        c.setRequestProperty("x-api-key", key)
        c.setRequestProperty("anthropic-version", "2023-06-01")
        c.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        val code = c.responseCode
        val stream = if (code in 200..299) c.inputStream else c.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
        if (code !in 200..299) {
            val m = try {
                JSONObject(text).getJSONObject("error").getString("message")
            } catch (e: Exception) {
                text.take(200)
            }
            val hint = if (code == 401) " (kalit noto'g'ri)" else ""
            throw ApiError(code, "API $code$hint $m")
        }
        return JSONObject(text)
    }
}
