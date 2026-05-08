import { Head, Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    Download,
    ExternalLink,
    FileText,
    MapPin,
    Moon,
    Package,
    Search,
    Sun,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

type EventMaterial = {
    id: number;
    original_name: string;
    url: string;
    mime_type: string | null;
    size: number | null;
    created_at: string | null;
};

type PublicEvent = {
    id: number;
    name: string;
    description: string | null;
    venue_name: string | null;
    venue_address: string | null;
    venue_latitude: string | null;
    venue_longitude: string | null;
    starts_at: string | null;
    ends_at: string | null;
    image_url: string | null;
    pdf_url: string | null;
    materials: EventMaterial[];
};

type Props = {
    events: PublicEvent[];
};

type PageProps = {
    auth?: {
        user?: unknown | null;
    };
};

type EventStatus = 'ongoing' | 'upcoming' | 'closed';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

function toDate(value: string | null) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getEventStatus(event: PublicEvent): EventStatus {
    const now = new Date();
    const startsAt = toDate(event.starts_at);
    const endsAt = toDate(event.ends_at);

    if (endsAt && now > endsAt) {
        return 'closed';
    }

    if (startsAt && now < startsAt) {
        return 'upcoming';
    }

    return 'ongoing';
}

function formatDateRange(event: PublicEvent) {
    const startsAt = toDate(event.starts_at);
    const endsAt = toDate(event.ends_at);

    if (!startsAt && !endsAt) {
        return 'Schedule to be announced';
    }

    if (startsAt && !endsAt) {
        return dateTimeFormatter.format(startsAt);
    }

    if (!startsAt && endsAt) {
        return `Until ${dateTimeFormatter.format(endsAt)}`;
    }

    if (startsAt && endsAt) {
        return `${dateTimeFormatter.format(startsAt)} - ${dateTimeFormatter.format(endsAt)}`;
    }

    return 'Schedule to be announced';
}

function formatFileSize(value: number | null) {
    if (!value) {
        return '';
    }

    if (value < 1024 * 1024) {
        return `${Math.max(1, Math.round(value / 1024)).toLocaleString()} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function toDownloadFileName(name: string, extension?: string) {
    const normalizedName =
        name
            .trim()
            .replace(/[\\/:*?"<>|]+/g, '')
            .replace(/\s+/g, ' ') || 'download';

    if (!extension) {
        return normalizedName;
    }

    return normalizedName.toLowerCase().endsWith(`.${extension}`)
        ? normalizedName
        : `${normalizedName}.${extension}`;
}

function getProgramFlowFileName(event: PublicEvent) {
    return toDownloadFileName(`${event.name} Program Flow`, 'pdf');
}

function getMapQuery(event: PublicEvent) {
    return [event.venue_name, event.venue_address]
        .filter(Boolean)
        .join(', ')
        .trim();
}

function getVenueCoordinates(event: PublicEvent) {
    const latitude = Number(event.venue_latitude);
    const longitude = Number(event.venue_longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }

    return { latitude, longitude };
}

function getMapUrl(event: PublicEvent) {
    const coordinates = getVenueCoordinates(event);

    if (coordinates) {
        return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
    }

    const query = getMapQuery(event);

    if (!query) {
        return '';
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getMapEmbedUrl(event: PublicEvent) {
    const coordinates = getVenueCoordinates(event);

    if (coordinates) {
        return `https://maps.google.com/maps?output=embed&z=18&q=${coordinates.latitude},${coordinates.longitude}`;
    }

    const query = getMapQuery(event);

    if (!query) {
        return '';
    }

    return `https://maps.google.com/maps?output=embed&z=16&q=${encodeURIComponent(query)}`;
}

function EventStatusBadge({ status }: { status: EventStatus }) {
    return (
        <Badge
            variant="secondary"
            className={cn(
                'border-transparent px-2.5 py-1 text-xs font-semibold capitalize',
                status === 'ongoing' &&
                    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
                status === 'upcoming' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                status === 'closed' &&
                    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
            )}
        >
            {status}
        </Badge>
    );
}

function EventDatePill({ event }: { event: PublicEvent }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            <CalendarDays className="size-3.5 shrink-0" />
            <span className="truncate">{formatDateRange(event)}</span>
        </span>
    );
}

