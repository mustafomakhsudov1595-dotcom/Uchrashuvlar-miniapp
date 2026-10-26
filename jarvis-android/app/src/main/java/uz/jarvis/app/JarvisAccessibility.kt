package uz.jarvis.app

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/** Boshqa ilovalar ekranini o'qish va boshqarish. */
class JarvisAccessibility : AccessibilityService() {
    companion object {
        @Volatile var instance: JarvisAccessibility? = null
    }

    override fun onServiceConnected() {
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    fun readScreen(): String {
        val root = rootInActiveWindow ?: return "Ekranni o'qib bo'lmadi."
        val sb = StringBuilder("Ilova: ${root.packageName}\n")
        var count = 0
        fun walk(n: AccessibilityNodeInfo?) {
            if (n == null || count >= 120) return
            if (n.isVisibleToUser) {
                val text = n.text?.toString()?.trim().orEmpty()
                val desc = n.contentDescription?.toString()?.trim().orEmpty()
                if (text.isNotEmpty() || desc.isNotEmpty() || n.isEditable) {
                    val r = Rect()
                    n.getBoundsInScreen(r)
                    val label = if (text.isNotEmpty()) text else desc
                    val kind = when {
                        n.isEditable -> " [kiritish]"
                        n.isClickable -> " [tugma]"
                        else -> ""
                    }
                    sb.append("- \"").append(label.take(120)).append("\"").append(kind)
                        .append(" (").append(r.centerX()).append(",").append(r.centerY()).append(")\n")
                    count++
                }
            }
            for (i in 0 until n.childCount) walk(n.getChild(i))
        }
        walk(root)
        if (count == 0) sb.append("(ko'rinadigan matn yo'q)")
        return sb.toString()
    }

    fun tapText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val nodes = root.findAccessibilityNodeInfosByText(text)
        if (nodes.isNullOrEmpty()) return false
        val node = nodes.firstOrNull { it.isVisibleToUser } ?: nodes[0]
        var n: AccessibilityNodeInfo? = node
        while (n != null && !n.isClickable) n = n.parent
        if (n != null && n.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
        val r = Rect()
        node.getBoundsInScreen(r)
        return tapAt(r.centerX().toFloat(), r.centerY().toFloat())
    }

    fun tapAt(x: Float, y: Float): Boolean {
        val p = Path()
        p.moveTo(x, y)
        val g = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(p, 0, 80))
            .build()
        return dispatchGesture(g, null, null)
    }

    private fun findEditable(n: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (n == null) return null
        if (n.isEditable) return n
        for (i in 0 until n.childCount) {
            val r = findEditable(n.getChild(i))
            if (r != null) return r
        }
        return null
    }

    fun typeText(text: String): Boolean {
        val root = rootInActiveWindow ?: return false
        val node = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: findEditable(root) ?: return false
        val b = Bundle()
        b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, b)
    }

    fun press(key: String): Boolean {
        val a = when (key.lowercase()) {
            "back" -> GLOBAL_ACTION_BACK
            "home" -> GLOBAL_ACTION_HOME
            "recents" -> GLOBAL_ACTION_RECENTS
            "notifications" -> GLOBAL_ACTION_NOTIFICATIONS
            "quick_settings" -> GLOBAL_ACTION_QUICK_SETTINGS
            "lock" -> GLOBAL_ACTION_LOCK_SCREEN
            else -> return false
        }
        return performGlobalAction(a)
    }

    private fun findScrollable(n: AccessibilityNodeInfo?): AccessibilityNodeInfo? {
        if (n == null) return null
        if (n.isScrollable) return n
        for (i in 0 until n.childCount) {
            val r = findScrollable(n.getChild(i))
            if (r != null) return r
        }
        return null
    }

    fun scroll(direction: String): Boolean {
        val node = findScrollable(rootInActiveWindow) ?: return false
        val act = if (direction.lowercase().startsWith("up")) AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        else AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
        return node.performAction(act)
    }
}
