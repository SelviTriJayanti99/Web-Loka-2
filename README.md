# Loka Boardgame Cafe: PHP + MySQL (phpMyAdmin)

Website kafe boardgame dengan katalog boardgame dan menu, pemesanan, dan booking meja. Data disimpan di database MySQL (`loka_cafe`), bisa dilihat dan diubah lewat phpMyAdmin.

## Pembagian Tugas Kelompok

| Anggota | Tugas |
|---|---|
| Selvi | Membangun website, mulai dari halaman login dan register, menghubungkan website dengan database phpMyAdmin, serta membuat katalog game dan produk. |
| Miska | Menghubungkan foto produk dan game ke localhost agar tampil di website. |
| Kia | Mencari foto produk dan game, lalu menyimpannya ke dalam folder `img`. |
| Zika | Membantu pengecekan website dan data sebelum digunakan. |

## Struktur Folder

```text
loka-web/
├── index.html
├── style.css
├── script.js
├── database.sql      # diimpor ke phpMyAdmin
├── setup.php         # membuat akun admin (hapus setelah dipakai)
├── migrate.php       # memperbarui database lama (jalankan sekali, lalu hapus)
├── img/              # foto menu dan game (opsional)
└── api/
    ├── config.php
    ├── bootstrap.php
    ├── auth.php
    ├── user.php
    ├── admin.php
    └── catalog.php
```

### Jika database sudah pernah diimpor

- Impor ulang `database.sql`. Aman: data lama tidak terhapus, dan tabel `games` (katalog boardgame) ditambahkan.
- Buka http://localhost/loka-web/migrate.php **sekali**. Langkah ini menambah kategori, deskripsi, dan foto pada menu, serta melengkapi menu awal seperti Bakso. Setelah itu **hapus `migrate.php`**.

## Fitur

**Pengunjung (tanpa login)**
- Melihat katalog boardgame: cari, filter genre, filter jumlah pemain, dan urutkan.
- Melihat katalog menu.

**Pelanggan**
- Daftar dan masuk.
- Katalog menu bergaya toko (kategori, pencarian, keranjang) yang langsung tampil setelah login.
- Memesan beberapa menu sekaligus.
- Booking meja dan membatalkannya.
- Melihat riwayat dan mengedit profil.

**Admin**
- Melihat statistik.
- Mengubah status pesanan dan booking.
- Mengelola menu: kategori, deskripsi, dan foto.
- Mengelola boardgame: judul, genre, jumlah pemain, durasi, tingkat kesulitan, dan status tersedia atau dipakai.
- Menghapus pelanggan dan melihat riwayat login.

## Foto Menu

1. Taruh foto di folder `img/`, misalnya `img/bakso.jpg`.
2. Buka Dashboard admin, pilih **Menu**, lalu isi kolom **Foto** dengan `img/bakso.jpg`.

Alamat `https://...` juga bisa dipakai. Jika foto tidak diisi, kartu menu memakai ilustrasi ikon sesuai kategori.