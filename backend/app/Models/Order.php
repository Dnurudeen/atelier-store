<?php

namespace App\Models;

use App\Support\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'order_number', 'user_id', 'address_id', 'status', 'payment_status',
        'subtotal', 'shipping_total', 'total', 'paystack_reference', 'shipping_snapshot',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_total' => 'decimal:2',
        'total' => 'decimal:2',
        'shipping_snapshot' => 'array',
    ];

    /** Recompute the customer-facing status from the per-seller shipments. */
    public function syncStatus(): void
    {
        $statuses = $this->subOrders()->pluck('status')->all();
        $status = OrderStatus::rollUp($statuses, (string) $this->payment_status);
        if ($status !== $this->status) {
            $this->status = $status;
            $this->save();
        }
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function address(): BelongsTo
    {
        return $this->belongsTo(Address::class);
    }

    public function subOrders(): HasMany
    {
        return $this->hasMany(SubOrder::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }
}
