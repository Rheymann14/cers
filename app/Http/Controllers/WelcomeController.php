<?php

namespace App\Http\Controllers;

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
                ->orderBy('name')
                ->get(['slug as value', 'name as label']),
        ]);
    }
}
