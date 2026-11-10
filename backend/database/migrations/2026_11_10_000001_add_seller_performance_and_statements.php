<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->timestamp('sale_ends_at')->nullable()->after('compare_at_price');
            $table->json('specs')->nullable()->after('description');
        });

        Schema::create('statements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('sales', 12, 2)->default(0);
            $table->decimal('commission', 12, 2)->default(0);
            $table->decimal('sponsored_fees', 12, 2)->default(0);
            $table->decimal('net', 12, 2)->default(0);
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        Schema::table('sub_orders', function (Blueprint $table) {
            $table->timestamp('shipped_at')->nullable()->after('tracking_number');
            $table->timestamp('delivered_at')->nullable()->after('shipped_at');
            $table->timestamp('returned_at')->nullable()->after('delivered_at');
            $table->foreignId('statement_id')->nullable()->after('returned_at')->constrained('statements')->nullOnDelete();
        });

        Schema::table('payouts', function (Blueprint $table) {
            $table->foreignId('statement_id')->nullable()->after('sub_order_id')->constrained('statements')->nullOnDelete();
        });

        Schema::create('sponsorships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('budget', 12, 2);
            $table->decimal('daily_amount', 12, 2)->default(500);
            $table->decimal('spent', 12, 2)->default(0);
            $table->string('status')->default('active');
            $table->date('last_charged_on')->nullable();
            $table->timestamps();
        });

        Schema::create('sponsored_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sponsorship_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('charged_on');
            $table->foreignId('statement_id')->nullable()->constrained('statements')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsored_charges');
        Schema::dropIfExists('sponsorships');

        Schema::table('payouts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('statement_id');
        });

        Schema::table('sub_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('statement_id');
            $table->dropColumn(['shipped_at', 'delivered_at', 'returned_at']);
        });

        Schema::dropIfExists('statements');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['sale_ends_at', 'specs']);
        });
    }
};
