<?php

namespace App\Services;

use App\Models\Payout;
use App\Models\SponsoredCharge;
use App\Models\Statement;
use App\Models\Store;
use App\Models\SubOrder;
use Illuminate\Support\Collection;

class StatementService
{
    public function unsettledOrders(Store $store): Collection
    {
        return SubOrder::query()
            ->where('store_id', $store->id)
            ->whereNull('statement_id')
            ->whereIn('status', ['delivered', 'completed'])
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
        $earnings = (float) $this->unsettledOrders($store)->sum('vendor_earning');
        $fees = (float) $this->unsettledCharges($store)->sum('amount');

        return round($earnings - $fees, 2);
    }

    public function summary(Store $store): array
    {
        $orders = $this->unsettledOrders($store);
        $charges = $this->unsettledCharges($store);

        return [
            'pending' => round((float) $orders->sum('vendor_earning') - (float) $charges->sum('amount'), 2),
            'sales' => round((float) $orders->sum('subtotal'), 2),
            'commission' => round((float) $orders->sum('commission'), 2),
            'sponsored_fees' => round((float) $charges->sum('amount'), 2),
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
        $orders = $this->unsettledOrders($store);
        $charges = $this->unsettledCharges($store);
        if ($orders->isEmpty() && $charges->isEmpty()) {
            return null;
        }

        $sales = round((float) $orders->sum('subtotal'), 2);
        $commission = round((float) $orders->sum('commission'), 2);
        $fees = round((float) $charges->sum('amount'), 2);
        $net = round((float) $orders->sum('vendor_earning') - $fees, 2);

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

        return $statement->fresh();
    }
}
