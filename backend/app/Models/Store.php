<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    protected $fillable = [
        'user_id', 'name', 'slug', 'logo', 'banner', 'bio', 'location',
        'status', 'status_reason', 'shipping_fee', 'rating', 'bank_name', 'account_number',
        'account_name', 'paystack_subaccount_code',
    ];

    /** Payout details are private: never serialise them on public endpoints. */
    public const PRIVATE_FIELDS = ['bank_name', 'account_number', 'account_name', 'paystack_subaccount_code'];

    protected $hidden = self::PRIVATE_FIELDS;

    protected $casts = [
        'shipping_fee' => 'decimal:2',
        'rating' => 'decimal:2',
    ];

    /** Reveal payout details (owner / admin views only), with the account number masked. */
    public function withPrivateDetails(bool $mask = true): static
    {
        $this->makeVisible(self::PRIVATE_FIELDS);
        if ($mask && $this->account_number) {
            $this->setAttribute('account_number_masked', str_repeat('*', max(0, strlen($this->account_number) - 4)).substr($this->account_number, -4));
        }

        return $this;
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function subOrders(): HasMany
    {
        return $this->hasMany(SubOrder::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(Payout::class);
    }
}
