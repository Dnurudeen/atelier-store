<?php

namespace App\Models;

use App\Support\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubOrder extends Model
{
    protected $fillable = [
        'order_id', 'store_id', 'status', 'subtotal', 'shipping_fee', 'discount',
        'total', 'commission', 'vendor_earning', 'tracking_number',
        'shipped_at', 'delivered_at', 'returned_at', 'statement_id',
        'cancelled_at', 'cancel_reason', 'cancelled_by', 'refund_status',
        'settled_via_split', 'clawback_statement_id',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'commission' => 'decimal:2',
        'vendor_earning' => 'decimal:2',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'returned_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'settled_via_split' => 'boolean',
    ];

    protected $appends = ['allowed_transitions'];

    /** Next statuses the seller may move this shipment to. */
    public function getAllowedTransitionsAttribute(): array
    {
        if ($this->status === OrderStatus::PENDING) {
            return [];
        }

        return array_values(array_intersect(OrderStatus::nextFor((string) $this->status), OrderStatus::VENDOR_SETTABLE));
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(ReturnRequest::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