function PublicNav({
    accessHref,
    auth,
}: {
    accessHref: string;
    auth?: PageProps['auth'];
}) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const nextAppearance = resolvedAppearance === 'dark' ? 'light' : 'dark';
    const AppearanceIcon = resolvedAppearance === 'dark' ? Sun : Moon;

    return (
        <header className="sticky top-0 z-50 border-b border-[#d9e5f5] bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
            <nav
                className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
                aria-label="Main navigation"
            >
                <Link href="/home" className="flex min-w-0 items-center gap-3">
                    <img
                        src="/ched_logo-128.png"
                        alt="Commission on Higher Education logo"
                        className="h-12 w-12 shrink-0 object-contain"
                    />
                    <span className="min-w-0">
                        <span className="block text-sm font-semibold tracking-wide text-slate-950 dark:text-white">
                            CERS
                        </span>
                        <span className="block truncate text-xs text-slate-600 sm:text-sm dark:text-neutral-400">
                            CHED Events Registration System
                        </span>
                    </span>
                </Link>

                <div className="flex items-center justify-between gap-4 lg:gap-8">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 dark:text-neutral-300">
                        <Link
                            href="/home"
                            className="relative py-1 transition hover:text-[#0038A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] dark:hover:text-blue-300"
                        >
                            Home
                        </Link>
                        <Link
                            href="/events"
                            className="relative py-1 font-semibold text-[#0038A8] transition after:absolute after:right-0 after:-bottom-1 after:left-0 after:h-0.5 after:rounded-full after:bg-[#0038A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] dark:text-blue-300 dark:after:bg-blue-300"
                        >
                            Events
                        </Link>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        <button
                            type="button"
                            aria-label={`Switch to ${nextAppearance} mode`}
                            onClick={() => updateAppearance(nextAppearance)}
                            className="inline-flex size-11 items-center justify-center rounded-xl border border-[#d9e5f5] bg-white text-slate-700 shadow-sm transition hover:border-[#0038A8]/30 hover:text-[#0038A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:text-white"
                        >
                            <AppearanceIcon className="size-5" />
                        </button>

                        <Link
                            href={accessHref}
                            className="inline-flex items-center justify-center rounded-xl border border-[#0038A8] bg-[#0038A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#002f8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                        >
                            {auth?.user ? 'Participants' : 'Login'}
                        </Link>
                    </div>
                </div>
            </nav>
        </header>
    );
}

