<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SubOrder;
use App\Support\OrderStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * Move a seller shipment to a new status, enforcing the lifecycle rules.
     *
     * @param  string  $actor  vendor|customer|admin|system
     * @param  array{tracking_number?: ?string, reason?: ?string}  $extra
     */
    public function transition(SubOrder $subOrder, string $to, string $actor, array $extra = []): SubOrder
    {
        return DB::transaction(function () use ($subOrder, $to, $actor, $extra) {
            /** @var SubOrder $subOrder */
            $subOrder = SubOrder::with('order', 'items')->lockForUpdate()->findOrFail($subOrder->id);
            $from = (string) $subOrder->status;
            $to = $to === 'completed' ? OrderStatus::DELIVERED : $to;

            // Re-sending the current status only updates the tracking number.
            if ($from === $to) {
                if ($to === OrderStatus::SHIPPED && ! empty($extra['tracking_number'])) {
                    $subOrder->tracking_number = $extra['tracking_number'];
                    $subOrder->save();
                }

                return $subOrder;
            }

            if ($actor !== 'system' && $subOrder->order?->payment_status !== 'paid' && $to !== OrderStatus::CANCELLED) {
                throw ValidationException::withMessages([
                    'status' => ['This order has not been paid yet.'],
                ]);
            }

            if (! OrderStatus::canTransition($from, $to)) {
                throw ValidationException::withMessages([
                    'status' => ["An order that is {$from} cannot be marked {$to}."],
                ]);
            }

            if ($actor === 'customer' && ! ($to === OrderStatus::CANCELLED && OrderStatus::customerCancellable($from))) {
                throw ValidationException::withMessages([
                    'status' => ['This order can no longer be cancelled.'],
                ]);
            }

            $subOrder->status = $to;

            if (array_key_exists('tracking_number', $extra) && $extra['tracking_number']) {
                $subOrder->tracking_number = $extra['tracking_number'];
            }

            match ($to) {
                OrderStatus::SHIPPED => $subOrder->shipped_at ??= now(),
                OrderStatus::DELIVERED => [$subOrder->shipped_at ??= now(), $subOrder->delivered_at ??= now()],
                OrderStatus::RETURNED => $subOrder->returned_at ??= now(),
                default => null,
            };

            if ($to === OrderStatus::CANCELLED) {
                $subOrder->cancelled_at = now();
                $subOrder->cancelled_by = $actor;
                $subOrder->cancel_reason = $extra['reason'] ?? null;
                if ($subOrder->order?->payment_status === 'paid') {
                    $subOrder->refund_status = 'pending';
                }
                $this->releaseStock($subOrder);
            }

            if ($to === OrderStatus::RETURNED && $subOrder->order?->payment_status === 'paid') {
                $subOrder->refund_status = 'pending';
            }

            $subOrder->save();
            $subOrder->order?->syncStatus();

            return $subOrder;
        });
    }

    /** Put reserved stock back on the shelf. */
    public function releaseStock(SubOrder $subOrder): void
    {
        foreach ($subOrder->items as $item) {
            if ($item->product_variant_id) {
                ProductVariant::where('id', $item->product_variant_id)->increment('stock', $item->quantity);
            }
            Product::where('id', $item->product_id)->increment('stock', $item->quantity);
        }
    }

    /**
     * Expire unpaid checkouts older than $minutes and release their stock.
     */
    public function expireStalePending(int $minutes = 30): int
    {
        $count = 0;

        Order::query()
            ->where('payment_status', 'pending')
            ->where('created_at', '<', now()->subMinutes($minutes))
            ->orderBy('id')
            ->each(function (Order $order) use (&$count) {
                if ($this->expireOrder($order, 'abandoned')) {
                    $count++;
                }
            });

        return $count;
    }

    /** Mark an unpaid order as failed/expired and release its stock. Returns false if it was already settled. */
    public function expireOrder(Order $order, string $paymentStatus = 'failed', ?string $reason = null): bool
    {
        return DB::transaction(function () use ($order, $paymentStatus, $reason) {
            $order = Order::with('subOrders.items')->lockForUpdate()->find($order->id);
            if (! $order || $order->payment_status !== 'pending') {
                return false;
            }

            foreach ($order->subOrders as $subOrder) {
                if ($subOrder->status !== OrderStatus::PENDING) {
                    continue;
                }
                $this->releaseStock($subOrder);
                $subOrder->status = OrderStatus::EXPIRED;
                $subOrder->save();
            }

            $order->payment_status = $paymentStatus;
            $order->save();
            $order->syncStatus();

            Payment::where('order_id', $order->id)->where('status', 'pending')->update([
                'status' => $paymentStatus === 'abandoned' ? 'abandoned' : 'failed',
                'failure_reason' => $reason,
            ]);

            return true;
        });
    }
}
