<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventMaterial;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EventsManagementController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('events_management', [
            'events' => Event::query()
                ->select([
                    'id',
                    'name',
                    'slug',
                    'description',
                    'starts_at',
                    'ends_at',
                    'image_path',
                    'pdf_path',
                    'is_active',
                    'created_by_user_id',
                    'created_at',
                ])
                ->with('creator:id,name')
                ->with(['materials' => fn ($query) => $query
                    ->select(['id', 'event_id', 'original_name', 'path', 'mime_type', 'size', 'created_at'])
                    ->latest()])
                ->withCount('users')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatedData($request);
        unset($validated['image'], $validated['pdf'], $validated['materials'], $validated['remove_image'], $validated['remove_pdf']);

        $event = Event::query()->create([
            ...$validated,
            'slug' => $this->uniqueSlug($validated['name']),
            'image_path' => $this->storeFile($request, 'image', 'event-images'),
            'pdf_path' => $this->storeFile($request, 'pdf', 'event-pdfs'),
            'created_by_user_id' => $request->user()?->id,
        ]);

        $this->storeMaterials($request, $event);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Event added successfully.',
        ]);

        return back();
    }

    public function update(Request $request, Event $event): RedirectResponse
    {
        $validated = $this->validatedData($request);
        unset($validated['image'], $validated['pdf'], $validated['materials'], $validated['remove_image'], $validated['remove_pdf']);
        $oldSlug = $event->slug;
        $newSlug = $this->uniqueSlug($validated['name'], $event->id);
        $updates = [
            ...$validated,
            'slug' => $newSlug,
        ];

        if ($request->hasFile('image')) {
            $this->deleteStoredFile($event->image_path);
            $updates['image_path'] = $this->storeFile($request, 'image', 'event-images');
        } elseif ($request->boolean('remove_image')) {
            $this->deleteStoredFile($event->image_path);
            $updates['image_path'] = null;
        }

        if ($request->hasFile('pdf')) {
            $this->deleteStoredFile($event->pdf_path);
            $updates['pdf_path'] = $this->storeFile($request, 'pdf', 'event-pdfs');
        } elseif ($request->boolean('remove_pdf')) {
            $this->deleteStoredFile($event->pdf_path);
            $updates['pdf_path'] = null;
        }

        $event->update($updates);

        if ($oldSlug !== $newSlug) {
            User::query()
                ->where('event_name', $oldSlug)
                ->update([
                    'event_id' => $event->id,
                    'event_name' => $newSlug,
                ]);
        }

        $this->storeMaterials($request, $event);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Event updated successfully.',
        ]);

        return back();
    }

    public function toggleStatus(Event $event): RedirectResponse
    {
        $event->update([
            'is_active' => ! $event->is_active,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Event status updated.',
        ]);

        return back();
    }

    public function destroy(Event $event): RedirectResponse
    {
        $this->deleteStoredFile($event->image_path);
        $this->deleteStoredFile($event->pdf_path);
        $event->materials->each(fn (EventMaterial $material) => $this->deleteStoredFile($material->path));
        $event->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Event deleted successfully.',
        ]);

        return back();
    }

    public function destroyMaterial(EventMaterial $material): RedirectResponse
    {
        $this->deleteStoredFile($material->path);
        $material->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Event material deleted successfully.',
        ]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
            'image' => ['nullable', 'image', 'max:5120'],
            'pdf' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'materials' => ['nullable', 'array'],
            'materials.*.name' => ['required_with:materials', 'string', 'max:255'],
            'materials.*.type' => ['nullable', 'string', 'max:255'],
            'materials.*.size' => ['nullable', 'integer'],
            'materials.*.data' => ['required_with:materials', 'string'],
            'remove_image' => ['nullable', 'boolean'],
            'remove_pdf' => ['nullable', 'boolean'],
            'is_active' => ['boolean'],
        ]);
    }

    private function uniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($name) ?: 'event';
        $slug = $baseSlug;
        $suffix = 2;

        while (
            Event::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    private function storeFile(Request $request, string $field, string $directory): ?string
    {
        if (! $request->hasFile($field)) {
            return null;
        }

        return $request->file($field)?->store($directory, 'public');
    }

    private function deleteStoredFile(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    private function storeMaterials(Request $request, Event $event): void
    {
        $materials = $request->input('materials', []);

        if (! is_array($materials) || $materials === []) {
            return;
        }

        foreach ($materials as $material) {
            if (! is_array($material)) {
                continue;
            }

            $originalName = (string) ($material['name'] ?? '');
            $dataUrl = (string) ($material['data'] ?? '');
            $extension = Str::lower(pathinfo($originalName, PATHINFO_EXTENSION));

            if (
                ! in_array($extension, ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip', 'png', 'jpg', 'jpeg', 'webp'], true) ||
                ! preg_match('/^data:([^;]+);base64,(.+)$/', $dataUrl, $matches)
            ) {
                continue;
            }

            $contents = base64_decode($matches[2], true);

            if ($contents === false) {
                continue;
            }

            $path = 'event-materials/'.Str::uuid().'.'.$extension;
            Storage::disk('public')->put($path, $contents);

            $event->materials()->create([
                'original_name' => $originalName,
                'path' => $path,
                'mime_type' => $material['type'] ?? $matches[1],
                'size' => $material['size'] ?? strlen($contents),
                'created_by_user_id' => $request->user()?->id,
            ]);
        }
    }
}
