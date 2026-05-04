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
        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 10)->unique();
            $table->string('region_name');
            $table->string('region_code', 10);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('municipalities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('province_id')
                ->constrained('provinces')
                ->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 10)->unique();
            $table->string('type', 20)->default('Mun');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['province_id', 'name']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('province_id')
                ->nullable()
                ->after('phone')
                ->constrained('provinces')
                ->nullOnDelete();
            $table->foreignId('municipality_id')
                ->nullable()
                ->after('province_id')
                ->constrained('municipalities')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('municipality_id');
            $table->dropConstrainedForeignId('province_id');
        });

        Schema::dropIfExists('municipalities');
        Schema::dropIfExists('provinces');
    }
};
