<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use SoftDeletes;

    public const CONDITIONS = ['new', 'refurbished', 'used'];

    protected $fillable = [
        'store_id', 'category_id', 'brand_id', 'name', 'slug', 'sku', 'condition', 'description',
        'key_features', 'whats_in_box', 'warranty', 'specs', 'price', 'compare_at_price', 'sale_ends_at',
        'stock', 'weight_kg', 'length_cm', 'width_cm', 'height_cm', 'meta_title', 'meta_description',
        'status', 'rejection_reason', 'is_featured', 'rating', 'reviews_count', 'sold_count', 'low_stock_threshold',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'sale_ends_at' => 'datetime',
        'specs' => 'array',
        'is_featured' => 'boolean',
        'rating' => 'decimal:2',
        'weight_kg' => 'decimal:3',
        'length_cm' => 'decimal:2',
        'width_cm' => 'decimal:2',
        'height_cm' => 'decimal:2',
    ];

    protected $appends = ['spec_list'];

    /**
     * Specifications as an ordered list of {label, value}.
     * Accepts both the new list format and the legacy {medium, dimensions, materials} object.
     */
    public function getSpecListAttribute(): array
    {
        return self::normalizeSpecs($this->specs);
    }

    public static function normalizeSpecs(mixed $specs): array
    {
        if (! is_array($specs)) {
            return [];
        }

        $rows = [];
        if (array_is_list($specs)) {
            foreach ($specs as $row) {
                $label = trim((string) ($row['label'] ?? ''));
                $value = trim((string) ($row['value'] ?? ''));
                if ($label !== '' && $value !== '') {
                    $rows[] = ['label' => $label, 'value' => $value];
                }
            }

            return $rows;
        }

        foreach ($specs as $key => $value) {
            if (is_scalar($value) && trim((string) $value) !== '') {
                $rows[] = ['label' => Str::headline((string) $key), 'value' => trim((string) $value)];
            }
        }

        return $rows;
    }

    /** Product stock mirrors the sum of its variants when it has any. */
    public function syncStockFromVariants(): void
    {
        if ($this->variants()->exists()) {
            $this->stock = (int) $this->variants()->sum('stock');
            $this->save();
        }
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function sponsorships(): HasMany
    {
        return $this->hasMany(Sponsorship::class);
    }

    public function activeSponsorship(): HasOne
    {
        return $this->hasOne(Sponsorship::class)->where('status', 'active');
    }
}
