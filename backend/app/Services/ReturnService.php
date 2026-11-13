<?php

namespace App\Services;

use App\Models\InboxNotification;
use App\Models\OrderItem;
use App\Models\ReturnRequest;
use App\Models\SubOrder;
use App\Models\User;
use App\Support\OrderStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Return lifecycle:
 *   requested → approved (seller) → received (seller; refund due) → [refund issued by admin]
 *   requested → rejected (seller) → escalated (customer) → approved | resolved (admin)
 */
class ReturnService
{
    public const WINDOW_DAYS = 7;

    public function __construct(private OrderService $orders) {}

    public function request(User $user, SubOrder $subOrder, OrderItem $item, int $quantity, string $reason, ?string $details, array $photos): ReturnRequest
    {
        $subOrder->loadMissing('order');
        $fail = fn (string $msg) => throw ValidationException::withMessages(['return' => [$msg]]);

        if ($subOrder->order?->user_id !== $user->id || $item->sub_order_id !== $subOrder->id) {
            abort(404);
        }
        if (! in_array($subOrder->status, OrderStatus::EARNED, true)) {
            $fail('You can return items once they have been delivered.');
        }
        if ($subOrder->delivered_at && $subOrder->delivered_at->lt(now()->subDays(self::WINDOW_DAYS))) {
            $fail('The '.self::WINDOW_DAYS.'-day return window for this item has closed.');
        }

        $alreadyReturning = ReturnRequest::where('order_item_id', $item->id)
            ->whereNotIn('status', ['rejected', 'resolved'])
            ->sum('quantity');
        if ($quantity > $item->quantity - $alreadyReturning) {
            $fail('You have already requested a return for this item.');
        }

        $return = ReturnRequest::create([
            'sub_order_id' => $subOrder->id,
            'order_item_id' => $item->id,
            'user_id' => $user->id,
            'store_id' => $subOrder->store_id,
            'quantity' => $quantity,
            'refund_amount' => round((float) $item->unit_price * $quantity, 2),
            'reason' => $reason,
            'details' => $details,
            'photos' => $photos ?: null,
            'status' => 'requested',
        ]);

        InboxNotification::notify(
            $subOrder->store?->user_id,
            'return',
            'New return request',
            "{$user->name} wants to return {$quantity} × {$item->product_name} ({$return->reason_label}).",
            '/vendor/returns'
        );

        return $return;
    }

    /** Seller decision on a fresh request, or marking an approved return as received. */
    public function sellerAction(ReturnRequest $return, string $action, ?string $note): ReturnRequest
    {
        return DB::transaction(function () use ($return, $action, $note) {
            $return = ReturnRequest::with('subOrder.order', 'item')->lockForUpdate()->findOrFail($return->id);

            $allowed = ['approve' => ['requested'], 'reject' => ['requested'], 'receive' => ['approved']];
            if (! in_array($return->status, $allowed[$action] ?? [], true)) {
                throw ValidationException::withMessages(['action' => ["This return is {$return->status} and cannot be {$action}d."]]);
            }
            if ($action === 'reject' && ! $note) {
                throw ValidationException::withMessages(['note' => ['Tell the customer why the return was declined.']]);
            }

            $return->vendor_note = $note ?? $return->vendor_note;
            $return->status = match ($action) {
                'approve' => 'approved',
                'reject' => 'rejected',
                'receive' => 'received',
            };

            if ($action === 'receive') {
                $this->completeRefund($return);
            }

            $return->save();
            $this->notifyCustomer($return);

            return $return;
        });
    }

    public function escalate(ReturnRequest $return, User $user, ?string $note): ReturnRequest
    {
        if ($return->user_id !== $user->id) {
            abort(404);
        }
        if ($return->status !== 'rejected') {
            throw ValidationException::withMessages(['return' => ['Only declined returns can be escalated.']]);
        }
        $return->update(['status' => 'escalated', 'details' => trim(($return->details ?? '')."\n\nEscalation: ".($note ?? ''))]);

        return $return;
    }

    /** Admin arbitration of an escalated (or any open) return. */
    public function adminResolve(ReturnRequest $return, string $decision, ?string $note): ReturnRequest
    {
        return DB::transaction(function () use ($return, $decision, $note) {
            $return = ReturnRequest::with('subOrder.order', 'item')->lockForUpdate()->findOrFail($return->id);
            if (! in_array($return->status, ReturnRequest::OPEN, true) && $return->status !== 'rejected') {
                throw ValidationException::withMessages(['decision' => ['This return is already closed.']]);
            }

            $return->admin_note = $note;
            if ($decision === 'approve') {
                $return->status = 'approved';
            } elseif ($decision === 'refund') {
                $return->status = 'received';
                $this->completeRefund($return);
            } else {
                $return->status = 'resolved';
                $return->resolved_at = now();
            }
            $return->save();
            $this->notifyCustomer($return);

            return $return;
        });
    }

    /**
     * Item is back with the seller: refund is due to the customer, and the seller's share
     * is deducted. A full return of the shipment flips the shipment to "returned".
     */
    private function completeRefund(ReturnRequest $return): void
    {
        $sub = $return->subOrder;
        $return->refund_status = 'pending';
        $return->resolved_at = now();

        $returnedQty = ReturnRequest::where('sub_order_id', $sub->id)
            ->whereIn('status', ['received'])
            ->where('id', '!=', $return->id)
            ->sum('quantity') + $return->quantity;
        $totalQty = (int) $sub->items()->sum('quantity');

        if ($returnedQty >= $totalQty && in_array($sub->status, OrderStatus::EARNED, true)) {
            // Whole shipment back: the shipment-level clawback covers the seller's full earning.
            $this->orders->transition($sub, OrderStatus::RETURNED, 'system');
            $return->seller_deduction = 0;
        } else {
            $subtotal = max(0.01, (float) $sub->subtotal);
            $commissionShare = (float) $sub->commission / $subtotal;
            $return->seller_deduction = round((float) $return->refund_amount * (1 - $commissionShare), 2);
        }
    }

    private function notifyCustomer(ReturnRequest $return): void
    {
        $messages = [
            'approved' => ['Return approved', 'Please send the item back to the seller. Your refund starts once it arrives.'],
            'rejected' => ['Return declined', $return->vendor_note ? "Seller's note: {$return->vendor_note}. You can escalate this to Atelier." : 'You can escalate this to Atelier.'],
            'received' => ['Refund on its way', 'The seller received your item. Your refund of ₦'.number_format((float) $return->refund_amount).' is being processed.'],
            'resolved' => ['Return closed', $return->admin_note ?: 'Atelier reviewed your return and closed the case.'],
        ];
        if (! isset($messages[$return->status])) {
            return;
        }
        [$title, $body] = $messages[$return->status];
        InboxNotification::notify($return->user_id, 'return', $title, $body, '/account/returns');
    }
}
