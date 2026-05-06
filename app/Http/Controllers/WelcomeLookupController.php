<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Municipality;
use App\Models\Organization;
use App\Models\ParticipantType;
use App\Models\Province;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WelcomeLookupController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
           'organizations' => Organization::query()
                ->where('is_active', true)
                ->orderBy('type')
                ->orderBy('name')
                ->get([
                    'name as value',
                    'name as label',
                    'type',
                ]),
            'provinces' => Province::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['code as value', 'name as label']),
            'participantTypes' => ParticipantType::query()
                ->where('is_active', true)
                ->whereNotIn('slug', ['admin', 'administrator'])
                ->whereNotIn('name', ['Admin', 'Administrator'])
                ->orderByRaw("CASE WHEN type = '4ps' THEN 1 ELSE 2 END")
                ->orderBy('name')
                ->get(['slug as value', 'name as label', 'type']),
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

    public function municipalities(Request $request): JsonResponse
    {
        $provinceCode = $request->string('province')->trim()->toString();

        if ($provinceCode === '') {
            return response()->json([]);
        }

        $province = Province::query()
            ->where('is_active', true)
            ->where('code', $provinceCode)
            ->first();

        if (! $province) {
            return response()->json([]);
        }

        return response()->json(
            Municipality::query()
                ->where('is_active', true)
                ->whereBelongsTo($province)
                ->orderBy('name')
                ->get(['code as value', 'name as label'])
        );
    }
}
