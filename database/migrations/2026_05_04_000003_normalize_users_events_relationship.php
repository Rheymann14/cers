<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('event_id')
                ->nullable()
                ->after('event_name')
                ->constrained('events')
                ->nullOnDelete();
        });

        DB::table('users')
            ->whereNotNull('event_name')
            ->orderBy('id')
            ->get(['id', 'event_name'])
            ->each(function (object $user): void {
                $eventId = DB::table('events')
                    ->where('slug', $user->event_name)
                    ->value('id');

                if ($eventId) {
                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['event_id' => $eventId]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('event_id');
        });
    }
};
