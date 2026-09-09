package com.igood.report

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.*
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.print.PrintAttributes
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.*
import java.nio.charset.Charset
import java.util.UUID
import java.util.concurrent.CountDownLatch

class WebAppInterface(private val activity: Activity, private val webView: WebView) {

    companion object {
        private const val TAG = "IgoodReceipt"
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }

    // ─── Bluetooth Printers ──────────────────────────────────────────

    @JavascriptInterface
    fun listBluetoothPrinters(): String {
        if (!hasBluetoothConnectPermission()) {
            return errorJson("Izin Bluetooth belum diberikan.")
        }
        val adapter = BluetoothAdapter.getDefaultAdapter()
            ?: return errorJson("Bluetooth tidak tersedia di perangkat ini.")
        if (!adapter.isEnabled) {
            return errorJson("Bluetooth belum aktif.")
        }
        return try {
            val printers = JSONArray()
            val devices: Set<BluetoothDevice> = adapter.bondedDevices
            for (device in devices) {
                val item = JSONObject()
                item.put("name", safeDeviceName(device))
                item.put("address", device.address)
                printers.put(item)
            }
            val result = JSONObject()
            result.put("printers", printers)
            result.toString()
        } catch (error: SecurityException) {
            errorJson("Izin Bluetooth ditolak.")
        }
    }

    // ─── Thermal Receipt ─────────────────────────────────────────────

