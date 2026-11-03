<?php
// Jalankan SEKALI di browser (http://localhost/loka-web/migrate.php) kalau database lama sudah pernah diimpor.
// Menambah kolom kategori, deskripsi, dan foto pada tabel menu, lalu melengkapi menu awal. Aman dijalankan berulang.
// Setelah selesai, HAPUS file ini.
require __DIR__ . '/api/config.php';
header('Content-Type: text/html; charset=utf-8');

$items = [
    ['Bakso Loka', 25000, 'Makanan', 'Bakso sapi kenyal dengan mie, bihun, dan kuah kaldu hangat.'],
    ['Mie Ayam Bakso', 27000, 'Makanan', 'Mie ayam dengan topping bakso dan pangsit goreng.'],
    ['Nasi Goreng Spesial', 28000, 'Makanan', 'Nasi goreng dengan telur, ayam suwir, dan acar.'],
    ['Mie Goreng Loka', 28000, 'Makanan', 'Mie goreng bumbu rumahan dengan telur dan sayuran.'],
    ['Chicken Katsu Rice', 32000, 'Makanan', 'Ayam katsu renyah dengan nasi hangat dan saus spesial.'],
    ['Kopi Susu Loka', 22000, 'Minuman', 'Kopi susu andalan Loka, pas menemani sesi main panjang.'],
    ['Matcha Latte', 25000, 'Minuman', 'Matcha creamy dengan susu, disajikan dingin atau hangat.'],
    ['Cappuccino', 24000, 'Minuman', 'Espresso dengan susu berbusa yang lembut.'],
    ['Es Teh Manis', 8000, 'Minuman', 'Teh dingin manis yang menyegarkan.'],
    ['Es Teh Lemon', 15000, 'Minuman', 'Teh dingin dengan perasan lemon segar.'],
    ['Es Jeruk', 12000, 'Minuman', 'Jeruk peras dengan es batu.'],
    ['Kentang Goreng', 20000, 'Cemilan', 'Kentang goreng renyah, enak dimakan sambil main.'],
    ['Roti Bakar Coklat', 18000, 'Cemilan', 'Roti bakar tebal dengan selai coklat.'],
    ['Pisang Goreng', 15000, 'Cemilan', 'Pisang goreng yang renyah di luar, lembut di dalam.'],
    ['Tahu Crispy', 16000, 'Cemilan', 'Tahu goreng tepung renyah dengan sambal.']
];

$photos = [
    'Bakso Loka' => 'img/Bakso Loka.jpeg',
    'Mie Ayam Bakso' => 'img/Mie ayam loka.jpg',
    'Nasi Goreng Spesial' => 'img/Nasi Goreng Loka spesial.jpg',
    'Mie Goreng Loka' => 'img/Mie Goreng Loka.jpg',
    'Chicken Katsu Rice' => 'img/chicken katsu loka.jpg',
    'Kopi Susu Loka' => 'img/Kopi susu loka.jpg',
    'Matcha Latte' => 'img/matcha latte.jpg',
    'Cappuccino' => 'img/capuccino loka.jpg',
    'Es Teh Manis' => 'img/es teh manis.jpg',
    'Es Teh Lemon' => 'img/es teh lemon.jpg',
    'Es Jeruk' => 'img/es jeruk.jpg',
    'Kentang Goreng' => 'img/Kentang Goreng.jpg',
    'Roti Bakar Coklat' => 'img/Roti bakar coklat.jpeg',
    'Pisang Goreng' => 'img/Pisang Goreng Sambal.jpg',
    'Tahu Crispy' => 'img/Tahu Crispy.jpeg',
];

try {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $has = function (string $col) use ($pdo): bool {
        $s = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'menu' AND COLUMN_NAME = ?");
        $s->execute([DB_NAME, $col]);
        return (int)$s->fetchColumn() > 0;
    };
    if (!$has('category')) $pdo->exec("ALTER TABLE menu ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'Makanan' AFTER price");
    if (!$has('description')) $pdo->exec("ALTER TABLE menu ADD COLUMN description VARCHAR(200) NOT NULL DEFAULT '' AFTER category");
    if (!$has('image_url')) $pdo->exec("ALTER TABLE menu ADD COLUMN image_url VARCHAR(255) NOT NULL DEFAULT '' AFTER description");

    $upd = $pdo->prepare("UPDATE menu SET category = ?, description = ? WHERE name = ? AND description = ''");
    $ins = $pdo->prepare("INSERT INTO menu (name, price, category, description) SELECT ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM menu WHERE name = ?)");
    $added = 0;
    foreach ($items as [$name, $price, $cat, $desc]) {
        $upd->execute([$cat, $desc, $name]);
        $ins->execute([$name, $price, $cat, $desc, $name]);
        $added += $ins->rowCount();
    }
    $pic = $pdo->prepare("UPDATE menu SET image_url = ? WHERE name = ? AND image_url = ''");
    foreach ($photos as $n => $f) $pic->execute([$f, $n]);
    $m = 'Migrasi selesai. Menu baru ditambahkan: ' . $added . '. Segera hapus file migrate.php ini.';
} catch (PDOException $e) {
    $m = 'Gagal: pastikan MySQL menyala dan database.sql sudah diimpor. (' . $e->getMessage() . ')';
}
echo '<!DOCTYPE html><meta charset="utf-8"><title>Migrasi Loka</title><body style="font-family:sans-serif;max-width:560px;margin:60px auto"><p>' . htmlspecialchars($m) . '</p><p><a href="index.html">Ke website</a></p>';
