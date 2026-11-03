<?php
require __DIR__ . '/bootstrap.php';
$u = require_login();
$uid = (int)$u['id'];

switch (action()) {
    case 'menu':
        try {
            $r = db()->query('SELECT id, name, price, category, description, image_url FROM menu WHERE is_active = 1 ORDER BY name')->fetchAll();
        } catch (PDOException $e) {
            fail('Tabel menu perlu diperbarui. Buka migrate.php sekali di browser.', 500);
        }
        out(['menu' => $r]);

    case 'history':
        $o = db()->prepare('SELECT id, item_name, qty, total, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC');
        $o->execute([$uid]);
        $b = db()->prepare('SELECT id, booking_date, booking_time, people, status, created_at FROM bookings WHERE user_id = ? ORDER BY created_at DESC, id DESC');
        $b->execute([$uid]);
        out(['orders' => $o->fetchAll(), 'bookings' => $b->fetchAll()]);

    case 'order':
        $d = body();
        $menuId = (int)($d['menu_id'] ?? 0);
        $qty = (int)($d['qty'] ?? 0);
        if ($qty < 1 || $qty > 50) fail('Jumlah harus 1-50.');
        $s = db()->prepare('SELECT id, name, price FROM menu WHERE id = ? AND is_active = 1');
        $s->execute([$menuId]);
        $m = $s->fetch();
        if (!$m) fail('Menu tidak tersedia.', 404);
        $total = (int)$m['price'] * $qty;
        db()->prepare('INSERT INTO orders (user_id, menu_id, item_name, qty, total) VALUES (?, ?, ?, ?, ?)')
            ->execute([$uid, $m['id'], $m['name'], $qty, $total]);
        out(['qty' => $qty, 'item' => $m['name'], 'total' => $total]);

    case 'order_batch':
        $d = body();
        $items = $d['items'] ?? [];
        if (!is_array($items) || !$items || count($items) > 30) fail('Keranjang kosong atau terlalu banyak item.');
        $merged = [];
        foreach ($items as $it) {
            $id = (int)($it['menu_id'] ?? 0);
            $q = (int)($it['qty'] ?? 0);
            if ($q < 1 || $q > 50) fail('Jumlah tiap menu harus 1-50.');
            $merged[$id] = min(50, ($merged[$id] ?? 0) + $q);
        }
        $pdo = db();
        $sel = $pdo->prepare('SELECT id, name, price FROM menu WHERE id = ? AND is_active = 1');
        $ins = $pdo->prepare('INSERT INTO orders (user_id, menu_id, item_name, qty, total) VALUES (?, ?, ?, ?, ?)');
        $grand = 0;
        $pdo->beginTransaction();
        try {
            foreach ($merged as $id => $q) {
                $sel->execute([$id]);
                $m = $sel->fetch();
                if (!$m) throw new RuntimeException('Ada menu yang sudah tidak tersedia. Muat ulang halaman.');
                $total = (int)$m['price'] * $q;
                $ins->execute([$uid, $m['id'], $m['name'], $q, $total]);
                $grand += $total;
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            if ($e instanceof RuntimeException) fail($e->getMessage(), 409);
            fail('Pesanan gagal disimpan. Coba lagi.', 500);
        }
        out(['items' => count($merged), 'total' => $grand]);

    case 'booking':
        $d = body();
        $date = (string)($d['date'] ?? '');
        $time = (string)($d['time'] ?? '');
        $people = (int)($d['people'] ?? 0);
        $dt = DateTime::createFromFormat('Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date) fail('Tanggal tidak valid.');
        if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) fail('Jam tidak valid.');
        if ($people < 1 || $people > 12) fail('Jumlah orang harus 1-12.');
        if ($date < date('Y-m-d')) fail('Tanggal booking tidak boleh kemarin.');
        db()->prepare('INSERT INTO bookings (user_id, booking_date, booking_time, people) VALUES (?, ?, ?, ?)')
            ->execute([$uid, $date, $time . ':00', $people]);
        out(['people' => $people, 'date' => $date, 'time' => $time]);

    case 'cancel':
        $d = body();
        $id = (int)($d['id'] ?? 0);
        if (($d['type'] ?? '') === 'order') {
            $s = db()->prepare("UPDATE orders SET status = 'dibatalkan' WHERE id = ? AND user_id = ? AND status = 'baru'");
        } elseif (($d['type'] ?? '') === 'booking') {
            $s = db()->prepare("UPDATE bookings SET status = 'dibatalkan' WHERE id = ? AND user_id = ? AND status = 'menunggu'");
        } else {
            fail('Jenis tidak dikenal.');
        }
        $s->execute([$id, $uid]);
        if (!$s->rowCount()) fail('Tidak bisa dibatalkan (sudah diproses atau bukan milik kamu).', 409);
        out(['ok' => true]);

    case 'profile':
        $d = body();
        $name = trim((string)($d['name'] ?? ''));
        $phone = trim((string)($d['phone'] ?? ''));
        if ($name === '' || $phone === '') fail('Nama dan nomor tidak boleh kosong.');
        if (mb_strlen($name) > 100) fail('Nama terlalu panjang.');
        if (!preg_match('/^[0-9+][0-9\s-]{8,15}$/', $phone)) fail('Nomor WhatsApp belum benar.');
        db()->prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')->execute([$name, $phone, $uid]);
        out(['user' => public_user(current_user())]);

    default:
        fail('Aksi tidak dikenal.', 404);
}
