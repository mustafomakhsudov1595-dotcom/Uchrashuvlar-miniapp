package uz.jarvis.app

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {
    private val cyan = Color.parseColor("#00E5FF")
    private val bg = Color.parseColor("#020B14")
    private val panel = Color.parseColor("#031A29")
    private val dim = Color.parseColor("#5AA9B8")

    private lateinit var logBox: LinearLayout
    private lateinit var scroll: ScrollView
    private lateinit var statusView: TextView
    private lateinit var input: EditText

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun perms(): Array<String> {
        val l = arrayListOf(
            Manifest.permission.RECORD_AUDIO, Manifest.permission.READ_CONTACTS,
            Manifest.permission.CALL_PHONE, Manifest.permission.SEND_SMS
        )
        if (Build.VERSION.SDK_INT >= 33) l.add(Manifest.permission.POST_NOTIFICATIONS)
        return l.toTypedArray()
    }

    private fun allGranted() = perms().all { checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Jarvis.init(this)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        buildUi()
        if (!allGranted()) requestPermissions(perms(), 1)
        if (Jarvis.lines.isEmpty()) {
            Jarvis.say(
                if (Prefs.apiKey.isBlank()) "Salom! Men Jarvisman. To'liq aqlli rejim uchun ⚙ dan Claude API kalitini kiriting, 🛡 dan ruxsatlarni bering."
                else "Salom, ser. Jarvis xizmatingizda.",
                false
            )
        }
    }

    override fun onResume() {
        super.onResume()
        logBox.removeAllViews()
        Jarvis.lines.forEach { addLine(it) }
        Jarvis.listener = { l -> runOnUiThread { addLine(l) } }
        Jarvis.statusListener = { s -> runOnUiThread { statusView.text = s } }
        statusView.text = Jarvis.status
    }

    override fun onPause() {
        Jarvis.listener = null
        Jarvis.statusListener = null
        super.onPause()
    }

    private fun round(color: Int, stroke: Int? = null, radius: Int = 12) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(radius).toFloat()
        if (stroke != null) setStroke(dp(1), stroke)
    }

    private fun flatButton(label: String, onClick: () -> Unit) = Button(this).apply {
        text = label
        setTextColor(cyan)
        isAllCaps = false
        background = round(Color.TRANSPARENT, cyan, 10)
        setOnClickListener { onClick() }
    }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(bg)
            setPadding(dp(14), dp(34), dp(14), dp(10))
        }
        val top = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        top.addView(TextView(this).apply {
            text = "J.A.R.V.I.S."
            setTextColor(cyan)
            textSize = 18f
            letterSpacing = 0.25f
            typeface = Typeface.DEFAULT_BOLD
        }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        top.addView(flatButton("🛡") { showSetup() }, LinearLayout.LayoutParams(dp(52), dp(44)))
        top.addView(flatButton("⚙") { showSettings() }, LinearLayout.LayoutParams(dp(52), dp(44)).apply { leftMargin = dp(8) })
        root.addView(top)

        val core = TextView(this).apply {
            text = "🎤"
            textSize = 44f
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(panel)
                setStroke(dp(3), cyan)
            }
            setOnClickListener { talk() }
        }
        root.addView(core, LinearLayout.LayoutParams(dp(130), dp(130)).apply {
            gravity = Gravity.CENTER_HORIZONTAL
            topMargin = dp(18)
        })

        statusView = TextView(this).apply {
            setTextColor(dim)
            gravity = Gravity.CENTER
            textSize = 14f
            setPadding(0, dp(8), 0, dp(8))
        }
        root.addView(statusView)

        scroll = ScrollView(this)
        logBox = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(logBox)
        root.addView(scroll, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

        val bottom = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        input = EditText(this).apply {
            hint = "Buyruq yozing…"
            setHintTextColor(dim)
            setTextColor(Color.parseColor("#CFEFFF"))
            background = round(panel, Color.parseColor("#0A4A5C"), 10)
            setPadding(dp(12), dp(10), dp(12), dp(10))
            imeOptions = EditorInfo.IME_ACTION_SEND
            inputType = InputType.TYPE_CLASS_TEXT
            setOnEditorActionListener { _, _, _ -> send(); true }
        }
        bottom.addView(input, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        bottom.addView(flatButton("➤") { send() }, LinearLayout.LayoutParams(dp(56), dp(46)).apply { leftMargin = dp(8) })
        root.addView(bottom)
        setContentView(root)
    }

    private fun addLine(l: Jarvis.Line) {
        val me = l.who == "u"
        val tv = TextView(this).apply {
            text = l.text
            setTextColor(if (me) Color.parseColor("#CFEFFF") else cyan)
            textSize = 15f
            background = round(panel, Color.parseColor("#0A4A5C"), 12)
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        logBox.addView(tv, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
            gravity = if (me) Gravity.END else Gravity.START
            topMargin = dp(6)
            leftMargin = if (me) dp(40) else 0
            rightMargin = if (me) 0 else dp(40)
        })
        scroll.post { scroll.fullScroll(View.FOCUS_DOWN) }
    }

    private fun send() {
        val t = input.text.toString().trim()
        if (t.isEmpty()) return
        input.setText("")
        Jarvis.handleAsync(t)
    }

    private fun talk() {
        if (!allGranted()) {
            requestPermissions(perms(), 1)
            return
        }
        startForegroundService(Intent(this, JarvisService::class.java).setAction(JarvisService.ACTION_TALK))
    }

    private fun applyWakeMode() {
        if (Prefs.wakeMode) startForegroundService(Intent(this, JarvisService::class.java))
        else stopService(Intent(this, JarvisService::class.java))
    }

    /* ---------- Sozlamalar ---------- */

    private fun label(t: String) = TextView(this).apply {
        text = t
        setTextColor(dim)
        textSize = 13f
        setPadding(0, dp(10), 0, dp(2))
    }

    private fun field(value: String, pw: Boolean = false, lines: Int = 1) = EditText(this).apply {
        setText(value)
        setTextColor(Color.parseColor("#CFEFFF"))
        background = round(panel, Color.parseColor("#0A4A5C"), 8)
        setPadding(dp(10), dp(8), dp(10), dp(8))
        inputType = if (pw) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        else if (lines > 1) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
        else InputType.TYPE_CLASS_TEXT
        if (lines > 1) { minLines = lines; gravity = Gravity.TOP }
    }

    private fun check(t: String, v: Boolean) = CheckBox(this).apply {
        text = t
        isChecked = v
        setTextColor(Color.parseColor("#CFEFFF"))
    }

    private fun showSettings() {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(18), dp(8), dp(18), dp(8)) }
        val key = field(Prefs.apiKey, pw = true)
        val model = field(Prefs.model)
        val lang = field(Prefs.lang)
        val wake = field(Prefs.wakeWord)
        val wakeMode = check("Doim tinglash (\"Jarvis, …\" deb chaqirish)", Prefs.wakeMode)
        val confirm = check("Qo'ng'iroq/SMS oldidan tasdiq so'rash", Prefs.confirm)
        val speak = check("Ovozli javob", Prefs.speak)
        val web = check("Internetdan qidirish", Prefs.web)
        val mem = field(Prefs.memory, lines = 3)
        box.addView(label("Claude API kaliti (sk-ant-…)")); box.addView(key)
        box.addView(label("Model (claude-sonnet-5-5, claude-haiku-5-5, claude-fable-5-1)")); box.addView(model)
        box.addView(label("Til (uz-UZ, ru-RU, en-US)")); box.addView(lang)
        box.addView(label("Chaqiruv so'zi")); box.addView(wake)
        box.addView(wakeMode); box.addView(confirm); box.addView(speak); box.addView(web)
        box.addView(label("Xotira — Jarvis siz haqingizda bilgan narsalar")); box.addView(mem)
        AlertDialog.Builder(this)
            .setTitle("Sozlamalar")
            .setView(ScrollView(this).apply { addView(box) })
            .setPositiveButton("Saqlash") { _, _ ->
                Prefs.apiKey = key.text.toString()
                Prefs.model = model.text.toString()
                Prefs.lang = lang.text.toString()
                Prefs.wakeWord = wake.text.toString()
                Prefs.wakeMode = wakeMode.isChecked
                Prefs.confirm = confirm.isChecked
                Prefs.speak = speak.isChecked
                Prefs.web = web.isChecked
                Prefs.memory = mem.text.toString()
                applyWakeMode()
            }
            .setNegativeButton("Bekor", null)
            .show()
    }

    /* ---------- Ruxsatlar va sozlash ---------- */

    private fun row(box: LinearLayout, ok: Boolean, title: String, btn: String, action: () -> Unit) {
        box.addView(TextView(this).apply {
            text = (if (ok) "✅ " else "⬜ ") + title
            setTextColor(Color.parseColor("#CFEFFF"))
            setPadding(0, dp(12), 0, dp(2))
        })
        if (!ok) box.addView(flatButton(btn, action))
    }

    private fun showSetup() {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(18), dp(8), dp(18), dp(8)) }
        row(box, allGranted(), "Ruxsatlar: mikrofon, kontaktlar, qo'ng'iroq, SMS, bildirishnoma", "Ruxsat berish") {
            requestPermissions(perms(), 1)
        }
        row(box, Settings.canDrawOverlays(this), "Boshqa ilovalar ustida ko'rsatish (fonda ilovalarni ochish uchun)", "Yoqish") {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
        }
        row(box, JarvisAccessibility.instance != null, "Maxsus imkoniyatlar: boshqa ilovalar ekranini o'qish va bosish", "Sozlamani ochish") {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
        box.addView(TextView(this).apply {
            text = "Agar Maxsus imkoniyatlarda Jarvis'ni yoqib bo'lmasa (kulrang): Sozlamalar → Ilovalar → Jarvis → ⋮ (yuqori o'ng burchak) → \"Cheklangan sozlamalarga ruxsat berish\", so'ng qayta urinib ko'ring."
            setTextColor(dim)
            textSize = 12f
        })
        row(box, false, "Batareya cheklovini o'chirish (fonda uzilmasligi uchun)", "Sozlamani ochish") {
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
        AlertDialog.Builder(this)
            .setTitle("Ruxsatlar")
            .setView(ScrollView(this).apply { addView(box) })
            .setPositiveButton("Yopish", null)
            .show()
    }
}
