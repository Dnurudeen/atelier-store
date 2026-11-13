<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $table->decimal('refund_amount', 12, 2)->default(0)->after('quantity');
            $table->decimal('seller_deduction', 12, 2)->default(0)->after('refund_amount');
            $table->string('refund_status', 20)->nullable()->after('status'); // pending|refunded
            $table->foreignId('clawback_statement_id')->nullable()->after('refund_status')->constrained('statements')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('return_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('clawback_statement_id');
            $table->dropColumn(['refund_amount', 'seller_deduction', 'refund_status']);
        });
    }
};
