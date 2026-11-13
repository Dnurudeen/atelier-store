<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

/*
 * Serve uploaded media when the public/storage symlink is missing (e.g. Windows dev
 * machines or hosts where `php artisan storage:link` is not allowed). When the symlink
 * exists the web server serves the file directly and this route is never hit.
 */
Route::get('/storage/{path}', function (string $path) {
    abort_if(str_contains($path, '..'), 404);
    $disk = Storage::disk('public');
    abort_unless($disk->exists($path), 404);

    return response()->file($disk->path($path), [
        'Cache-Control' => 'public, max-age=31536000, immutable',
        'X-Content-Type-Options' => 'nosniff',
    ]);
})->where('path', '^uploads/.*');
