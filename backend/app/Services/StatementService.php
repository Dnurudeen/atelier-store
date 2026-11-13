<?php

namespace App\Services;

use App\Models\Payout;
use App\Models\SponsoredCharge;
use App\Models\Statement;
use App\Models\Store;
use App\Models\SubOrder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StatementService
{
    public function unsettledOrders(Store $store): Collection
    {
        return SubOrder::query()
            ->where('store_id', $store->id)
            ->whereNull('statement_id')
            ->whereIn('status', ['delivered', 'completed'])
            ->where('settled_via_split', false)
            ->whereHas('order', fn ($query) => $query->where('payment_status', 'paid'))
            ->get();
    }

    /** Shipments returned after they were already paid out: their earning is deducted next time. */
    public function unsettledClawbacks(Store $store): Collection
    {
        return SubOrder::query()
            ->where('store_id', $store->id)
            ->whereNotNull('statement_id')
            ->whereNull('clawback_statement_id')
            ->where('status', 'returned')
            ->get();
    }

    public function unsettledCharges(Store $store): Collection
    {
        return SponsoredCharge::query()
            ->where('store_id', $store->id)
            ->whereNull('statement_id')
            ->get();
    }

    public function pending(Store $store): float
    {
        return $this->summary($store)['pending'];
    }

    public function summary(Store $store): array
    {
        $orders = $this->unsettledOrders($store);
        $charges = $this->unsettledCharges($store);
        $clawbacks = (float) $this->unsettledClawbacks($store)->sum('vendor_earning');

        return [
            'pending' => round((float) $orders->sum('vendor_earning') - (float) $charges->sum('amount') - $clawbacks, 2),
            'sales' => round((float) $orders->sum('subtotal'), 2),
            'commission' => round((float) $orders->sum('commission'), 2),
            'sponsored_fees' => round((float) $charges->sum('amount'), 2),
            'adjustments' => round(-$clawbacks, 2),
        ];
    }

    /**
     * Close every store whose delivered earnings still cover open charges.
     *
     * @return array<int, Statement>
     */
    public function closeOpenBalances(): array
    {
        $created = [];

        Store::query()->where('status', 'approved')->orderBy('id')->each(function (Store $store) use (&$created) {
            $statement = $this->closeStore($store);
            if ($statement) {
                $created[] = $statement;
            }
        });

        return $created;
    }

    public function closeStore(Store $store): ?Statement
    {
        return DB::transaction(function () use ($store) {
            $orders = $this->unsettledOrders($store);
            $charges = $this->unsettledCharges($store);
            $clawbacks = $this->unsettledClawbacks($store);
            if ($orders->isEmpty() && $charges->isEmpty()) {
                return null;
            }

            $sales = round((float) $orders->sum('subtotal'), 2);
            $commission = round((float) $orders->sum('commission'), 2);
            $fees = round((float) $charges->sum('amount'), 2);
            $adjustments = round(-(float) $clawbacks->sum('vendor_earning'), 2);
            $net = round((float) $orders->sum('vendor_earning') - $fees + $adjustments, 2);

            if ($net <= 0) {
                return null;
            }

            $statement = Statement::create([
                'store_id' => $store->id,
                'period_start' => now()->startOfWeek()->toDateString(),
                'period_end' => now()->toDateString(),
                'sales' => $sales,
                'commission' => $commission,
                'sponsored_fees' => $fees,
                'adjustments' => $adjustments,
                'net' => $net,
                'status' => 'pending',
            ]);

            Payout::create([
                'store_id' => $store->id,
                'statement_id' => $statement->id,
                'amount' => $net,
                'commission' => $commission,
                'status' => 'pending',
            ]);

            SubOrder::whereIn('id', $orders->pluck('id'))->update(['statement_id' => $statement->id]);
            SponsoredCharge::whereIn('id', $charges->pluck('id'))->update(['statement_id' => $statement->id]);
            SubOrder::whereIn('id', $clawbacks->pluck('id'))->update(['clawback_statement_id' => $statement->id]);

            return $statement->fresh();
        });
    }
}