function EventCard({
    event,
    onViewImage,
    onViewPdf,
}: {
    event: PublicEvent;
    onViewImage: (event: PublicEvent) => void;
    onViewPdf: (event: PublicEvent) => void;
}) {
    const status = getEventStatus(event);
    const mapUrl = getMapUrl(event);
    const mapEmbedUrl = getMapEmbedUrl(event);
    const previewMaterials = event.materials.slice(0, 2);
    const hiddenMaterialsCount = Math.max(0, event.materials.length - 2);

    return (
        <article className="flex min-w-0 flex-col rounded-2xl border border-[#d9e5f5] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0038A8]/30 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-400/40">
            <div className="relative aspect-[2.25/1] overflow-hidden rounded-xl border border-[#d9e5f5] bg-[#eef5ff] dark:border-neutral-800 dark:bg-neutral-950">
                <img
                    src={event.image_url ?? '/ched_logo-128.png'}
                    alt=""
                    className={cn(
                        'size-full object-cover',
                        !event.image_url && 'object-contain p-9',
                    )}
                    loading="lazy"
                    decoding="async"
                />
                <div className="absolute top-2 left-2 drop-shadow-sm">
                    <EventStatusBadge status={status} />
                </div>
                <button
                    type="button"
                    onClick={() => onViewImage(event)}
                    className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-900/65 px-2.5 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur transition hover:bg-slate-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                    <Search className="size-3.5" />
                    View
                </button>
            </div>

            <div className="grid flex-1 content-start gap-3 pt-3">
                <div className="flex min-w-0 flex-wrap gap-2">
                    <EventDatePill event={event} />
                </div>

                <div className="grid gap-1.5">
                    <h2 className="line-clamp-2 text-base leading-snug font-bold break-words text-slate-800 dark:text-white">
                        {event.name}
                    </h2>

                    {event.description ? (
                        <p className="line-clamp-2 text-sm leading-6 whitespace-pre-line text-slate-500 dark:text-neutral-300">
                            {event.description}
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-1 text-sm">
                    <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#0038A8] dark:text-blue-300" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold break-words text-slate-950 dark:text-white">
                                {event.venue_name ?? 'Venue to be announced'}
                            </p>
                            {event.venue_address ? (
                                <p className="mt-0.5 line-clamp-2 text-xs leading-5 break-words text-slate-600 dark:text-neutral-400">
                                    {event.venue_address}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    {mapUrl ? (
                        <a
                            href={mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#0038A8] hover:underline dark:text-blue-300"
                        >
                            <ExternalLink className="size-3.5" />
                            Open Google Map
                        </a>
                    ) : null}

                    {mapEmbedUrl ? (
                        <div className="mt-1 overflow-hidden rounded-xl border border-[#d9e5f5] bg-[#eef5ff] dark:border-neutral-800 dark:bg-neutral-950">
                            <iframe
                                src={mapEmbedUrl}
                                title={`${event.name} pinned venue map`}
                                className="h-40 w-full"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                allowFullScreen
                            />
                        </div>
                    ) : null}
                </div>

                {previewMaterials.length > 0 ? (
                    <div className="grid gap-1.5 text-xs">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-950 dark:text-white">
                            <Package className="size-3.5 text-[#0038A8] dark:text-blue-300" />
                            Event kit
                        </div>

                        <div className="grid gap-1">
                            {previewMaterials.map((material) => (
                                <a
                                    key={material.id}
                                    href={material.url}
                                    download={toDownloadFileName(
                                        material.original_name,
                                    )}
                                    className="flex min-w-0 items-start gap-2 py-1 text-xs text-slate-700 transition hover:text-[#0038A8] dark:text-neutral-300 dark:hover:text-blue-300"
                                >
                                    <FileText className="mt-0.5 size-3 shrink-0 text-[#0038A8] dark:text-blue-300" />
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-1 font-medium break-words">
                                            {material.original_name}
                                        </span>
                                        {formatFileSize(material.size) ? (
                                            <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-neutral-400">
                                                {formatFileSize(material.size)}
                                            </span>
                                        ) : null}
                                    </span>
                                    <Download className="mt-0.5 size-3 shrink-0 text-slate-400" />
                                </a>
                            ))}
                            {hiddenMaterialsCount > 0 ? (
                                <p className="px-5 text-[11px] font-medium text-slate-500 dark:text-neutral-400">
                                    +{hiddenMaterialsCount} more materials
                                </p>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className="mt-auto flex flex-wrap justify-end gap-2 pt-1">
                    {event.pdf_url ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-10 rounded-xl px-4 text-sm font-semibold"
                            onClick={() => onViewPdf(event)}
                        >
                            View more
                            <FileText className="size-4" />
                        </Button>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function EventImageDialog({
    event,
    onOpenChange,
}: {
    event: PublicEvent | null;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={event !== null} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
                {event ? (
                    <>
                        <div className="bg-[#eef5ff] dark:bg-neutral-950">
                            <img
                                src={event.image_url ?? '/ched_logo-128.png'}
                                alt=""
                                className={cn(
                                    'max-h-[70vh] w-full object-contain',
                                    !event.image_url && 'p-12',
                                )}
                            />
                        </div>
                        <div className="grid gap-2 p-4 sm:p-5">
                            <DialogHeader className="text-left">
                                <DialogTitle className="text-lg leading-tight">
                                    {event.name}
                                </DialogTitle>
                                <DialogDescription>
                                    {formatDateRange(event)}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-wrap gap-2">
                                <EventStatusBadge
                                    status={getEventStatus(event)}
                                />
                                {event.venue_name ? (
                                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-neutral-300">
                                        <MapPin className="size-3.5" />
                                        {event.venue_name}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function EventPdfDialog({
    event,
    onOpenChange,
}: {
    event: PublicEvent | null;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={event !== null} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-3 p-4 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[94vw]">
                <DialogHeader className="shrink-0 text-left">
                    <DialogTitle className="inline-flex items-center gap-2 text-base">
                        <FileText className="size-4 text-slate-500 dark:text-neutral-400" />
                        {event?.name ?? 'Event details'}
                    </DialogTitle>
                    <DialogDescription>
                        Preview the event PDF before downloading.
                    </DialogDescription>
                </DialogHeader>

                {event?.pdf_url ? (
                    <iframe
                        src={event.pdf_url}
                        title={`${event.name} PDF preview`}
                        className="min-h-0 flex-1 rounded-xl border border-[#d9e5f5] bg-white dark:border-neutral-800"
                    />
                ) : null}

                <DialogFooter className="shrink-0">
                    {event?.pdf_url ? (
                        <Button asChild>
                            <a
                                href={event.pdf_url}
                                download={getProgramFlowFileName(event)}
                            >
                                <Download className="size-4" />
                                Download PDF
                            </a>
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function Events({ events }: Props) {
    const { auth } = usePage().props as PageProps;
    const accessHref = auth?.user ? '/participants' : '/login';
    const [search, setSearch] = useState('');
    const [viewingImageEvent, setViewingImageEvent] =
        useState<PublicEvent | null>(null);
    const [viewingPdfEvent, setViewingPdfEvent] =
        useState<PublicEvent | null>(null);
    const filteredEvents = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
            return events;
        }

        return events.filter((event) =>
            [
                event.name,
                event.description,
                event.venue_name,
                event.venue_address,
                formatDateRange(event),
                getEventStatus(event),
                ...event.materials.map((material) => material.original_name),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearch),
        );
    }, [events, search]);

    return (
        <>
            <Head title="Events">
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-[#f5f9ff] text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
                <PublicNav accessHref={accessHref} auth={auth} />

                <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:px-8">
                    <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div className="grid gap-1">
                            <h1 className="text-2xl leading-tight font-bold text-slate-950 sm:text-3xl dark:text-white">
                                Events
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-300">
                                Browse schedules, venues, program flow, and
                                event kit materials.
                            </p>
                        </div>

                        <div className="relative w-full md:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search events..."
                                className="h-10 w-full rounded-lg border border-[#d9e5f5] bg-white pr-3 pl-9 text-sm shadow-sm transition outline-none placeholder:text-slate-400 focus:border-[#0038A8] focus:ring-3 focus:ring-[#0038A8]/10 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                            />
                        </div>
                    </section>

                    {events.length > 0 ? (
                        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            {filteredEvents.map((event) => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onViewImage={setViewingImageEvent}
                                    onViewPdf={setViewingPdfEvent}
                                />
                            ))}
                            {filteredEvents.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-[#d9e5f5] bg-white p-8 text-center sm:col-span-2 lg:col-span-3 2xl:col-span-4 dark:border-neutral-800 dark:bg-neutral-900">
                                    <Search className="mx-auto size-7 text-slate-400" />
                                    <h2 className="mt-3 text-base font-semibold text-slate-950 dark:text-white">
                                        No matching events
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                                        Try searching by event name, venue,
                                        status, or material filename.
                                    </p>
                                </div>
                            ) : null}
                        </section>
                    ) : (
                        <section className="rounded-lg border border-dashed border-[#d9e5f5] bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                            <CalendarDays className="mx-auto size-8 text-slate-400" />
                            <h2 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                                No events available
                            </h2>
                            <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                                Active events will appear here once published.
                            </p>
                        </section>
                    )}
                </main>
                <EventImageDialog
                    event={viewingImageEvent}
                    onOpenChange={(open) => {
                        if (!open) {
                            setViewingImageEvent(null);
                        }
                    }}
                />
                <EventPdfDialog
                    event={viewingPdfEvent}
                    onOpenChange={(open) => {
                        if (!open) {
                            setViewingPdfEvent(null);
                        }
                    }}
                />
            </div>
        </>
    );
}
