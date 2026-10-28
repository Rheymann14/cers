<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Stable Auther Space subject identifier (OIDC `sub`).
            $table->uuid('auther_sub')->nullable()->unique()->after('id');
            // SSO users never get a local password.
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['auther_sub']);
            $table->dropColumn('auther_sub');
        });
    }
};
