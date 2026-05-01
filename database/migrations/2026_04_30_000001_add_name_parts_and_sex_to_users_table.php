<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('given_name')->nullable()->after('name');
            $table->string('middle_name')->nullable()->after('given_name');
            $table->string('surname')->nullable()->after('middle_name');
            $table->string('sex')->nullable()->after('participant_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'given_name',
                'middle_name',
                'surname',
                'sex',
            ]);
        });
    }
};
