<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participant_types', function (Blueprint $table) {
            $table->foreignId('event_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->cascadeOnDelete();
            $table->dropUnique('participant_types_slug_unique');
        });

        $eventIds = DB::table('events')->orderBy('id')->pluck('id');
        $participantTypes = DB::table('participant_types')->orderBy('id')->get();

        if ($eventIds->isNotEmpty()) {
            $firstEventId = $eventIds->first();

            DB::table('participant_types')->update(['event_id' => $firstEventId]);

            foreach ($eventIds->skip(1) as $eventId) {
                foreach ($participantTypes as $participantType) {
                    DB::table('participant_types')->insert([
                        'event_id' => $eventId,
                        'name' => $participantType->name,
                        'slug' => $participantType->slug,
                        'type' => $participantType->type,
                        'is_active' => $participantType->is_active,
                        'created_by_user_id' => $participantType->created_by_user_id,
                        'created_at' => $participantType->created_at,
                        'updated_at' => $participantType->updated_at,
                    ]);
                }
            }
        }

        Schema::table('participant_types', function (Blueprint $table) {
            $table->unique(['event_id', 'slug']);
        });
    }

    public function down(): void
    {
        $duplicateSlugs = DB::table('participant_types')
            ->select('slug')
            ->groupBy('slug')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('slug');

        foreach ($duplicateSlugs as $slug) {
            $idsToDelete = DB::table('participant_types')
                ->where('slug', $slug)
                ->orderBy('id')
                ->pluck('id')
                ->skip(1);

            DB::table('participant_types')->whereIn('id', $idsToDelete)->delete();
        }

        Schema::table('participant_types', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'slug']);
            $table->unique('slug');
            $table->dropConstrainedForeignId('event_id');
        });
    }
};
