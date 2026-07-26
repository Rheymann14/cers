<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('organizations')
            ->whereNull('event_id')
            ->whereNull('created_by_user_id')
            ->whereRaw('LOWER(TRIM(type)) = ?', ['school'])
            ->whereExists(fn ($query) => $query
                ->selectRaw('1')
                ->from('users')
                ->whereColumn('users.organization_id', 'organizations.id')
                ->whereNotNull('users.event_id'))
            ->orderBy('id')
            ->get()
            ->filter(fn (object $organization) => $this->wasCreatedDuringRegistration(
                $organization,
            ))
            ->each(function (object $organization): void {
                $eventIds = DB::table('users')
                    ->where('organization_id', $organization->id)
                    ->whereNotNull('event_id')
                    ->distinct()
                    ->orderBy('event_id')
                    ->pluck('event_id');

                foreach ($eventIds as $eventId) {
                    $scopedOrganizationId = DB::table('organizations')
                        ->where('event_id', $eventId)
                        ->where('slug', $organization->slug)
                        ->value('id');

                    if (! $scopedOrganizationId) {
                        $scopedOrganizationId = DB::table('organizations')
                            ->insertGetId([
                                'event_id' => $eventId,
                                'name' => $organization->name,
                                'slug' => $organization->slug,
                                'type' => $organization->type,
                                'is_active' => $organization->is_active,
                                'created_by_user_id' => $organization->created_by_user_id,
                                'created_at' => $organization->created_at,
                                'updated_at' => $organization->updated_at,
                            ]);
                    }

                    DB::table('users')
                        ->where('organization_id', $organization->id)
                        ->where('event_id', $eventId)
                        ->update(['organization_id' => $scopedOrganizationId]);
                }

                DB::table('organizations')
                    ->where('id', $organization->id)
                    ->delete();
            });
    }

    public function down(): void
    {
        // Event ownership cannot be safely discarded after legacy records are repaired.
    }

    private function wasCreatedDuringRegistration(object $organization): bool
    {
        $organizationCreatedAt = Carbon::parse($organization->created_at);

        return DB::table('users')
            ->where('organization_id', $organization->id)
            ->whereNotNull('event_id')
            ->pluck('created_at')
            ->contains(fn ($createdAt) => $organizationCreatedAt
                ->diffInSeconds(Carbon::parse($createdAt)) <= 10);
    }
};
