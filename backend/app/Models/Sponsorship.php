<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sponsorship extends Model
{
    protected $fillable = [
        'store_id', 'product_id', 'budget', 'daily_amount', 'spent', 'status', 'last_charged_on',
    ];

    protected $casts = [
        'budget' => 'decimal:2',
        'daily_amount' => 'decimal:2',
        'spent' => 'decimal:2',
        'last_charged_on' => 'date',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function charges(): HasMany
    {
        return $this->hasMany(SponsoredCharge::class);
    }
}
