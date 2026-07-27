<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\ParticipantType;
use Illuminate\Database\Seeder;

class ParticipantTypeSeeder extends Seeder
{
    /**
     * Seed the default participant types.
     */
    public function run(): void
    {
        foreach (Event::query()->get() as $event) {
            foreach ([
                ['name' => 'Administrator', 'slug' => 'admin', 'type' => 'general'],
                ['name' => 'Participant', 'slug' => 'participant', 'type' => 'general'],
            ] as $participantType) {
                ParticipantType::query()->updateOrCreate(
                    [
                        'event_id' => $event->id,
                        'slug' => $participantType['slug'],
                    ],
                    [...$participantType, 'is_active' => true],
                );
            }
        }
    }
}
