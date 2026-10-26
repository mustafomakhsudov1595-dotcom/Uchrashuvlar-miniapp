package uz.jarvis.app

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/** Ovozni tinglaydigan fon xizmati: bir martalik gap yoki "jarvis" chaqiruv so'zi rejimi. */
class JarvisService : Service() {
    companion object {
        const val ACTION_TALK = "uz.jarvis.TALK"
        const val ACTION_STOP = "uz.jarvis.STOP"
    }

    private val main = Handler(Looper.getMainLooper())
    private var sr: SpeechRecognizer? = null
    private var listening = false
    private var busy = false
    private var talkOnce = false
    private var awaitingCommand = false
    private var errors = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Jarvis.init(this)
        startFg()
        Jarvis.onWorking = {
            busy = true
            stopListening()
        }
        Jarvis.onIdle = {
            busy = false
            afterIdle()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_TALK -> {
                talkOnce = true
                Jarvis.stopSpeaking()
                busy = false
                startListening()
            }
            else -> if (Prefs.wakeMode) startListening() else stopSelf()
        }
        return START_STICKY
    }

    private fun startFg() {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("jarvis", "Jarvis", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val stop = PendingIntent.getService(
            this, 1, Intent(this, JarvisService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE
        )
        @Suppress("DEPRECATION")
        val n = Notification.Builder(this, "jarvis")
            .setContentTitle("Jarvis")
            .setContentText("Tinglayapman…")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(open)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "To'xtatish", stop)
            .build()
        try {
            if (Build.VERSION.SDK_INT >= 30) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
            else startForeground(1, n)
        } catch (e: Exception) {
            Jarvis.say("Fon xizmatini ishga tushirib bo'lmadi: ${e.message}", false)
            stopSelf()
        }
    }

    private fun startListening() {
        if (busy || listening) return
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Jarvis.say("Mikrofon ruxsati yo'q. 🛡 bo'limidan ruxsat bering.", false)
            stopSelf()
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Jarvis.say("Bu telefonda ovozni tanish xizmati yo'q. Google ilovasini o'rnating/yangilang.", false)
            stopSelf()
            return
        }
        val r = sr ?: SpeechRecognizer.createSpeechRecognizer(this).also {
            it.setRecognitionListener(listener)
            sr = it
        }
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, Prefs.lang)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        listening = true
        try {
            r.startListening(i)
            Jarvis.setStatus(if (talkOnce || awaitingCommand || !Prefs.wakeMode) "Gapiring…" else "Tinglayapman (\"${Prefs.wakeWord}\" deng)…")
        } catch (e: Exception) {
            listening = false
            recreate()
            restartSoon(800)
        }
    }

    private fun stopListening() {
        try {
            sr?.cancel()
        } catch (e: Exception) {
        }
        listening = false
    }

    private fun recreate() {
        try {
            sr?.destroy()
        } catch (e: Exception) {
        }
        sr = null
        listening = false
    }

    private fun restartSoon(delay: Long = 300) {
        main.postDelayed({ if (!busy) startListening() }, delay)
    }

    private fun afterIdle() {
        if (Prefs.wakeMode || awaitingCommand || talkOnce) {
            startListening()
        } else {
            Jarvis.setStatus("Tayyor")
            stopSelf()
        }
    }

    private fun heard(t: String) {
        val wake = Prefs.wakeWord.lowercase()
        val lower = t.lowercase()
        val idx = lower.indexOf(wake)
        if (talkOnce || awaitingCommand) {
            talkOnce = false
            awaitingCommand = false
            val cmd = if (idx >= 0) t.substring(idx + wake.length).trim(' ', ',', '.') else t
            if (cmd.isNotEmpty()) Jarvis.handleAsync(cmd) else restartSoon()
            return
        }
        if (idx < 0) {
            restartSoon()
            return
        }
        val cmd = t.substring(idx + wake.length).trim(' ', ',', '.')
        if (cmd.isEmpty()) {
            awaitingCommand = true
            Jarvis.say("Eshitaman, ser.")
        } else {
            Jarvis.handleAsync(cmd)
        }
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}
        override fun onPartialResults(partialResults: Bundle?) {}
        override fun onEvent(eventType: Int, params: Bundle?) {}

        override fun onResults(results: Bundle?) {
            listening = false
            errors = 0
            val t = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim().orEmpty()
            if (t.isEmpty()) restartSoon() else heard(t)
        }

        override fun onError(error: Int) {
            listening = false
            when (error) {
                SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                    if (talkOnce) {
                        talkOnce = false
                        Jarvis.say("Eshitmadim, ser.", false)
                        afterIdle()
                    } else {
                        awaitingCommand = false
                        restartSoon()
                    }
                }
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> {
                    recreate()
                    restartSoon(800)
                }
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                    Jarvis.say("Mikrofon ruxsati yo'q. 🛡 bo'limidan ruxsat bering.", false)
                    stopSelf()
                }
                12, 13 -> {
                    Prefs.lang = "ru-RU"
                    Jarvis.say("O'zbekcha ovoz tanilmadi, rus tiliga o'tdim (⚙ dan o'zgartirish mumkin).", false)
                    recreate()
                    restartSoon(500)
                }
                else -> {
                    errors++
                    if (errors > 6) {
                        errors = 0
                        Jarvis.say("Ovozni tanish xatosi ($error). Internetni tekshiring.", false)
                        stopSelf()
                    } else {
                        recreate()
                        restartSoon(1500)
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        Jarvis.onWorking = null
        Jarvis.onIdle = null
        recreate()
        Jarvis.setStatus("To'xtadi")
        super.onDestroy()
    }
}
