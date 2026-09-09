---
name: Igood Report
description: Igood Daily Financial Report & Inventory Management App
colors:
  primary: "#2563eb"
  primary-light: "#3b82f6"
  primary-soft: "#dbeafe"
  primary-glow: "#edf4ff"
  success: "#0d9488"
  warning: "#ea580c"
  danger: "#e11d48"
  info: "#0ea5e9"
  neutral-bg: "#f4f7fc"
  neutral-surface: "#ffffff"
  text: "#0f172a"
  text-secondary: "#334155"
  text-muted: "#64748b"
  border: "#cddbf3"
typography:
  display:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, sans-serif"
    fontSize: "9px"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  sm: "10px"
  md: "16px"
  lg: "18px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-light}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: Igood Report

## 1. Overview

**Creative North Star: "Indigo Command Center"**

Sistem desain ini ditargetkan untuk memberikan antarmuka kasir mobile yang sangat responsif, andal, dan taktis. Didominasi oleh warna biru indigo profesional dan abu-abu slate, sistem ini menghindari dekorasi berlebih demi mencapai kecepatan input dan kejelasan status finansial harian toko Igood.

Desain ini secara tegas menolak estetika klise AI generatif seperti glassmorphism yang mengaburkan teks, garis tepi tebal di samping kartu, serta warna latar belakang cream/sand yang hangat. Fokus utama adalah efisiensi kerja staf sales di lapangan.

**Key Characteristics:**
- Taktis dan terstruktur dengan navigasi bawah (bottom navigation) yang mudah dijangkau satu jempol.
- Kontras visual yang tinggi untuk operasional di bawah lampu toko yang terang.
- Kepadatan informasi yang seimbang, menghindari pemborosan ruang layar mobile.

## 2. Colors

Menggunakan skema warna yang dingin dan profesional untuk memastikan aplikasi terasa seperti alat kerja yang tangguh.

