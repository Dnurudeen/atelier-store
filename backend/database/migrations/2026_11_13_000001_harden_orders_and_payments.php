<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sub_orders', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('returned_at');
            $table->string('cancel_reason')->nullable()->after('cancelled_at');
            $table->string('cancelled_by', 20)->nullable()->after('cancel_reason');
            $table->string('refund_status', 20)->nullable()->after('cancelled_by'); // pending|refunded
            $table->boolean('settled_via_split')->default(false)->after('statement_id');
            $table->foreignId('clawback_statement_id')->nullable()->after('settled_via_split')
                ->constrained('statements')->nullOnDelete();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('failure_reason')->nullable()->after('status');
        });

        Schema::table('statements', function (Blueprint $table) {
            $table->decimal('adjustments', 12, 2)->default(0)->after('sponsored_fees');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->string('status_reason')->nullable()->after('status');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('rejection_reason')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('sub_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('clawback_statement_id');
            $table->dropColumn(['cancelled_at', 'cancel_reason', 'cancelled_by', 'refund_status', 'settled_via_split']);
        });
        Schema::table('payments', fn (Blueprint $table) => $table->dropColumn('failure_reason'));
        Schema::table('statements', fn (Blueprint $table) => $table->dropColumn('adjustments'));
        Schema::table('stores', fn (Blueprint $table) => $table->dropColumn('status_reason'));
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('rejection_reason'));
    }
};
