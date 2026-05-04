<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Organization;
use App\Models\ParticipantType;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'organizations' => Organization::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['name as value', 'name as label']),
            'participantTypes' => ParticipantType::query()
                ->where('is_active', true)
                ->whereNotIn('slug', ['admin', 'administrator'])
                ->whereNotIn('name', ['Admin', 'Administrator'])
                ->orderBy('name')
                ->get(['slug as value', 'name as label']),
            'events' => Event::query()
                ->where('is_active', true)
                ->whereNotNull('starts_at')
                ->whereNotNull('ends_at')
                ->where('ends_at', '>=', now())
                ->orderBy('starts_at')
                ->orderBy('name')
                ->get([
                    'slug as value',
                    'name as label',
                    'starts_at',
                    'ends_at',
                ]),
        ]);
    }
}
