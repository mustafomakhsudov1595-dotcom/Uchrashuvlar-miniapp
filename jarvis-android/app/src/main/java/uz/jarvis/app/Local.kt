package uz.jarvis.app

import org.json.JSONObject

/** Kalitsiz (offlayn) oddiy buyruqlar. */
object Local {
    private val I = RegexOption.IGNORE_CASE

    private class Rule(val re: Regex, val f: (MatchResult) -> Pair<String, JSONObject>)

    private fun j(vararg p: Pair<String, Any>): JSONObject {
        val o = JSONObject()
        p.forEach { o.put(it.first, it.second) }
        return o
    }

    private val rules = listOf(
        Rule(Regex("^(salom|assalomu alaykum|assalom|hello|hi)\\b", I)) { "__say" to j("text" to "Salom, ser! Qanday yordam beray?") },
        Rule(Regex("(rahmat|thanks|thank you)", I)) { "__say" to j("text" to "Marhamat, ser.") },
        Rule(Regex("^(.+?)(?:ga|ni)?\\s+(?:qo'?ng'?iroq|telefon|call)", I)) { "call" to j("who" to it.groupValues[1].trim()) },
        Rule(Regex("^(.+?)(?:ga)?\\s+sms\\s*(?:yoz|yubor)?\\s*(.*)$", I)) { "sms" to j("who" to it.groupValues[1].trim(), "text" to it.groupValues[2].trim()) },
        Rule(Regex("^(.+?)(?:ni)?\\s+(?:och|ochib ber|ishga tushir)\\b", I)) { "open_app" to j("name" to it.groupValues[1].trim()) },
        Rule(Regex("(chiroq|fonar).*(o'ch|off)", I)) { "torch" to j("on" to false) },
        Rule(Regex("(chiroq|fonar)", I)) { "torch" to j("on" to true) },
        Rule(Regex("^(?=.*(?:taymer|timer)).*?(\\d+)\\s*(daqiqa|soat|soniya)", I)) {
            val n = it.groupValues[1].toInt()
            val s = when (it.groupValues[2].lowercase()) { "soat" -> n * 3600; "daqiqa" -> n * 60; else -> n }
            "timer" to j("seconds" to s)
        },
        Rule(Regex("^(?=.*(?:budilnik|uyg'?ot)).*?(\\d{1,2})[:. ](\\d{2})", I)) { "alarm" to j("hour" to it.groupValues[1].toInt(), "minutes" to it.groupValues[2].toInt()) },
        Rule(Regex("ovoz.*?(\\d{1,3})", I)) { "volume" to j("level" to it.groupValues[1].toInt()) },
        Rule(Regex("ovoz.*(ko'tar|oshir|balandla)", I)) { "volume_adjust" to j("direction" to "up") },
        Rule(Regex("ovoz.*(pasayt|kamayt|pasa)", I)) { "volume_adjust" to j("direction" to "down") },
        Rule(Regex("(batareya|zaryad)", I)) { "battery" to j() },
        Rule(Regex("ob-?havo\\s*(.*)", I)) { "weather" to j("city" to it.groupValues[1].trim()) },
    )

    fun run(text: String): String {
        for (r in rules) {
            val m = r.re.find(text) ?: continue
            val (name, args) = r.f(m)
            if (name == "__say") return args.getString("text")
            val out = Tools.run(name, args)
            return if (out.startsWith(Tools.CONFIRM)) out.substringAfter('"').substringBeforeLast('"') else out
        }
        return "Tushunmadim. ⚙ Sozlamalarda Claude API kalitini kiriting — shunda har qanday buyruqni tushunaman."
    }
}
