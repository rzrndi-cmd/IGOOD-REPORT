package com.igood.report

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsetsController
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    companion object {
        const val FILE_CHOOSER_REQUEST = 1001
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            webView = WebView(this).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = true
                settings.allowContentAccess = true
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                settings.mediaPlaybackRequiresUserGesture = false
                settings.databaseEnabled = true
                settings.setSupportZoom(false)
                settings.builtInZoomControls = false
                settings.useWideViewPort = true
                settings.loadWithOverviewMode = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
            }

            webView.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
                    // Open external links in browser
                    if (url.startsWith("http") && !url.startsWith("file://")) {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        return true
                    }
                    return false
                }
            }

            webView.webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    android.util.Log.d("IgoodWebView", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()}")
                    return true
                }

                override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    AlertDialog.Builder(this@MainActivity)
                        .setMessage(message)
                        .setPositiveButton("OK") { _, _ -> result?.confirm() }
                        .setCancelable(false)
                        .show()
                    return true
                }

                override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                    AlertDialog.Builder(this@MainActivity)
                        .setMessage(message)
                        .setPositiveButton("OK") { _, _ -> result?.confirm() }
                        .setNegativeButton("Batal") { _, _ -> result?.cancel() }
                        .setCancelable(false)
                        .show()
                    return true
                }

                override fun onJsPrompt(view: WebView?, url: String?, message: String?, defaultValue: String?, result: JsPromptResult?): Boolean {
                    val input = android.widget.EditText(this@MainActivity)
                    input.setText(defaultValue)
                    AlertDialog.Builder(this@MainActivity)
                        .setMessage(message)
                        .setView(input)
                        .setPositiveButton("OK") { _, _ -> result?.confirm(input.text.toString()) }
                        .setNegativeButton("Batal") { _, _ -> result?.cancel() }
                        .setCancelable(false)
                        .show()
                    return true
                }

                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = filePathCallback
                    val intent = fileChooserParams?.createIntent() ?: return false
                    try {
                        startActivityForResult(intent, FILE_CHOOSER_REQUEST)
                    } catch (e: Exception) {
                        fileUploadCallback = null
                        return false
                    }
                    return true
                }
            }

            // Register JavaScript interface
            val webAppInterface = WebAppInterface(this, webView)
            webView.addJavascriptInterface(webAppInterface, "IgoodReceipt")

            setContentView(webView)

            // Dark status bar (applied safely after setContentView using WindowCompat)
            try {
                window.statusBarColor = android.graphics.Color.parseColor("#0f172a")
                androidx.core.view.WindowCompat.getInsetsController(window, window.decorView).apply {
                    isAppearanceLightStatusBars = false
                }
            } catch (statusError: Throwable) {
                // Non-critical: ignore status bar configuration errors to keep app running
                android.util.Log.e("IgoodWebView", "Gagal mengatur status bar", statusError)
            }

            webView.loadUrl("file:///android_asset/public/index.html")

            // Handle back button
            onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        // Let JS handle it first via evaluateJavascript
                        webView.evaluateJavascript("(function(){ return typeof handleBackButton === 'function' ? handleBackButton() : false; })()") { result ->
                            if (result != "true") {
                                finish()
                            }
                        }
                    }
                }
            })
        } catch (e: Throwable) {
            showCrashDialog(e)
        }
    }

    private fun showCrashDialog(e: Throwable) {
        val sw = java.io.StringWriter()
        val pw = java.io.PrintWriter(sw)
        e.printStackTrace(pw)
        val stackTrace = sw.toString()

        AlertDialog.Builder(this)
            .setTitle("Aplikasi Error")
            .setMessage("Terjadi kesalahan saat memulai aplikasi:\n\n$stackTrace")
            .setPositiveButton("Tutup") { _, _ -> finish() }
            .setCancelable(false)
            .show()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST) {
            val result = if (resultCode == Activity.RESULT_OK) {
                data?.data?.let { arrayOf(it) }
            } else null
            fileUploadCallback?.onReceiveValue(result)
            fileUploadCallback = null
        }
    }
}
