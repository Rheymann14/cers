<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Event;
use Illuminate\Support\Collection;

trait PicksNearestEvent
{
    /**
     * Pick the ongoing event, or the one starting or ending closest to now.
     *
     * @param  Collection<int, Event>  $events
     */
    protected function nearestEvent(Collection $events): ?Event
    {
        $now = now();

        return $events
            ->sortBy(function (Event $event) use ($now) {
                $startsAt = $event->starts_at;
                $endsAt = $event->ends_at;

                return match (true) {
                    $startsAt && $now->lt($startsAt) => $startsAt->diffInSeconds($now, true),
                    $endsAt && $now->gt($endsAt) => $endsAt->diffInSeconds($now, true),
                    $startsAt || $endsAt => 0,
                    default => PHP_INT_MAX,
                };
            })
            ->first();
    }
}
