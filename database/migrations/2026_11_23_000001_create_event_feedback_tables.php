<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('event_feedback_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')
                ->unique()
                ->constrained('events')
                ->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->boolean('is_open')->default(false);
            $table->foreignId('created_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('updated_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('event_feedback_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_feedback_form_id')
                ->constrained('event_feedback_forms')
                ->cascadeOnDelete();
            $table->string('question', 500);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('event_feedback_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_feedback_form_id')
                ->constrained('event_feedback_forms')
                ->cascadeOnDelete();
            $table->string('name', 150)->nullable();
            $table->string('school_agency')->nullable();
            $table->text('comments')->nullable();
            $table->timestamps();

            $table->index(['event_feedback_form_id', 'created_at']);
        });

        Schema::create('event_feedback_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_feedback_response_id')
                ->constrained('event_feedback_responses')
                ->cascadeOnDelete();
            $table->foreignId('event_feedback_question_id')
                ->constrained('event_feedback_questions')
                ->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');

            $table->unique(
                ['event_feedback_response_id', 'event_feedback_question_id'],
                'event_feedback_answers_response_question_unique',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_feedback_answers');
        Schema::dropIfExists('event_feedback_responses');
        Schema::dropIfExists('event_feedback_questions');
        Schema::dropIfExists('event_feedback_forms');
    }
};
