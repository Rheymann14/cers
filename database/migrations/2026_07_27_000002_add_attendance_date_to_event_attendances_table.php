<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL requires another event_id index before the old composite
        // unique index can stop supporting the event_id foreign key.
        if (! Schema::hasIndex('event_attendances', 'event_attendances_event_id_index')) {
            Schema::table('event_attendances', function (Blueprint $table) {
                $table->index('event_id');
            });
        }

        Schema::table('event_attendances', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'user_id']);
            $table->date('attendance_date')->nullable()->after('user_id');
        });

        DB::table('event_attendances')
            ->whereNull('attendance_date')
            ->update(['attendance_date' => DB::raw('DATE(checked_in_at)')]);

        Schema::table('event_attendances', function (Blueprint $table) {
            $table->date('attendance_date')->nullable(false)->change();
            $table->unique(
                ['event_id', 'user_id', 'attendance_date'],
                'event_attendances_event_user_date_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('event_attendances', function (Blueprint $table) {
            $table->dropUnique('event_attendances_event_user_date_unique');
        });

        // Preserve the earliest check-in when rolling back to one row per event.
        DB::table('event_attendances')
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($attendance) => $attendance->event_id.':'.$attendance->user_id)
            ->each(function ($attendances): void {
                $duplicateIds = $attendances->skip(1)->pluck('id');

                if ($duplicateIds->isNotEmpty()) {
                    DB::table('event_attendances')->whereIn('id', $duplicateIds)->delete();
                }
            });

        Schema::table('event_attendances', function (Blueprint $table) {
            $table->dropColumn('attendance_date');
            $table->unique(['event_id', 'user_id']);
        });

        Schema::table('event_attendances', function (Blueprint $table) {
            $table->dropIndex(['event_id']);
        });
    }
};
