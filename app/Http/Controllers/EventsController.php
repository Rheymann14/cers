<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Inertia\Inertia;
use Inertia\Response;

class EventsController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('events', [
            'events' => Event::query()
                ->select([
                    'id',
                    'name',
                    'description',
                    'venue_name',
                    'venue_address',
                    'starts_at',
                    'ends_at',
                    'image_path',
                    'pdf_path',
                    'is_active',
                ])
                ->where('is_active', true)
                ->with(['materials' => fn ($query) => $query
                    ->select(['id', 'event_id', 'original_name', 'path', 'mime_type', 'size', 'created_at'])
                    ->latest()])
                ->orderByRaw('starts_at is null')
                ->orderBy('starts_at')
                ->get(),
        ]);
    }
}
