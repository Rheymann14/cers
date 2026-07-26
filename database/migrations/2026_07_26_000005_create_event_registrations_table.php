<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('organization')->nullable();
            $table->string('position')->nullable();
            $table->string('participant_type')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('registration_consent_accepted_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'event_id']);
            $table->index(['event_id', 'created_at']);
        });

        DB::table('users')
            ->whereNotNull('event_id')
            ->orderBy('id')
            ->get()
            ->each(function (object $user): void {
                DB::table('event_registrations')->insertOrIgnore([
                    'user_id' => $user->id,
                    'event_id' => $user->event_id,
                    'organization_id' => $user->organization_id,
                    'organization' => $user->organization,
                    'position' => $user->position,
                    'participant_type' => $user->participant_type,
                    'created_by_user_id' => $user->created_by_user_id,
                    'registration_consent_accepted_at' => $user->registration_consent_accepted_at,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');
    }
};
