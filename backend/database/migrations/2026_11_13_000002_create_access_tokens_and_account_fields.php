<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120)->default('web');
            $table->string('token', 64)->unique(); // sha256 of the secret part
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('email_verification_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('role'); // active|suspended
            $table->boolean('newsletter_opt_in')->default(false)->after('status');
            $table->timestamp('last_login_at')->nullable()->after('newsletter_opt_in');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['api_token']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('api_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('api_token', 80)->nullable()->unique();
            $table->dropColumn(['status', 'newsletter_opt_in', 'last_login_at']);
        });
        Schema::dropIfExists('email_verification_tokens');
        Schema::dropIfExists('personal_access_tokens');
    }
};
