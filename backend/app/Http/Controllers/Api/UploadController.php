<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Image uploads for product galleries, store logos/banners, avatars and admin banners.
 * Files are stored on the "public" disk; large images are downscaled and saved as WebP.
 */
class UploadController extends Controller
{
    public const MAX_KB = 5120;

    public const MAX_EDGE = 1600;

    /** Which folder each purpose writes to, and who may use it. */
    private const PURPOSES = [
        'product' => ['vendor', 'admin'],
        'store' => ['vendor', 'admin'],
        'avatar' => ['customer', 'vendor', 'admin'],
        'return' => ['customer', 'vendor', 'admin'],
        'banner' => ['admin'],
        'category' => ['admin'],
        'brand' => ['admin'],
    ];

    public function store(Request $request)
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.self::MAX_KB, 'dimensions:min_width=200,min_height=200,max_width=8000,max_height=8000'],
            'purpose' => ['required', 'in:'.implode(',', array_keys(self::PURPOSES))],
        ], [
            'file.dimensions' => 'Images must be at least 200×200 pixels.',
            'file.max' => 'Images must be 5 MB or smaller.',
            'file.mimes' => 'Upload a JPG, PNG or WebP image.',
        ]);

        $role = $request->user()->role;
        if (! in_array($role, self::PURPOSES[$data['purpose']], true)) {
            return response()->json(['message' => 'You cannot upload this kind of image.'], 403);
        }

        $dir = 'uploads/'.$data['purpose'].'/'.now()->format('Y/m');
        $path = $this->save($request->file('file'), $dir);
        [$width, $height] = @getimagesize(Storage::disk('public')->path($path)) ?: [null, null];

        return response()->json([
            'data' => [
                'url' => Storage::disk('public')->url($path),
                'path' => $path,
                'width' => $width,
                'height' => $height,
            ],
        ], 201);
    }

    private function save(UploadedFile $file, string $dir): string
    {
        $name = Str::lower(Str::random(24));

        if (function_exists('imagewebp') && function_exists('imagecreatefromstring')) {
            $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
            if ($source !== false) {
                $width = imagesx($source);
                $height = imagesy($source);
                $scale = min(1, self::MAX_EDGE / max($width, $height));
                $target = $source;

                if ($scale < 1) {
                    $target = imagescale($source, (int) round($width * $scale), (int) round($height * $scale), IMG_BICUBIC);
                }

                imagepalettetotruecolor($target);
                imagealphablending($target, true);
                imagesavealpha($target, true);

                ob_start();
                imagewebp($target, null, 82);
                $bytes = (string) ob_get_clean();

                if ($bytes !== '') {
                    $path = $dir.'/'.$name.'.webp';
                    Storage::disk('public')->put($path, $bytes);

                    return $path;
                }
            }
        }

        // Fallback: store the original (already validated as an image).
        return $file->storeAs($dir, $name.'.'.$file->extension(), 'public');
    }
}
