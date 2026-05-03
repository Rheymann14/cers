<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('dashboard', [
            'stats' => [
                'participants' => User::query()->count(),
                'deletedParticipants' => User::query()->onlyTrashed()->count(),
                'organizations' => Organization::query()->where('is_active', true)->count(),
                'participantTypes' => ParticipantType::query()->where('is_active', true)->count(),
            ],
            'recentParticipants' => User::query()
                ->latest()
                ->limit(5)
                ->get([
                    'id',
                    'participant_id',
                    'name',
                    'email',
                    'organization',
                    'participant_type',
                    'event_name',
                    'created_at',
                ]),
            'eventSummary' => User::query()
                ->selectRaw('event_name, count(*) as participants_count')
                ->whereNotNull('event_name')
                ->groupBy('event_name')
                ->orderByDesc('participants_count')
                ->get(),
        ]);
    }
}
