# Garansi Toko & Ukuran Struk Dinamis (58mm / 80mm) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan input Garansi Toko (opsional) di seluruh alur transaksi kasir dan menambahkan opsi pemilihan ukuran struk (58mm vs 80mm) pada pop-up struk (cetak thermal, ekspor PDF, dan gambar PNG).

**Architecture:** 
1. Di `js/sales.js`, tambahkan input `saleStoreWarranty` pada form item (iPhone, Android, Aksesoris, Tukar Tambah, Pre-Order, Order Jasa, Lain-lain), lalu simpan ke field item cart `storeWarranty`.
2. Di `index.html`, tambahkan segmented toggle 58mm / 80mm pada `#receiptModal`.
3. Di `js/receipt.js`, buat generator struk responsif terhadap ukuran lebar karakter (34/36 char untuk 58mm, 48 char untuk 80mm), render canvas PNG dinamis (58mm vs 80mm), dan simpan preferensi ukuran ke `localStorage`.

**Tech Stack:** HTML5, CSS3, Vanilla JS, HTML Canvas, jsPDF.

---

### Task 1: Tambahkan Input Garansi Toko pada Form Penjualan (`js/sales.js`)

**Files:**
- Modify: `js/sales.js`

- [ ] **Step 1: Tambahkan field input `saleStoreWarranty` di seluruh template form item**
  - Unit iPhone & Android (di samping / di bawah Harga Jual)
  - Aksesoris
  - Tukar Tambah (Slide 1)
  - Pre-order DP & Ready
  - Order Jasa (IMEI, Bea Cukai, iCloud)
  - Biaya / Item Lain-lain

- [ ] **Step 2: Update `collectCartItemFromEditor()` untuk menangkap `storeWarranty`**
  - Normalisasi nilai: jika diisi angka murni (misal `30`), jadikan `30 Hari`. Jika diisi `-` atau kosong, jadikan `''` (kosong).

- [ ] **Step 3: Update `collectSalesDraft()` dan `restoreSalesDraft()` agar draft form menyimpan `saleStoreWarranty`**

---

### Task 2: Tambahkan UI Selector Ukuran Struk di Modal Struk (`index.html` & `style.css`)

**Files:**
- Modify: `index.html`
- Modify: `style.css`

- [ ] **Step 1: Tambahkan segmented button ukuran 58mm & 80mm pada `#receiptModal` di `index.html`**
- [ ] **Step 2: Tambahkan styling tombol ukuran dan kontainer pratinjau struk di `style.css`**

---

### Task 3: Implementasikan Pemformatan Struk Dinamis & Multi-Ukuran (`js/receipt.js`)

**Files:**
- Modify: `js/receipt.js`

- [ ] **Step 1: Buat fungsi helper untuk menentukan lebar struk aktif (58mm = 34 karakter, 80mm = 48 karakter)**
- [ ] **Step 2: Modifikasi `receiptTransactionText()` dan `serviceOrderReceiptText()` agar menerima parameter lebar dinamis**
- [ ] **Step 3: Tambahkan pencetakan baris `Garansi Toko: X` pada setiap item struk jika `tx.storeWarranty` atau `tx.warrantyDays` bernilai aktif**
- [ ] **Step 4: Update `shareReceiptImage()` (Canvas PNG) dan `receiptPrintableHtml()` agar menyesuaikan lebar 58mm vs 80mm yang dipilih**
- [ ] **Step 5: Bind event listener tombol 58mm/80mm untuk me-re-render pratinjau struk secara instan**

---

### Task 4: Verifikasi & Testing

- [ ] **Step 1: Jalankan pengujian transaksi dengan Garansi Toko (misal 30 Hari)**
- [ ] **Step 2: Uji transaksi tanpa garansi (kosong atau `-`) dan pastikan baris garansi toko tidak muncul**
- [ ] **Step 3: Uji toggle ukuran 58mm dan 80mm pada modal struk**
