# Cara membuat Price List Studio jadi .dmg (Mac) dan .exe (Windows)

Folder ini sudah berisi aplikasi desktop (Electron). Kamu tinggal menjalankan beberapa perintah di Terminal.

## Isi folder

| File / folder | Fungsi |
|---|---|
| `app/index.html` | Aplikasi Price List Studio (sama dengan versi web) |
| `main.js`, `preload.js` | Pembungkus desktop: simpan/buka file, klik 2x file .moodify, jendela simpan |
| `package.json` | Pengaturan build: nama aplikasi, ikon, format .moodify, .dmg & .exe |
| `build/icon.png` | Ikon aplikasi (ganti dengan logo Moodifypreset kalau mau, ukuran 1024×1024) |
| `scripts/download-fonts.mjs` | Mengunduh 41 font ke dalam aplikasi supaya jalan tanpa internet |
| `.github/workflows/build.yml` | Build otomatis .dmg + .exe di GitHub (opsional) |

## Persiapan (sekali saja, di Mac mini)

1. Install **Node.js LTS** dari https://nodejs.org (pilih versi LTS, lalu Next sampai selesai).
2. Ekstrak ZIP ini, misalnya ke folder `Documents/pricelist-desktop`.
3. Buka **Terminal**, lalu masuk ke folder itu:
   ```
   cd ~/Documents/pricelist-desktop
   ```
4. Install bahan build (butuh internet, ±300 MB, 2–5 menit):
   ```
   npm install
   ```
5. Unduh font ke dalam aplikasi (butuh internet, ±1–2 menit):
   ```
   npm run fonts
   ```

## Coba jalankan dulu

```
npm start
```
Aplikasi terbuka sebagai jendela desktop. Coba: buat proyek, **⌘+S** untuk simpan, tutup, buka lagi dari Riwayat, dan export PDF.

## Buat file .dmg (Mac)

```
npm run dist:mac
```
Hasilnya ada di folder `dist/`: **Price-List-Studio-1.0.0-mac.dmg** (universal, jalan di Mac Apple Silicon maupun Intel).

## Buat file .exe (Windows)

Pilih salah satu:

**A. Lewat GitHub (disarankan, tanpa perlu PC Windows)**
1. Buat repo **private** di GitHub, upload isi folder ini (tanpa `node_modules` dan `dist`).
2. Buka tab **Actions** → **Build Price List Studio** → **Run workflow**.
3. Tunggu ±10 menit, lalu unduh hasilnya di bagian **Artifacts**: file `.exe` dan `.dmg`.

**B. Di PC/laptop Windows**
Install Node.js, salin folder ini, lalu jalankan `npm install`, `npm run fonts`, dan `npm run dist:win`. Hasilnya: `dist/Price-List-Studio-1.0.0-Setup.exe`.

## Yang perlu diketahui pembeli (tulis di panduan pembelian)

Karena aplikasi belum ditandatangani sertifikat developer, saat pertama kali dibuka akan muncul peringatan:

- **Mac:** "Price List Studio tidak dapat dibuka karena dari pengembang yang tidak dikenal".
  Cara membuka: klik kanan ikon aplikasi → **Open** → **Open**. Cukup sekali.
  Di macOS terbaru: buka **System Settings → Privacy & Security**, gulir ke bawah, klik **Open Anyway**.
- **Windows:** muncul layar biru "Windows protected your PC".
  Klik **More info** → **Run anyway**. Cukup sekali.

Peringatan ini bisa dihilangkan dengan sertifikat resmi:
- Mac: **Apple Developer Program** (USD 99/tahun) untuk tanda tangan + notarisasi.
- Windows: sertifikat **code signing** (mulai ±USD 100–300/tahun).
Tidak wajib untuk mulai jualan; banyak produk digital sekali bayar tetap memakai cara klik kanan → Open.

## Update versi berikutnya

1. Ganti `app/index.html` dengan versi terbaru.
2. Naikkan nomor versi di `package.json` (contoh `"version": "1.0.1"`).
3. Jalankan lagi `npm run dist:mac` (dan build Windows).
