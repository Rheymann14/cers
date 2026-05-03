<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasTable('participant_types') || ! Schema::hasColumn('users', 'participant_type')) {
            return;
        }

        DB::table('participant_types')
            ->select(['name', 'slug'])
            ->orderBy('id')
            ->get()
            ->each(function (object $participantType): void {
                $slug = (string) $participantType->slug;
                $matches = collect([
                    $participantType->name,
                    $participantType->slug,
                    Str::slug((string) $participantType->name),
                ])
                    ->filter(fn ($value): bool => trim((string) $value) !== '')
                    ->map(fn ($value): string => strtolower(trim((string) $value)))
                    ->unique()
                    ->values()
                    ->all();

                DB::table('users')
                    ->whereNotNull('participant_type')
                    ->whereIn(DB::raw('LOWER(TRIM(participant_type))'), $matches)
                    ->update(['participant_type' => $slug]);
            });

        DB::table('users')
            ->whereNotNull('participant_type')
            ->orderBy('id')
            ->get(['id', 'participant_type'])
            ->each(function (object $user): void {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['participant_type' => Str::slug((string) $user->participant_type)]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
