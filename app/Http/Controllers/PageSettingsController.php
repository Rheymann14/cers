<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\Province;
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
            'participantTypes' => ParticipantType::query()
                ->select(['id', 'event_id', 'name', 'slug', 'type', 'is_active', 'created_by_user_id', 'created_at'])
                ->with('creator:id,name')
                ->withCount('users')
                ->orderBy('name')
                ->get(),
            'events' => Event::query()
                ->orderByRaw('starts_at is null')
                ->orderByDesc('starts_at')
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'starts_at', 'ends_at', 'is_active']),
            'organizations' => Organization::query()
                ->select(['id', 'name', 'slug', 'type', 'is_active', 'created_by_user_id', 'created_at'])
                ->with('creator:id,name')
                ->withCount('users')
                ->orderBy('name')
                ->get(),
            'provinces' => Province::query()
                ->select(['id', 'name', 'code', 'region_name', 'is_active', 'created_at'])
                ->withCount('users')
                ->orderBy('name')
                ->get(),
            'municipalities' => Municipality::query()
                ->select(['id', 'province_id', 'name', 'code', 'type', 'is_active', 'created_at'])
                ->with('province:id,name,code')
                ->withCount('users')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request, string $table): RedirectResponse
    {
        $modelClass = $this->modelClass($table);
        $validated = $this->validatedData($request, $table);

        if ($this->tracksCreator($table)) {
            $validated['created_by_user_id'] = $request->user()?->id;
        }

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
            'participant-types' => ParticipantType::class,
            'organizations' => Organization::class,
            'provinces' => Province::class,
            'municipalities' => Municipality::class,
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
                $table === 'participant-types'
                    ? Rule::unique('participant_types', 'slug')
                        ->where('event_id', $request->integer('event_id'))
                        ->ignore($id)
                    : Rule::unique($this->tableName($table), 'slug')->ignore($id),
            ],
        ];

        return match ($table) {
            'participant-types' => $request->validate([
                ...$baseRules,
                'event_id' => ['required', 'integer', Rule::exists('events', 'id')],
                'type' => ['required', 'string', Rule::in(['general', '4ps'])],
                'is_active' => ['boolean'],
            ]),
            'organizations' => $request->validate([
                ...$baseRules,
                'type' => ['required', 'string', 'max:100'],
                'is_active' => ['boolean'],
            ]),
            'provinces' => $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'code' => [
                    'required',
                    'string',
                    'regex:/^\d{10}$/',
                    Rule::unique('provinces', 'code')->ignore($id),
                ],
                'region_name' => ['required', 'string', 'max:255'],
                'is_active' => ['boolean'],
            ]) + [
                'region_code' => $this->regionCodeFromProvinceCode((string) $request->input('code')),
            ],
            'municipalities' => $request->validate([
                'province_id' => ['required', 'integer', Rule::exists('provinces', 'id')],
                'name' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('municipalities', 'name')
                        ->where('province_id', $request->integer('province_id'))
                        ->ignore($id),
                ],
                'code' => [
                    'required',
                    'string',
                    'max:10',
                    Rule::unique('municipalities', 'code')->ignore($id),
                ],
                'type' => ['required', 'string', 'max:20'],
                'is_active' => ['boolean'],
            ]),
            default => abort(404),
        };
    }

    private function tableName(string $table): string
    {
        return match ($table) {
            'participant-types' => 'participant_types',
            'organizations' => 'organizations',
            'provinces' => 'provinces',
            'municipalities' => 'municipalities',
            default => abort(404),
        };
    }

    private function tracksCreator(string $table): bool
    {
        return in_array($table, ['participant-types', 'organizations'], true);
    }

    private function regionCodeFromProvinceCode(string $provinceCode): string
    {
        return substr($provinceCode, 0, 2).'00000000';
    }
}
