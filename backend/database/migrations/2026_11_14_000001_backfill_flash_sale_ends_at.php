<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Older production catalogues had compare_at_price deals without sale_ends_at,
        // so the home Flash Sales rail never received flash_ends_at for the countdown.
        $rows = DB::table('products')
            ->whereNull('deleted_at')
            ->where('status', 'published')
            ->whereNotNull('compare_at_price')
            ->whereColumn('compare_at_price', '>', 'price')
            ->whereNull('sale_ends_at')
            ->select(['id'])
            ->orderBy('id')
            ->get();

        foreach ($rows as $i => $row) {
            DB::table('products')->where('id', $row->id)->update([
                'sale_ends_at' => now('Africa/Lagos')
                    ->addDays(1 + ($i % 5))
                    ->endOfDay()
                    ->utc(),
            ]);
        }
    }

    public function down(): void
    {
        // Intentionally left blank: clearing timers would hide the countdown again.
    }
};
