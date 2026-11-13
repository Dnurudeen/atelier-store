<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Brand extends Model
{
    protected $fillable = ['name', 'slug', 'logo', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /** Find a brand by name (case-insensitive) or create it. */
    public static function resolve(?string $name): ?self
    {
        $name = trim((string) $name);
        if ($name === '') {
            return null;
        }

        $slug = Str::slug($name) ?: Str::lower(Str::random(6));

        return static::firstOrCreate(['slug' => $slug], ['name' => $name, 'is_active' => true]);
    }
}
