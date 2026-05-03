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
            if (Schema::hasColumn('users', 'user_role_id')) {
                $table->dropConstrainedForeignId('user_role_id');
            }

            if (Schema::hasColumn('users', 'participant_type_id')) {
                $table->dropConstrainedForeignId('participant_type_id');
            }
        });

        Schema::dropIfExists('user_roles');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'user_role_id')) {
                $table->foreignId('user_role_id')
                    ->nullable()
                    ->after('phone')
                    ->constrained('user_roles')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('users', 'participant_type_id')) {
                $table->foreignId('participant_type_id')
                    ->nullable()
                    ->after('organization_id')
                    ->constrained('participant_types')
                    ->nullOnDelete();
            }
        });

        $now = now();

        foreach ([
            ['name' => 'Administrator', 'slug' => 'administrator', 'description' => 'Can manage event registration records and settings.', 'is_default' => false, 'is_active' => true],
            ['name' => 'Staff', 'slug' => 'staff', 'description' => 'Can support registration and participant coordination.', 'is_default' => false, 'is_active' => true],
            ['name' => 'Participant', 'slug' => 'participant', 'description' => 'Default role for event registrants.', 'is_default' => true, 'is_active' => true],
        ] as $role) {
            DB::table('user_roles')->updateOrInsert(
                ['slug' => $role['slug']],
                [...$role, 'created_at' => $now, 'updated_at' => $now],
            );
        }
    }
};
