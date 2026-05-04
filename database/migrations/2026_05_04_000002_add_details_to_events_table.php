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
        Schema::table('events', function (Blueprint $table) {
            $table->text('description')->nullable()->after('slug');
            $table->dateTime('starts_at')->nullable()->after('description');
            $table->dateTime('ends_at')->nullable()->after('starts_at');
            $table->string('image_path')->nullable()->after('ends_at');
            $table->string('pdf_path')->nullable()->after('image_path');
            $table->text('kit_materials')->nullable()->after('pdf_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'description',
                'starts_at',
                'ends_at',
                'image_path',
                'pdf_path',
                'kit_materials',
            ]);
        });
    }
};
