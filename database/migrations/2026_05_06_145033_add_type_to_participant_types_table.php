<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('participant_types', 'type')) {
            Schema::table('participant_types', function (Blueprint $table) {
                $table->string('type')->default('general')->after('slug');
            });
        }

        DB::table('participant_types')
            ->whereIn('slug', [
                'parent-4ps',
                'child-4ps',
                'student-4ps',
                'dswd-4ps',
            ])
            ->update([
                'type' => '4ps',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('participant_types', 'type')) {
            Schema::table('participant_types', function (Blueprint $table) {
                $table->dropColumn('type');
            });
        }
    }
};