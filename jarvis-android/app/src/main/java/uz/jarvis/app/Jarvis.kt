package uz.jarvis.app

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/** Jarvis yadrosi: buyruqni qabul qiladi, miyaga yuboradi, javobni ovozda aytadi. */
object Jarvis {
    data class Line(val who: String, val text: String)

    lateinit var app: Context
    private val main = Handler(Looper.getMainLooper())
    private val exec = Executors.newSingleThreadExecutor()

    val lines = CopyOnWriteArrayList<Line>()
    @Volatile var listener: ((Line) -> Unit)? = null
    @Volatile var statusListener: ((String) -> Unit)? = null
    @Volatile var onWorking: (() -> Unit)? = null
    @Volatile var onIdle: (() -> Unit)? = null
    @Volatile var working = false
    @Volatile var status = "Tayyor"

    /** Tasdiq kutilayotgan amal (qo'ng'iroq, SMS). */
    @Volatile var pending: (() -> String)? = null

    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private val queue = ArrayList<String>()
    private val speaking = AtomicInteger(0)

    private val yes = Regex("\\b(ha|xop|xo'p|ok|okey|yes|da|tasdiqla\\w*|yubor|bo'ladi|albatta|qil)\\b", RegexOption.IGNORE_CASE)
    private val no = Regex("\\b(yo'q|yoq|no|net|bekor|to'xta\\w*|kerak emas)\\b", RegexOption.IGNORE_CASE)

    fun init(c: Context) {
        if (::app.isInitialized) return
        app = c.applicationContext
        Prefs.init(app)
        initTts()
    }

    private fun initTts() {
        tts = TextToSpeech(app) { st ->
            val t = tts
            if (st != TextToSpeech.SUCCESS || t == null) return@TextToSpeech
            pickLanguage(t)
            t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) { spoke() }
                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) { spoke() }
            })
            ttsReady = true
            synchronized(queue) {
                queue.forEach { speakNow(it) }
                queue.clear()
            }
        }
    }

    /** O'zbekcha ovoz bo'lmasa turkcha, keyin ruscha, keyin inglizcha. */
    private fun pickLanguage(t: TextToSpeech) {
        val p = Prefs.lang.split("-")
        val cands = listOf(
            Locale(p[0], p.getOrElse(1) { "" }),
            Locale("uz", "UZ"), Locale("tr", "TR"), Locale("ru", "RU"), Locale.ENGLISH
        )
        for (l in cands) {
            if (t.isLanguageAvailable(l) >= TextToSpeech.LANG_AVAILABLE) {
                t.language = l
                return
            }
        }
    }

    private fun speakNow(text: String) {
        val t = tts ?: return
        speaking.incrementAndGet()
        val r = t.speak(text.take(800), TextToSpeech.QUEUE_ADD, null, "u" + System.nanoTime())
        if (r == TextToSpeech.ERROR) spoke()
    }

    private fun spoke() {
        if (speaking.decrementAndGet() <= 0) {
            speaking.set(0)
            checkIdle()
        }
    }

    fun stopSpeaking() {
        tts?.stop()
        speaking.set(0)
    }

    fun checkIdle() {
        if (!working && speaking.get() <= 0) main.post { onIdle?.invoke() }
    }

    fun setStatus(s: String) {
        status = s
        statusListener?.invoke(s)
    }

    private fun add(who: String, text: String) {
        val l = Line(who, text)
        lines.add(l)
        while (lines.size > 200) lines.removeAt(0)
        listener?.invoke(l)
    }

    fun say(text: String, speak: Boolean = true) {
        add("j", text)
        val clean = text.replace(Regex("[*#_`>]|https?://\\S+"), "").trim()
        if (!speak || !Prefs.speak || clean.isEmpty()) {
            checkIdle()
            return
        }
        main.post { onWorking?.invoke() }
        if (ttsReady) speakNow(clean) else synchronized(queue) { queue.add(clean) }
    }

    fun handleAsync(textIn: String) {
        val text = textIn.replace(Regex("[’ʻʼ`‘´]"), "'").trim()
        if (text.isEmpty()) return
        add("u", text)
        working = true
        setStatus("O'ylayapman…")
        main.post { onWorking?.invoke() }
        exec.execute {
            val out = try {
                process(text)
            } catch (e: Throwable) {
                "Xatolik: ${e.message}"
            }
            if (out.isNotBlank()) say(out)
            working = false
            setStatus("Tayyor")
            checkIdle()
        }
    }

    private fun process(text: String): String {
        val key = Prefs.apiKey
        val p = pending
        if (p != null) {
            pending = null
            if (yes.containsMatchIn(text)) {
                val r = p()
                if (key.isNotBlank()) Brain.record(text, r)
                return r
            }
            if (no.containsMatchIn(text)) {
                if (key.isNotBlank()) Brain.record(text, "Bekor qilindi.")
                return "Bekor qildim."
            }
        }
        if (key.isBlank()) return Local.run(text)
        return try {
            Brain.ask(text, key)
        } catch (e: Exception) {
            Local.run(text) + "\n(AI xatosi: ${e.message})"
        }
    }
}
