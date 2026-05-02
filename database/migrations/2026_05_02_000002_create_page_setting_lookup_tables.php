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
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('participant_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type')->default('school');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('user_role_id')
                ->nullable()
                ->after('phone')
                ->constrained('user_roles')
                ->nullOnDelete();
            $table->foreignId('organization_id')
                ->nullable()
                ->after('user_role_id')
                ->constrained('organizations')
                ->nullOnDelete();
            $table->foreignId('participant_type_id')
                ->nullable()
                ->after('organization_id')
                ->constrained('participant_types')
                ->nullOnDelete();
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

        foreach ([
            ['name' => 'Student', 'slug' => 'student', 'description' => 'Student participant.'],
            ['name' => 'Faculty', 'slug' => 'faculty', 'description' => 'Faculty participant.'],
            ['name' => 'Staff', 'slug' => 'staff', 'description' => 'Administrative or support staff participant.'],
            ['name' => 'Guest', 'slug' => 'guest', 'description' => 'External guest participant.'],
        ] as $type) {
            DB::table('participant_types')->updateOrInsert(
                ['slug' => $type['slug']],
                [...$type, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            );
        }

        DB::table('users')
            ->whereNotNull('organization')
            ->select('organization')
            ->distinct()
            ->orderBy('organization')
            ->get()
            ->each(function (object $user) use ($now): void {
                $name = trim((string) $user->organization);

                if ($name === '') {
                    return;
                }

                DB::table('organizations')->updateOrInsert(
                    ['slug' => Str::slug($name)],
                    [
                        'name' => $name,
                        'type' => 'school',
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                );
            });

        $participantRoleId = DB::table('user_roles')
            ->where('slug', 'participant')
            ->value('id');

        DB::table('users')->update(['user_role_id' => $participantRoleId]);

        DB::table('users')
            ->whereNotNull('participant_type')
            ->orderBy('id')
            ->get(['id', 'participant_type'])
            ->each(function (object $user): void {
                $participantTypeId = DB::table('participant_types')
                    ->where('slug', Str::slug((string) $user->participant_type))
                    ->value('id');

                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['participant_type_id' => $participantTypeId]);
            });

        DB::table('users')
            ->whereNotNull('organization')
            ->orderBy('id')
            ->get(['id', 'organization'])
            ->each(function (object $user): void {
                $organizationId = DB::table('organizations')
                    ->where('slug', Str::slug((string) $user->organization))
                    ->value('id');

                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['organization_id' => $organizationId]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('participant_type_id');
            $table->dropConstrainedForeignId('organization_id');
            $table->dropConstrainedForeignId('user_role_id');
        });

        Schema::dropIfExists('organizations');
        Schema::dropIfExists('participant_types');
        Schema::dropIfExists('user_roles');
    }
};
