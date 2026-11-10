<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SponsoredCharge extends Model
{
    protected $fillable = [
        'sponsorship_id', 'store_id', 'amount', 'charged_on', 'statement_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'charged_on' => 'date',
    ];

    public function sponsorship(): BelongsTo
    {
        return $this->belongsTo(Sponsorship::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function statement(): BelongsTo
    {
        return $this->belongsTo(Statement::class);
    }
}
