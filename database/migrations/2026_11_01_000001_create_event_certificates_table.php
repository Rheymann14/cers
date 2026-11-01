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
        Schema::create('event_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')
                ->unique()
                ->constrained('events')
                ->cascadeOnDelete();
            $table->string('logo_path')->nullable();
            $table->string('appearance_background_path')->nullable();
            $table->string('participation_background_path')->nullable();
            $table->json('appearance_content')->nullable();
            $table->json('participation_content')->nullable();
            $table->json('signatories')->nullable();
            $table->foreignId('updated_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_certificates');
    }
};