### Primary
- **Indigo Blue** (#2563eb): Digunakan sebagai warna fokus utama, tombol aksi primer, dan indikator aktif.
- **Light Blue** (#3b82f6): Digunakan untuk status hover dan variasi interaktif sekunder.
- **Soft Indigo Blue** (#dbeafe): Digunakan sebagai latar belakang chip atau elemen highlight halus.
- **Indigo Glow** (#edf4ff): Aksen latar belakang ekstra lembut untuk membedakan komponen aktif.

### Neutral
- **Slate Dark Ink** (#0f172a): Warna utama untuk teks tubuh (body) dan judul utama guna menjamin kontras maksimal.
- **Slate Secondary Ink** (#334155): Digunakan untuk label form dan teks sekunder.
- **Slate Muted Ink** (#64748b): Digunakan untuk teks petunjuk (placeholder) dan metadata.
- **Slate Neutral BG** (#f4f7fc): Latar belakang utama aplikasi.
- **White Surface** (#ffffff): Latar belakang kartu (card), kontainer form, dan header.
- **Blue-Slate Border** (#cddbf3): Garis batas pemisah antar elemen untuk struktur yang rapi.

### Named Rules
**The 10% Accent Rule.** Warna aksen primer (Indigo Blue) hanya boleh mencakup maksimal 10% dari luas permukaan layar apa pun. Kehadirannya adalah untuk menegaskan tindakan utama, bukan untuk menghias layar secara berlebihan.

## 3. Typography

**Display Font:** 'Inter' (dengan fallback -apple-system, BlinkMacSystemFont, sans-serif)
**Body Font:** 'Inter' (dengan fallback -apple-system, BlinkMacSystemFont, sans-serif)
**Label/Mono Font:** 'Inter' (dengan fallback -apple-system, BlinkMacSystemFont, sans-serif)

**Character:** Tipografi menggunakan satu rumpun font geometris yang bersih (Inter) untuk meminimalkan beban visual dan menjaga keterbacaan tinggi pada layar berukuran kecil.

### Hierarchy
- **Display** (Bold (800), clamp(1.5rem, 4vw, 2.5rem), 1.1): Digunakan untuk judul halaman utama (misal: "InvenGro System").
- **Headline** (Semi-Bold (600), 16px, 1.4): Judul bagian kartu atau judul form sekunder.
- **Title** (Medium (500), 14px, 1.4): Digunakan untuk sub-judul kontainer dan nama kategori barang.
- **Body** (Regular (400), 13.5px, 1.6): Untuk teks umum, nilai input, dan baris detail tabel. Panjang baris dibatasi maksimal 65-75ch.
- **Label** (Bold (700), 9px, 0.05em letter-spacing, uppercase): Digunakan untuk chip status, label atas form input, dan tombol kecil.

### Named Rules
**The Line-Height Rule.** Jangan pernah menggunakan line-height di bawah 1.1 untuk display heading dan di bawah 1.5 untuk teks isi, untuk menghindari teks yang saling tumpang tindih.

## 4. Elevation

Aplikasi ini menggunakan pendekatan kedalaman murni datar pada kondisi diam (*Flat-by-default*). Kedalaman visual dan pemisahan lapisan (layering) utamanya diwujudkan lewat perbedaan warna latar belakang dan garis batas (*border*).

### Shadow Vocabulary
- **Ambient Low** (`box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05)`): Digunakan untuk memberikan kedalaman halus pada header.
- **Interaction Hover** (`box-shadow: 0 16px 34px -18px rgba(15, 23, 42, 0.22)`): Bayangan yang muncul ketika kartu menu atau tombol utama ditekan atau di-hover.

### Named Rules
**The Flat-At-Rest Rule.** Semua kartu kontainer dan form harus datar secara visual pada kondisi diam. Bayangan hanya boleh muncul sebagai respons terhadap tindakan pengguna (hover/active) untuk menegaskan interaktivitas.

## 5. Components

### Buttons
- **Shape:** Sudut membulat sedang (10px)
- **Primary:** Latar belakang Indigo Blue (#2563eb), teks putih, padding (10px 16px).
- **Hover / Focus:** Latar belakang Light Blue (#3b82f6) dengan transisi halus (0.18s). Fokus ring luar setebal 2px menggunakan Indigo Blue.
- **Ghost / Icon Button:** Latar belakang transparan, border 1px solid Slate Border, warna teks Slate Dark Ink.

### Cards / Containers
- **Corner Style:** Sudut membulat lebar (16px)
- **Background:** White Surface (#ffffff)
- **Shadow Strategy:** Datar (flat) di kondisi diam, menggunakan border tipis 1px (#cddbf3) sebagai pembatas.
- **Internal Padding:** Spasi sedang (16px)

### Inputs / Fields
- **Style:** Latar belakang White Surface (#ffffff), border 1px solid Blue-Slate Border (#cddbf3), sudut membulat sedang (10px).
- **Focus:** Border berubah menjadi Indigo Blue (#2563eb) disertai outline luar tipis.
- **Error:** Border berwarna Rose Danger (#e11d48) dengan pesan teks pembantu yang jelas di bawahnya.

### Navigation
- **Bottom Nav:** Grid 4 kolom setinggi 60px, menempel di bagian bawah layar mobile dengan area aman (`safe-area-inset-bottom`). Ikon setinggi 24px berada di atas teks menu berukuran 10px. Item aktif menggunakan warna Indigo Blue (#2563eb).

## 6. Do's and Don'ts

### Do:
- **Do** gunakan rasio kontras teks minimal 4.5:1 terhadap latar belakang untuk memastikan teks di kasir terbaca jelas.
- **Do** berikan target sentuh minimal 44x44px untuk semua tombol interaktif.
- **Do** gunakan transisi linear/ease-out dengan durasi di bawah 200ms untuk semua animasi interaksi agar terasa instan.

### Don't:
- **Don't** gunakan glassmorphism berlebihan (efek blur transparan) yang dapat mengaburkan teks penting laporan keuangan.
- **Don't** gunakan garis tepi tebal di samping kartu (side-stripe borders) sebagai penanda kategori; gunakan border utuh yang bersih.
- **Don't** gunakan teks gradasi (gradient text) atau latar belakang bertema cream/sand hangat yang merusak konsistensi warna profesional Slate/Indigo.
- **Don't** biarkan teks judul yang panjang meluap (overflow) di layar mobile sempit; gunakan skala font dinamis atau pemendekan kata.
