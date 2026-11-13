<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReturnRequest extends Model
{
    public const REASONS = [
        'damaged' => 'Item arrived damaged',
        'wrong_item' => 'Wrong item delivered',
        'not_as_described' => 'Not as described',
        'missing_parts' => 'Missing parts or accessories',
        'size_fit' => 'Size or fit issue',
        'changed_mind' => 'Changed my mind',
    ];

    public const OPEN = ['requested', 'approved', 'escalated'];

    protected $fillable = [
        'sub_order_id', 'order_item_id', 'user_id', 'store_id', 'quantity', 'reason', 'details',
        'photos', 'status', 'vendor_note', 'admin_note', 'resolved_at',
    ];

    protected $casts = [
        'photos' => 'array',
        'resolved_at' => 'datetime',
    ];

    protected $appends = ['reason_label'];

    public function getReasonLabelAttribute(): string
    {
        return self::REASONS[$this->reason] ?? ucfirst(str_replace('_', ' ', (string) $this->reason));
    }

    public function subOrder(): BelongsTo
    {
        return $this->belongsTo(SubOrder::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class, 'order_item_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
