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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });

        $now = now();

        foreach ([
            ['name' => 'CHED Regional Orientation', 'slug' => 'ched-regional-orientation'],
            ['name' => 'Higher Education Summit', 'slug' => 'higher-education-summit'],
            ['name' => 'Faculty Development Workshop', 'slug' => 'faculty-development-workshop'],
        ] as $event) {
            DB::table('events')->updateOrInsert(
                ['slug' => $event['slug']],
                [
                    ...$event,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        DB::table('users')
            ->whereNotNull('event_name')
            ->select('event_name')
            ->distinct()
            ->orderBy('event_name')
            ->get()
            ->each(function (object $user) use ($now): void {
                $slug = trim((string) $user->event_name);

                if ($slug === '' || DB::table('events')->where('slug', $slug)->exists()) {
                    return;
                }

                DB::table('events')->insert([
                    'name' => str($slug)->replace('-', ' ')->title()->toString(),
                    'slug' => $slug,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
