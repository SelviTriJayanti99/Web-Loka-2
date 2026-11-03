<?php
// Katalog publik: tidak perlu login.
require __DIR__ . '/bootstrap.php';

try {
    switch (action()) {
        case 'games':
            out(['games' => db()->query('SELECT id, title, genre, min_players, max_players, duration, difficulty, description, is_available
                FROM games WHERE is_active = 1 ORDER BY title')->fetchAll()]);

        case 'menu':
            out(['menu' => db()->query('SELECT id, name, price, category, description, image_url FROM menu WHERE is_active = 1 ORDER BY name')->fetchAll()]);

        default:
            fail('Aksi tidak dikenal.', 404);
    }
} catch (PDOException $e) {
    fail('Katalog belum siap. Impor ulang database.sql di phpMyAdmin, lalu buka migrate.php sekali (aman, data lama tidak terhapus).', 500);
}
