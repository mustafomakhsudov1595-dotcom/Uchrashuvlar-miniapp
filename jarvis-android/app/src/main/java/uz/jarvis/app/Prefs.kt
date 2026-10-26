package uz.jarvis.app

import android.content.Context
import android.content.SharedPreferences

object Prefs {
    private var sp: SharedPreferences? = null

    fun init(c: Context) {
        if (sp == null) sp = c.applicationContext.getSharedPreferences("jarvis", Context.MODE_PRIVATE)
    }

    private fun s(): SharedPreferences = sp ?: error("Prefs.init chaqirilmagan")

    var apiKey: String
        get() = s().getString("key", "") ?: ""
        set(v) { s().edit().putString("key", v.trim()).apply() }

    var model: String
        get() = s().getString("model", "claude-sonnet-5-5") ?: "claude-sonnet-5-5"
        set(v) { s().edit().putString("model", v.trim().ifEmpty { "claude-sonnet-5-5" }).apply() }

    var lang: String
        get() = s().getString("lang", "uz-UZ") ?: "uz-UZ"
        set(v) { s().edit().putString("lang", v.trim().ifEmpty { "uz-UZ" }).apply() }

    var wakeWord: String
        get() = s().getString("wake", "jarvis") ?: "jarvis"
        set(v) { s().edit().putString("wake", v.trim().ifEmpty { "jarvis" }).apply() }

    var wakeMode: Boolean
        get() = s().getBoolean("wakeMode", false)
        set(v) { s().edit().putBoolean("wakeMode", v).apply() }

    var confirm: Boolean
        get() = s().getBoolean("confirm", true)
        set(v) { s().edit().putBoolean("confirm", v).apply() }

    var speak: Boolean
        get() = s().getBoolean("speak", true)
        set(v) { s().edit().putBoolean("speak", v).apply() }

    var web: Boolean
        get() = s().getBoolean("web", true)
        set(v) { s().edit().putBoolean("web", v).apply() }

    var memory: String
        get() = s().getString("memory", "") ?: ""
        set(v) { s().edit().putString("memory", v).apply() }

    var notes: String
        get() = s().getString("notes", "") ?: ""
        set(v) { s().edit().putString("notes", v).apply() }
}
