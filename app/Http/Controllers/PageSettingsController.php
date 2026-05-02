<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\UserRole;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PageSettingsController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('page_settings', [
            'userRoles' => UserRole::query()
                ->select(['id', 'name', 'slug', 'description', 'is_default', 'is_active'])
                ->withCount('users')
                ->orderByDesc('is_default')
                ->orderBy('name')
                ->get(),
            'participantTypes' => ParticipantType::query()
                ->select(['id', 'name', 'slug', 'description', 'is_active'])
                ->withCount('users')
                ->orderBy('name')
                ->get(),
            'organizations' => Organization::query()
                ->select(['id', 'name', 'slug', 'type', 'is_active'])
                ->withCount('users')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request, string $table): RedirectResponse
    {
        $modelClass = $this->modelClass($table);
        $validated = $this->validatedData($request, $table);

        $modelClass::query()->create($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Page setting added successfully.',
        ]);

        return back();
    }

    public function update(Request $request, string $table, int $id): RedirectResponse
    {
        $model = $this->findModel($table, $id);
        $validated = $this->validatedData($request, $table, $id);

        $model->update($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Page setting updated successfully.',
        ]);

        return back();
    }

    public function toggleStatus(string $table, int $id): RedirectResponse
    {
        $model = $this->findModel($table, $id);

        $model->update([
            'is_active' => ! $model->getAttribute('is_active'),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Page setting status updated.',
        ]);

        return back();
    }

    public function destroy(string $table, int $id): RedirectResponse
    {
        $model = $this->findModel($table, $id);
        $model->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Page setting deleted successfully.',
        ]);

        return back();
    }

    /**
     * @return class-string<Model>
     */
    private function modelClass(string $table): string
    {
        return match ($table) {
            'roles' => UserRole::class,
            'participant-types' => ParticipantType::class,
            'organizations' => Organization::class,
            default => abort(404),
        };
    }

    private function findModel(string $table, int $id): Model
    {
        return $this->modelClass($table)::query()->findOrFail($id);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request, string $table, ?int $id = null): array
    {
        $baseRules = [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                'alpha_dash:ascii',
                Rule::unique($this->tableName($table), 'slug')->ignore($id),
            ],
        ];

        return match ($table) {
            'roles' => $request->validate([
                ...$baseRules,
                'description' => ['nullable', 'string', 'max:255'],
                'is_default' => ['boolean'],
                'is_active' => ['boolean'],
            ]),
            'participant-types' => $request->validate([
                ...$baseRules,
                'description' => ['nullable', 'string', 'max:255'],
                'is_active' => ['boolean'],
            ]),
            'organizations' => $request->validate([
                ...$baseRules,
                'type' => ['required', 'string', 'max:100'],
                'is_active' => ['boolean'],
            ]),
            default => abort(404),
        };
    }

    private function tableName(string $table): string
    {
        return match ($table) {
            'roles' => 'user_roles',
            'participant-types' => 'participant_types',
            'organizations' => 'organizations',
            default => abort(404),
        };
    }
}
