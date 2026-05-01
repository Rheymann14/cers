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
            $table->string('phone', 50)->nullable()->after('email');
            $table->string('organization')->nullable()->after('phone');
            $table->string('position')->nullable()->after('organization');
            $table->string('participant_type')->nullable()->after('position');
            $table->string('event_name')->nullable()->after('participant_type');
            $table->string('attendance_mode')->nullable()->after('event_name');
            $table->text('notes')->nullable()->after('attendance_mode');
            $table
                ->timestamp('registration_consent_accepted_at')
                ->nullable()
                ->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'organization',
                'position',
                'participant_type',
                'event_name',
                'attendance_mode',
                'notes',
                'registration_consent_accepted_at',
            ]);
        });
    }
};
