<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $eventCount = DB::table('events')->count();

        if ($eventCount === 0) {
            return;
        }

        DB::table('organizations')
            ->whereNotNull('event_id')
            ->orderBy('id')
            ->get()
            ->groupBy('slug')
            ->filter(fn (Collection $organizations) => $this->isClonedDefault(
                $organizations,
                $eventCount,
            ))
            ->each(function (Collection $organizations): void {
                $globalOrganization = $organizations->first();
                $duplicateIds = $organizations->pluck('id')->skip(1);

                DB::table('users')
                    ->whereIn('organization_id', $duplicateIds)
                    ->update(['organization_id' => $globalOrganization->id]);
                DB::table('organizations')
                    ->whereIn('id', $duplicateIds)
                    ->delete();
                DB::table('organizations')
                    ->where('id', $globalOrganization->id)
                    ->update(['event_id' => null]);
            });
    }

    public function down(): void
    {
        // This migration only repairs defaults duplicated by the earlier migration.
    }

    private function isClonedDefault(
        Collection $organizations,
        int $eventCount,
    ): bool {
        return $organizations->count() === $eventCount
            && $organizations->pluck('event_id')->unique()->count() === $eventCount
            && $organizations->pluck('name')->unique()->count() === 1
            && $organizations->pluck('type')->unique()->count() === 1
            && $organizations->pluck('is_active')->unique()->count() === 1
            && $organizations->pluck('created_at')->unique()->count() === 1;
    }
};
