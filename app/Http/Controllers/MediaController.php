<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Directories on the media disk that may be served publicly.
     */
    private const ALLOWED_DIRECTORIES = [
        'event-images/',
        'event-pdfs/',
        'event-materials/',
        'profile-photos/',
    ];

    public function __invoke(string $path): StreamedResponse
    {
        abort_if(
            str_contains($path, '..') || ! Str::startsWith($path, self::ALLOWED_DIRECTORIES),
            404,
        );

        $disk = Storage::disk();

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, headers: [
            'Cache-Control' => 'public, max-age=604800, immutable',
        ]);
    }
}
