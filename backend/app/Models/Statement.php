<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Statement extends Model
{
    protected $fillable = [
        'store_id', 'period_start', 'period_end', 'sales', 'commission',
        'sponsored_fees', 'adjustments', 'net', 'status',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'sales' => 'decimal:2',
        'commission' => 'decimal:2',
        'sponsored_fees' => 'decimal:2',
        'net' => 'decimal:2',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(Payout::class);
    }
}
