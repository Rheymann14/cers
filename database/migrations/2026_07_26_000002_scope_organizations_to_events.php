<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->foreignId('event_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->cascadeOnDelete();
            $table->dropUnique('organizations_slug_unique');
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->unique(['event_id', 'slug']);
        });
    }

    public function down(): void
    {
        $organizations = DB::table('organizations')
            ->orderBy('id')
            ->get()
            ->groupBy('slug');

        foreach ($organizations as $duplicates) {
            $keptOrganization = $duplicates->first();
            $duplicateIds = $duplicates->pluck('id')->skip(1);

            if ($duplicateIds->isEmpty()) {
                continue;
            }

            DB::table('users')
                ->whereIn('organization_id', $duplicateIds)
                ->update(['organization_id' => $keptOrganization->id]);
            DB::table('organizations')->whereIn('id', $duplicateIds)->delete();
        }

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropUnique(['event_id', 'slug']);
            $table->unique('slug');
            $table->dropConstrainedForeignId('event_id');
        });
    }
};
