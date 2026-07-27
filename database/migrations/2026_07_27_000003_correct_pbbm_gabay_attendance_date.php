<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $eventId = DB::table('events')
            ->where('slug', 'pbbm-gabay-mindanao-cluster-caravan')
            ->value('id');

        if (! $eventId) {
            return;
        }

        DB::table('event_attendances')
            ->where('event_id', $eventId)
            ->update(['attendance_date' => '2026-05-13']);
    }

    public function down(): void
    {
        // This historical correction cannot be safely reversed from UTC scan
        // timestamps without reintroducing the incorrect calendar dates.
    }
};