    @JavascriptInterface
    fun printThermalReceipt(address: String, text: String, width: Int): String {
        if (address.isEmpty()) return errorJson("Printer thermal belum dipilih.")
        if (text.isEmpty()) return errorJson("Data struk kosong.")
        if (!hasBluetoothConnectPermission()) return errorJson("Izin Bluetooth belum diberikan.")

        var socket: BluetoothSocket? = null
        return try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
                ?: throw IOException("Bluetooth tidak tersedia di perangkat ini.")
            if (!adapter.isEnabled) throw IOException("Bluetooth belum aktif.")

            val device = adapter.getRemoteDevice(address)
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            adapter.cancelDiscovery()
            socket.connect()

            val output: OutputStream = socket.outputStream
            output.write(buildEscPosReceipt(text, width))
            output.flush()

            val result = JSONObject()
            result.put("ok", true)
            result.put("printer", safeDeviceName(device))
            result.put("address", address)
            result.toString()
        } catch (error: Exception) {
            errorJson(error.message ?: "Gagal print ke printer thermal.")
        } finally {
            try { socket?.close() } catch (_: IOException) {}
        }
    }

    // ─── Save PDF ────────────────────────────────────────────────────

    @JavascriptInterface
    fun savePdf(base64: String, filename: String, shouldOpen: Boolean): String {
        if (base64.isEmpty()) return errorJson("Data PDF kosong.")
        val safeName = sanitizePdfFilename(filename)

        return try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            val uri = savePdfToDownloads(safeName, bytes)

            val sharedFolder = File(activity.cacheDir, "shared_pdfs")
            if (!sharedFolder.exists() && !sharedFolder.mkdirs()) {
                throw IOException("Folder cache sharing tidak bisa dibuat.")
            }
            val cacheFile = File(sharedFolder, safeName)
            FileOutputStream(cacheFile).use { it.write(bytes) }

            val contentUri = FileProvider.getUriForFile(
                activity, "${activity.packageName}.fileprovider", cacheFile
            )

            val opened = shouldOpen && openPdf(contentUri)

            val result = JSONObject()
            result.put("filename", safeName)
            result.put("uri", uri.toString())
            result.put("opened", opened)
            result.toString()
        } catch (error: Exception) {
            errorJson(error.message ?: "Gagal menyimpan PDF.")
        }
    }

    // ─── Share PDF ───────────────────────────────────────────────────

    @JavascriptInterface
    fun sharePdf(base64: String, filename: String): String {
        if (base64.isEmpty()) return errorJson("Data PDF kosong.")
        val safeName = sanitizePdfFilename(filename)

        return try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)

            val sharedFolder = File(activity.cacheDir, "shared_pdfs")
            if (!sharedFolder.exists() && !sharedFolder.mkdirs()) {
                throw IOException("Folder cache sharing tidak bisa dibuat.")
            }
            val file = File(sharedFolder, safeName)
            FileOutputStream(file).use { it.write(bytes) }

            val contentUri = FileProvider.getUriForFile(
                activity, "${activity.packageName}.fileprovider", file
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                clipData = ClipData.newRawUri("", contentUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val resInfoList = activity.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            for (resolveInfo in resInfoList) {
                val packageName = resolveInfo.activityInfo.packageName
                activity.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(intent, "Bagikan PDF Struk")
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            activity.startActivity(chooser)

            successJson()
        } catch (error: Exception) {
            errorJson(error.message ?: "Gagal membagikan PDF.")
        }
    }

    // ─── Share Text ──────────────────────────────────────────────────

    @JavascriptInterface
    fun shareText(text: String): String {
        if (text.isEmpty()) return errorJson("Data teks kosong.")

        return try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
            }
            activity.startActivity(Intent.createChooser(intent, "Bagikan Struk Teks"))
            successJson()
        } catch (error: Exception) {
            errorJson(error.message ?: "Gagal membagikan teks.")
        }
    }

    // ─── Share Image ─────────────────────────────────────────────────

    @JavascriptInterface
    fun shareImage(base64: String, filename: String, caption: String): String {
        if (base64.isEmpty()) return errorJson("Data gambar kosong.")

        return try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)

            val sharedFolder = File(activity.cacheDir, "shared_images")
            if (!sharedFolder.exists() && !sharedFolder.mkdirs()) {
                throw IOException("Folder cache gambar tidak bisa dibuat.")
            }

            var safeFilename = filename.replace(Regex("[^A-Za-z0-9._-]"), "-").replace(Regex("-+"), "-")
            if (!safeFilename.lowercase().endsWith(".png")) safeFilename += ".png"

            val file = File(sharedFolder, safeFilename)
            FileOutputStream(file).use { it.write(bytes) }

            val contentUri = FileProvider.getUriForFile(
                activity, "${activity.packageName}.fileprovider", file
            )

            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                clipData = ClipData.newRawUri("", contentUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            if (caption.isNotEmpty()) {
                intent.putExtra(Intent.EXTRA_TEXT, caption)
            }

            val resInfoList = activity.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            for (resolveInfo in resInfoList) {
                val packageName = resolveInfo.activityInfo.packageName
                activity.grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(intent, "Bagikan Struk Gambar")
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            activity.startActivity(chooser)

            successJson()
        } catch (error: Exception) {
            errorJson(error.message ?: "Gagal membagikan gambar.")
        }
    }

    // ─── Print Receipt (Android Print Dialog) ────────────────────────

    @JavascriptInterface
    fun printReceipt(html: String, title: String): String {
        if (html.isEmpty()) return errorJson("Data struk kosong.")

        return try {
            val latch = CountDownLatch(1)
            var resultJson = successJson()

            activity.runOnUiThread {
                try {
                    val printWebView = WebView(activity)
                    printWebView.webViewClient = object : WebViewClient() {
                        private var printed = false

                        override fun onPageFinished(view: WebView, url: String) {
                            if (printed) return
                            printed = true
                            try {
                                val printManager = activity.getSystemService(Context.PRINT_SERVICE) as? android.print.PrintManager
                                if (printManager == null) {
                                    resultJson = errorJson("Print service Android tidak tersedia.")
                                    latch.countDown()
                                    return
                                }

                                val adapter = view.createPrintDocumentAdapter(title)
                                val attributes = PrintAttributes.Builder()
                                    .setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
                                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                    .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
                                    .build()
                                printManager.print(title, adapter, attributes)

                                resultJson = successJson()
                                latch.countDown()
                            } catch (error: Exception) {
                                resultJson = errorJson(error.message ?: "Gagal membuka dialog cetak.")
                                latch.countDown()
                            }
                        }
                    }
                    printWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
                } catch (e: Exception) {
                    resultJson = errorJson(e.message ?: "Gagal membuat print view.")
                    latch.countDown()
                }
            }

            latch.await()
            resultJson
        } catch (error: Exception) {
            errorJson(error.message ?: "Gagal membuka dialog cetak.")
        }
    }

    // ─── Platform check ──────────────────────────────────────────────

    @JavascriptInterface
    fun isNative(): Boolean = true

    // ─── Private Helpers ─────────────────────────────────────────────

    private fun savePdfToDownloads(filename: String, bytes: ByteArray): Uri {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val resolver = activity.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, filename)
                put(MediaStore.Downloads.MIME_TYPE, "application/pdf")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = resolver.insert(
                MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values
            ) ?: throw IOException("Gagal membuat file PDF di Download.")

            resolver.openOutputStream(uri)?.use { output -> output.write(bytes) }
                ?: throw IOException("Gagal membuka file PDF.")

            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            return uri
        }

        val downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!downloads.exists() && !downloads.mkdirs()) {
            throw IOException("Folder Download tidak bisa dibuat.")
        }
        val file = File(downloads, filename)
        FileOutputStream(file).use { it.write(bytes) }
        return FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", file)
    }

    private fun openPdf(uri: Uri): Boolean {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            clipData = ClipData.newRawUri("", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        return try {
            val chooser = Intent.createChooser(intent, "Buka PDF struk")
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            activity.startActivity(chooser)
            true
        } catch (_: android.content.ActivityNotFoundException) {
            false
        }
    }

    private fun hasBluetoothConnectPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return activity.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
    }

    private fun safeDeviceName(device: BluetoothDevice): String {
        return try {
            val name = device.name
            if (name.isNullOrBlank()) "Printer Bluetooth" else name
        } catch (_: SecurityException) {
            "Printer Bluetooth"
        }
    }

    private fun buildEscPosReceipt(text: String, widthMm: Int): ByteArray {
        val output = ByteArrayOutputStream()
        output.write(byteArrayOf(0x1B, 0x40))       // initialize
        output.write(byteArrayOf(0x1B, 0x74, 0x00)) // code page default
        output.write(byteArrayOf(0x1B, 0x33, 0x18)) // line spacing
        output.write(wrapReceiptText(text, widthMm).toByteArray(Charset.forName("ISO-8859-1")))
        output.write(byteArrayOf(0x0A, 0x0A, 0x0A))
        output.write(byteArrayOf(0x1D, 0x56, 0x42, 0x00)) // partial cut where supported
        return output.toByteArray()
    }

    private fun wrapReceiptText(text: String, widthMm: Int): String {
        val maxChars = if (widthMm >= 80) 48 else 32
        val builder = StringBuilder()
        val lines = text.replace("\r", "").split("\n")
        for (line in lines) {
            if (line.length <= maxChars) {
                builder.append(line).append('\n')
                continue
            }
            var index = 0
            while (index < line.length) {
                val end = minOf(index + maxChars, line.length)
                builder.append(line, index, end).append('\n')
                index = end
            }
        }
        return builder.toString()
    }

    private fun sanitizePdfFilename(filename: String?): String {
        var value = filename?.trim() ?: ""
        if (value.isEmpty()) value = "igood-struk.pdf"
        value = value.replace(Regex("[^A-Za-z0-9._-]"), "-").replace(Regex("-+"), "-")
        if (!value.lowercase().endsWith(".pdf")) value += ".pdf"
        return value
    }

    private fun errorJson(message: String): String {
        val obj = JSONObject()
        obj.put("ok", false)
        obj.put("error", message)
        return obj.toString()
    }

    private fun successJson(): String {
        val obj = JSONObject()
        obj.put("ok", true)
        return obj.toString()
    }
}
