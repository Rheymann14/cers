<?php

namespace Database\Seeders;

use App\Models\ParticipantType;
use Illuminate\Database\Seeder;

class ParticipantTypeSeeder extends Seeder
{
    /**
     * Seed the default participant types.
     */
    public function run(): void
    {
        foreach ([
            ['name' => 'Administrator', 'slug' => 'admin', 'type' => 'general'],
            ['name' => 'Participant', 'slug' => 'participant', 'type' => 'general'],
        ] as $participantType) {
            ParticipantType::query()->updateOrCreate(
                ['slug' => $participantType['slug']],
                [...$participantType, 'is_active' => true],
            );
        }
    }
}
