<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('events')
            ->orderBy('id')
            ->pluck('id')
            ->each(function (int $eventId) use ($now): void {
                $participantType = DB::table('participant_types')
                    ->where('event_id', $eventId)
                    ->where('slug', 'admin');

                if ($participantType->exists()) {
                    $participantType->update([
                        'name' => 'Administrator',
                        'type' => 'general',
                        'is_active' => true,
                        'updated_at' => $now,
                    ]);

                    return;
                }

                DB::table('participant_types')->insert([
                    'event_id' => $eventId,
                    'name' => 'Administrator',
                    'slug' => 'admin',
                    'type' => 'general',
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        //
    }
};
