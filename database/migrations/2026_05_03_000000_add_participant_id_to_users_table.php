<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
        Schema::table('users', function (Blueprint $table) {
            $table->string('participant_id')->nullable()->after('id');
        });

        $usedParticipantIds = [];

        DB::table('users')
            ->orderBy('id')
            ->select(['id', 'created_at'])
            ->chunkById(100, function ($users) use (&$usedParticipantIds) {
                foreach ($users as $user) {
                    $year = $user->created_at
                        ? date('Y', strtotime((string) $user->created_at))
                        : date('Y');

                    do {
                        $participantId = 'CERS-'.Str::upper(Str::random(4)).'-'.$year;
                    } while (in_array($participantId, $usedParticipantIds, true));

                    $usedParticipantIds[] = $participantId;

                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['participant_id' => $participantId]);
                }
            });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('participant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['participant_id']);
            $table->dropColumn('participant_id');
        });
    }
};
