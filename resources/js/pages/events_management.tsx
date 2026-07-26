import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FileText,
    ImagePlus,
    Lock,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Unlock,
    X,
} from 'lucide-react';
import type { ComponentProps, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type EventMaterial = {
    id: number;
    original_name: string;
    url: string;
    mime_type: string | null;
    size: number | null;
    created_at: string | null;
};

type EventMaterialDraft = {
    name: string;
    type: string;
    size: number;
    data: string;
};

type ManagedEvent = {
    id: number;
    name: string;
    description: string | null;
    venue_name: string | null;
    venue_address: string | null;
    venue_map_link: string | null;
    venue_latitude: string | null;
    venue_longitude: string | null;
    starts_at: string | null;
    ends_at: string | null;
    image_url: string | null;
    pdf_url: string | null;
    materials: EventMaterial[];
    is_active: boolean;
    is_registration_closed: boolean;
    users_count: number;
    created_at: string | null;
    creator: {
        id: number;
        name: string;
    } | null;
};

type EventForm = {
    name: string;
    description: string;
    starts_at: string;
    ends_at: string;
    image: File | null;
    pdf: File | null;
    materials: EventMaterialDraft[];
    remove_image: boolean;
    remove_pdf: boolean;
    is_active: boolean;
};

type EventVenueForm = {
    venue_name: string;
    venue_address: string;
    venue_map_link: string;
    venue_latitude: string;
    venue_longitude: string;
};

type Props = {
    events: ManagedEvent[];
};

const pageSizeOptions = [5, 10, 25];

const defaultForm: EventForm = {
    name: '',
    description: '',
    starts_at: '',
    ends_at: '',
    image: null,
    pdf: null,
    materials: [],
    remove_image: false,
    remove_pdf: false,
    is_active: true,
};

const defaultVenueForm: EventVenueForm = {
    venue_name: '',
    venue_address: '',
    venue_map_link: '',
    venue_latitude: '',
    venue_longitude: '',
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

const preventDialogOutsideClose: NonNullable<
    ComponentProps<typeof DialogContent>['onPointerDownOutside']
> = (event) => {
    const target = event.target;

    if (
        target instanceof HTMLElement &&
        target.closest('[data-radix-popper-content-wrapper]')
    ) {
        return;
    }

    event.preventDefault();
};

function toDateTimeLocal(value: string | null) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);

    return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalToIso(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toISOString();
}

function formatDateTime(value: string | null) {
    if (!value) {
        return '-';
    }

    return dateTimeFormatter.format(new Date(value));
}

function formatFileSize(value: number | null) {
    if (!value) {
        return '-';
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

function getProgramFlowFileName(event: ManagedEvent) {
    return toDownloadFileName(`${event.name} Program Flow`, 'pdf');
}

function toDateTime(value: string | null) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function getEventDateStatus(event: ManagedEvent) {
    const now = new Date();
    const startsAt = toDateTime(event.starts_at);
    const endsAt = toDateTime(event.ends_at);

    if (endsAt && now > endsAt) {
        return 'closed';
    }

    if (startsAt && now < startsAt) {
        return 'upcoming';
    }

    return 'ongoing';
}

function getVenueCoordinates(venue: EventVenueForm | ManagedEvent) {
    if (
        venue.venue_latitude === null ||
        venue.venue_longitude === null ||
        venue.venue_latitude.trim() === '' ||
        venue.venue_longitude.trim() === ''
    ) {
        return null;
    }

    const latitude = Number(venue.venue_latitude);
    const longitude = Number(venue.venue_longitude);

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

function getVenueMapSrc(venue: EventVenueForm | ManagedEvent) {
    const coordinates = getVenueCoordinates(venue);

    if (coordinates) {
        const exactLocation = encodeURIComponent(
            `loc:${coordinates.latitude},${coordinates.longitude}`,
        );

        return `https://maps.google.com/maps?output=embed&z=18&q=${exactLocation}`;
    }

    const query = [venue.venue_name, venue.venue_address]
        .filter(Boolean)
        .join(', ')
        .trim();

    if (!query) {
        return '';
    }

    return `https://maps.google.com/maps?output=embed&z=16&q=${encodeURIComponent(query)}`;
}

function extractCoordinatesFromMapsUrl(value: string) {
    let decodedValue = value.trim();

    try {
        decodedValue = decodeURIComponent(decodedValue);
    } catch {
        // Keep the raw value when the pasted URL contains an incomplete escape.
    }

    const patterns = [
        /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
        /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
        /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),/,
    ];

    for (const pattern of patterns) {
        const match = decodedValue.match(pattern);

        if (match) {
            return {
                latitude: Number(match[1]).toFixed(7),
                longitude: Number(match[2]).toFixed(7),
            };
        }
    }

    return null;
}

function TruncatedFileName({ name }: { name: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="block max-w-full truncate text-sm text-foreground">
                    {name}
                </span>
            </TooltipTrigger>
            <TooltipContent className="break-all">{name}</TooltipContent>
        </Tooltip>
    );
}

function readFileAsDataUrl(file: File): Promise<EventMaterialDraft> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                data: String(reader.result),
            });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

export default function EventsManagement({ events }: Props) {
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(pageSizeOptions[1]);
    const [page, setPage] = useState(1);
    const [editingEvent, setEditingEvent] = useState<ManagedEvent | null>(null);
    const [deletingEvent, setDeletingEvent] = useState<ManagedEvent | null>(
        null,
    );
    const [statusEvent, setStatusEvent] = useState<ManagedEvent | null>(null);
    const [registrationStatusEvent, setRegistrationStatusEvent] =
        useState<ManagedEvent | null>(null);
    const [venueEvent, setVenueEvent] = useState<ManagedEvent | null>(null);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        clearErrors,
        transform,
    } = useForm<EventForm>(defaultForm);
    const {
        data: venueData,
        setData: setVenueData,
        patch: patchVenue,
        processing: venueProcessing,
        errors: venueErrors,
        reset: resetVenue,
        clearErrors: clearVenueErrors,
    } = useForm<EventVenueForm>(defaultVenueForm);
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
    const [viewingPdfEvent, setViewingPdfEvent] = useState<ManagedEvent | null>(
        null,
    );
    const venueMapSrc = getVenueMapSrc(venueData);

    const filteredEvents = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return events;
        }

        return events.filter((event) =>
            [
                event.name,
                event.description,
                event.venue_name,
                event.venue_address,
                ...event.materials.map((material) => material.original_name),
                event.is_active ? 'active' : 'inactive',
                event.is_registration_closed
                    ? 'registration closed'
                    : 'registration open',
                event.creator?.name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(query),
        );
    }, [events, search]);

    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageEvents = filteredEvents.slice(startIndex, startIndex + pageSize);

    function updateSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    function updatePageSize(value: number) {
        setPageSize(value);
        setPage(1);
    }

    function openAddDialog() {
        reset();
        clearErrors();
        setEditingEvent(null);
        setImagePreviewUrl('');
        setDialogMode('add');
    }

    function openEditDialog(event: ManagedEvent) {
        clearErrors();
        setEditingEvent(event);
        setData({
            name: event.name,
            description: event.description ?? '',
            starts_at: toDateTimeLocal(event.starts_at),
            ends_at: toDateTimeLocal(event.ends_at),
            image: null,
            pdf: null,
            materials: [],
            remove_image: false,
            remove_pdf: false,
            is_active: event.is_active,
        });
        setImagePreviewUrl(event.image_url ?? '');
        setDialogMode('edit');
    }

    function closeFormDialog() {
        if (processing) {
            return;
        }

        setDialogMode(null);
        setEditingEvent(null);
        setImagePreviewUrl('');
        reset();
        clearErrors();
    }

    function openVenueDialog(event: ManagedEvent) {
        clearVenueErrors();
        setVenueEvent(event);
        setVenueData({
            venue_name: event.venue_name ?? '',
            venue_address: event.venue_address ?? '',
            venue_map_link: event.venue_map_link ?? '',
            venue_latitude: event.venue_latitude ?? '',
            venue_longitude: event.venue_longitude ?? '',
        });
    }

    function closeVenueDialog() {
        if (venueProcessing) {
            return;
        }

        setVenueEvent(null);
        resetVenue();
        clearVenueErrors();
    }

    function updateVenueMapLink(value: string) {
        setVenueData('venue_map_link', value);

        const coordinates = extractCoordinatesFromMapsUrl(value);

        if (!coordinates) {
            return;
        }

        setVenueData('venue_latitude', coordinates.latitude);
        setVenueData('venue_longitude', coordinates.longitude);
    }

    function submitForm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: closeFormDialog,
        };

        if (dialogMode === 'edit' && editingEvent) {
            transform((data) => ({
                ...data,
                starts_at: fromDateTimeLocalToIso(data.starts_at),
                ends_at: fromDateTimeLocalToIso(data.ends_at),
                _method: 'patch',
            }));
            post(`/events-management/${editingEvent.id}`, options);

            return;
        }

        transform((data) => ({
            ...data,
            starts_at: fromDateTimeLocalToIso(data.starts_at),
            ends_at: fromDateTimeLocalToIso(data.ends_at),
        }));
        post('/events-management', options);
    }

    function submitStatusToggle() {
        if (!statusEvent) {
            return;
        }

        router.patch(
            `/events-management/${statusEvent.id}/status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setStatusEvent(null),
            },
        );
    }

    function submitRegistrationStatusToggle() {
        if (!registrationStatusEvent) {
            return;
        }

        router.patch(
            `/events-management/${registrationStatusEvent.id}/registration-status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => setRegistrationStatusEvent(null),
            },
        );
    }

    function submitVenue(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!venueEvent) {
            return;
        }

        patchVenue(`/events-management/${venueEvent.id}/venue`, {
            preserveScroll: true,
            onSuccess: closeVenueDialog,
        });
    }

    function submitDelete() {
        if (!deletingEvent) {
            return;
        }

        router.delete(`/events-management/${deletingEvent.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingEvent(null),
        });
    }

    function updateImage(file: File | null) {
        setData('image', file);
        setData('remove_image', false);
        setImagePreviewUrl(file ? URL.createObjectURL(file) : '');
    }

    async function addMaterials(files: FileList | null) {
        if (!files?.length) {
            return;
        }

        const drafts = await Promise.all(
            Array.from(files).map(readFileAsDataUrl),
        );

        setData('materials', [...data.materials, ...drafts]);
    }

    function removeSelectedMaterial(indexToRemove: number) {
        setData(
            'materials',
            data.materials.filter((_, index) => index !== indexToRemove),
        );
    }

    function deleteExistingMaterial(material: EventMaterial) {
        router.delete(`/events-management/materials/${material.id}`, {
            preserveScroll: true,
        });
    }

    const formTitle = dialogMode === 'edit' ? 'Edit Event' : 'Add Event';

    return (
        <>
            <Head title="Events" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Events
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Admin-only event setup for registration pages and event
                        materials.
                    </p>
                </div>

                <section className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <CalendarDays className="size-4" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <h2 className="text-base font-medium">
                                    Event Management
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Add schedules, images, PDF details, and kit
                                    materials.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            onClick={openAddDialog}
                            className="h-8 justify-center text-xs"
                        >
                            <Plus className="size-3.5" />
                            Add event
                        </Button>
                    </div>

                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-sm">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    updateSearch(event.target.value)
                                }
                                placeholder="Search events..."
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground md:justify-end">
                            <span>Rows</span>
                            <select
                                value={pageSize}
                                onChange={(event) =>
                                    updatePageSize(Number(event.target.value))
                                }
                                className="h-9 rounded-md border border-input bg-background px-2 text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                {pageSizeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="divide-y md:hidden">
                        {pageEvents.length > 0 ? (
                            pageEvents.map((event, index) => (
                                <article key={event.id} className="p-3 sm:p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                                                Seq {startIndex + index + 1}
                                            </p>
                                            <h3 className="truncate text-sm font-semibold">
                                                {event.name}
                                            </h3>
                                            <p className="line-clamp-2 text-xs text-muted-foreground">
                                                {event.description ?? '-'}
                                            </p>
                                        </div>
                                        <ActionButtons
                                            event={event}
                                            onEdit={openEditDialog}
                                            onVenue={openVenueDialog}
                                            onStatus={setStatusEvent}
                                            onRegistrationStatus={
                                                setRegistrationStatusEvent
                                            }
                                            onDelete={setDeletingEvent}
                                        />
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <EventDateStatusBadge event={event} />
                                        <EventRegistrationStatusBadge
                                            event={event}
                                        />
                                        <Badge variant="outline">
                                            {formatDateTime(event.starts_at)}
                                        </Badge>
                                        <Badge variant="outline">
                                            {event.users_count.toLocaleString()}{' '}
                                            participants
                                        </Badge>
                                        {event.pdf_url && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                type="button"
                                                onClick={() =>
                                                    setViewingPdfEvent(event)
                                                }
                                            >
                                                <ExternalLink className="size-3.5" />
                                                View more
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="p-10 text-center text-sm text-muted-foreground">
                                No events found.
                            </div>
                        )}
                    </div>

                    <Table className="hidden min-w-[88rem] table-fixed text-xs md:table">
                        <TableHeader>
                            <TableRow className="bg-muted/45 hover:bg-muted/45">
                                <TableHead className="h-9 w-12 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    Seq
                                </TableHead>
                                <TableHead className="h-9 w-[16rem] px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    Event
                                </TableHead>
                                <TableHead className="h-9 w-[16rem] px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    Event Venue
                                </TableHead>
                                <TableHead className="h-9 w-44 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    Schedule
                                </TableHead>
                                <TableHead className="h-9 w-24 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    Image
                                </TableHead>
                                <TableHead className="h-9 w-28 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    PDF
                                </TableHead>
                                <TableHead className="h-9 w-56 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    Event Kit Materials
                                </TableHead>
                                <TableHead className="h-9 w-32 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                    Status
                                </TableHead>
                                <TableHead className="h-9 w-24 px-2 text-right text-[11px] font-semibold text-muted-foreground uppercase">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageEvents.length > 0 ? (
                                pageEvents.map((event, index) => (
                                    <TableRow
                                        key={event.id}
                                        className="odd:bg-muted/[0.18]"
                                    >
                                        <TableCell className="px-2 py-2 font-medium text-muted-foreground">
                                            {startIndex + index + 1}
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {event.name}
                                                </p>
                                                <p className="line-clamp-2 text-muted-foreground">
                                                    {event.description ?? '-'}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-2 py-2 whitespace-normal">
                                            {event.venue_name ||
                                            event.venue_address ? (
                                                <div className="min-w-0 leading-5">
                                                    <p className="truncate font-medium">
                                                        {event.venue_name ??
                                                            '-'}
                                                    </p>
                                                    <p className="line-clamp-2 text-muted-foreground">
                                                        {event.venue_address ??
                                                            '-'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 leading-5 text-muted-foreground">
                                            <p>
                                                {formatDateTime(
                                                    event.starts_at,
                                                )}
                                            </p>
                                            <p>
                                                {formatDateTime(event.ends_at)}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            {event.image_url ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewingImageUrl(
                                                            event.image_url,
                                                        )
                                                    }
                                                    className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    aria-label={`View ${event.name} image`}
                                                >
                                                    <img
                                                        src={event.image_url}
                                                        alt=""
                                                        className="h-12 w-16 rounded-md border object-cover"
                                                    />
                                                </button>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            {event.pdf_url ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    type="button"
                                                    onClick={() =>
                                                        setViewingPdfEvent(
                                                            event,
                                                        )
                                                    }
                                                >
                                                    <ExternalLink className="size-3.5" />
                                                    View more
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            {event.materials.length > 0 ? (
                                                <div className="space-y-1">
                                                    {event.materials
                                                        .slice(0, 2)
                                                        .map((material) => (
                                                            <a
                                                                key={
                                                                    material.id
                                                                }
                                                                href={
                                                                    material.url
                                                                }
                                                                download={
                                                                    material.original_name
                                                                }
                                                                className="block min-w-0 text-[#0038A8] hover:underline dark:text-blue-300"
                                                            >
                                                                <TruncatedFileName
                                                                    name={
                                                                        material.original_name
                                                                    }
                                                                />
                                                            </a>
                                                        ))}
                                                    {event.materials.length >
                                                        2 && (
                                                        <p className="text-muted-foreground">
                                                            +
                                                            {event.materials
                                                                .length -
                                                                2}{' '}
                                                            more
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            <div className="flex flex-wrap gap-1.5">
                                                <EventDateStatusBadge
                                                    event={event}
                                                />
                                                <EventRegistrationStatusBadge
                                                    event={event}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            <div className="flex justify-end">
                                                <ActionButtons
                                                    event={event}
                                                    onEdit={openEditDialog}
                                                    onVenue={openVenueDialog}
                                                    onStatus={setStatusEvent}
                                                    onRegistrationStatus={
                                                        setRegistrationStatusEvent
                                                    }
                                                    onDelete={setDeletingEvent}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={9}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No events found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex flex-col gap-3 border-t p-3 text-sm text-muted-foreground sm:p-4 md:flex-row md:items-center md:justify-between">
                        <p>
                            Showing{' '}
                            <span className="font-medium text-foreground">
                                {filteredEvents.length === 0
                                    ? 0
                                    : startIndex + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium text-foreground">
                                {Math.min(
                                    startIndex + pageSize,
                                    filteredEvents.length,
                                )}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-foreground">
                                {filteredEvents.length}
                            </span>{' '}
                            events
                        </p>
                        <div className="flex items-center justify-center gap-2 md:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Previous page"
                                disabled={currentPage === 1}
                                onClick={() =>
                                    setPage(Math.max(1, currentPage - 1))
                                }
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <span className="min-w-24 text-center">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Next page"
                                disabled={currentPage === totalPages}
                                onClick={() =>
                                    setPage(
                                        Math.min(totalPages, currentPage + 1),
                                    )
                                }
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                </section>
            </div>

            <Dialog
                open={dialogMode !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeFormDialog();
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-2xl"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            {dialogMode === 'edit' ? (
                                <Pencil className="size-4 text-muted-foreground" />
                            ) : (
                                <Plus className="size-4 text-muted-foreground" />
                            )}
                            {formTitle}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Fill in the event details shown to registrants.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitForm} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="event-name">Event Title</Label>
                            <Input
                                id="event-name"
                                value={data.name}
                                onChange={(event) =>
                                    setData('name', event.target.value)
                                }
                                aria-invalid={!!errors.name}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="event-description">
                                Event Description
                            </Label>
                            <textarea
                                id="event-description"
                                value={data.description}
                                onChange={(event) =>
                                    setData('description', event.target.value)
                                }
                                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                aria-invalid={!!errors.description}
                            />
                            <InputError message={errors.description} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="event-starts-at">
                                    Starts At
                                </Label>
                                <Input
                                    id="event-starts-at"
                                    type="datetime-local"
                                    value={data.starts_at}
                                    onChange={(event) =>
                                        setData('starts_at', event.target.value)
                                    }
                                    aria-invalid={!!errors.starts_at}
                                />
                                <InputError message={errors.starts_at} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event-ends-at">Ends At</Label>
                                <Input
                                    id="event-ends-at"
                                    type="datetime-local"
                                    value={data.ends_at}
                                    onChange={(event) =>
                                        setData('ends_at', event.target.value)
                                    }
                                    aria-invalid={!!errors.ends_at}
                                />
                                <InputError message={errors.ends_at} />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="event-image">Image</Label>
                                <label
                                    htmlFor="event-image"
                                    className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground hover:bg-muted/50"
                                >
                                    {imagePreviewUrl ? (
                                        <img
                                            src={imagePreviewUrl}
                                            alt=""
                                            className="h-16 w-24 rounded-md border object-cover"
                                        />
                                    ) : (
                                        <ImagePlus className="size-5" />
                                    )}
                                    <span className="w-full max-w-64">
                                        {data.image ? (
                                            <TruncatedFileName
                                                name={data.image.name}
                                            />
                                        ) : (
                                            'Upload event image'
                                        )}
                                    </span>
                                </label>
                                <input
                                    id="event-image"
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(event) => {
                                        updateImage(
                                            event.target.files?.[0] ?? null,
                                        );
                                    }}
                                />
                                {editingEvent?.image_url && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setData(
                                                    'remove_image',
                                                    !data.remove_image,
                                                )
                                            }
                                        >
                                            {data.remove_image
                                                ? 'Keep image'
                                                : 'Remove image'}
                                        </Button>
                                    </div>
                                )}
                                <InputError message={errors.image} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="event-pdf">
                                    PDF (View more)
                                </Label>
                                <label
                                    htmlFor="event-pdf"
                                    className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground hover:bg-muted/50"
                                >
                                    <FileText className="size-5" />
                                    <span className="w-full max-w-64">
                                        {data.pdf ? (
                                            <TruncatedFileName
                                                name={data.pdf.name}
                                            />
                                        ) : (
                                            'Upload event PDF'
                                        )}
                                    </span>
                                </label>
                                <input
                                    id="event-pdf"
                                    type="file"
                                    accept="application/pdf"
                                    className="sr-only"
                                    onChange={(event) => {
                                        setData(
                                            'pdf',
                                            event.target.files?.[0] ?? null,
                                        );
                                        setData('remove_pdf', false);
                                    }}
                                />
                                {editingEvent?.pdf_url && !data.pdf && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() =>
                                                setViewingPdfEvent(editingEvent)
                                            }
                                        >
                                            <ExternalLink className="size-3.5" />
                                            View more
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setData(
                                                    'remove_pdf',
                                                    !data.remove_pdf,
                                                )
                                            }
                                        >
                                            {data.remove_pdf
                                                ? 'Keep PDF'
                                                : 'Remove PDF'}
                                        </Button>
                                    </div>
                                )}
                                <InputError message={errors.pdf} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="event-materials">
                                Event Kit Materials
                            </Label>
                            <label
                                htmlFor="event-materials"
                                className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground hover:bg-muted/50"
                            >
                                <FileText className="size-5" />
                                Upload PDF, DOC, PPT, ZIP, or image files
                            </label>
                            <input
                                id="event-materials"
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,image/*"
                                className="sr-only"
                                onChange={(event) => {
                                    addMaterials(event.target.files);
                                    event.target.value = '';
                                }}
                            />
                            <InputError
                                message={
                                    errors.materials ||
                                    Object.entries(errors).find(([key]) =>
                                        key.startsWith('materials.'),
                                    )?.[1]
                                }
                            />

                            {((editingEvent?.materials.length ?? 0) > 0 ||
                                data.materials.length > 0) && (
                                <div className="overflow-hidden rounded-md border">
                                    <Table className="table-fixed text-xs">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File</TableHead>
                                                <TableHead className="w-24">
                                                    Size
                                                </TableHead>
                                                <TableHead className="w-14 text-right">
                                                    Delete
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {editingEvent?.materials.map(
                                                (material) => (
                                                    <TableRow key={material.id}>
                                                        <TableCell className="min-w-0">
                                                            <a
                                                                href={
                                                                    material.url
                                                                }
                                                                download={
                                                                    material.original_name
                                                                }
                                                                className="block min-w-0 text-[#0038A8] hover:underline dark:text-blue-300"
                                                            >
                                                                <TruncatedFileName
                                                                    name={
                                                                        material.original_name
                                                                    }
                                                                />
                                                            </a>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {formatFileSize(
                                                                material.size,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-destructive"
                                                                aria-label={`Delete ${material.original_name}`}
                                                                onClick={() =>
                                                                    deleteExistingMaterial(
                                                                        material,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                            {data.materials.map(
                                                (material, index) => (
                                                    <TableRow
                                                        key={`${material.name}-${index}`}
                                                    >
                                                        <TableCell className="min-w-0">
                                                            <TruncatedFileName
                                                                name={
                                                                    material.name
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {formatFileSize(
                                                                material.size,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-destructive"
                                                                aria-label={`Delete ${material.name}`}
                                                                onClick={() =>
                                                                    removeSelectedMaterial(
                                                                        index,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(event) =>
                                    setData('is_active', event.target.checked)
                                }
                            />
                            Active
                        </label>

                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={closeFormDialog}
                                disabled={processing}
                            >
                                <X className="size-3.5" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={venueEvent !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeVenueDialog();
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-3xl"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <MapPin className="size-4 text-muted-foreground" />
                            Add Venue
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Set the venue for{' '}
                            <span className="font-medium text-foreground">
                                {venueEvent?.name}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitVenue} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="event-venue-name">
                                    Venue Name
                                </Label>
                                <Input
                                    id="event-venue-name"
                                    value={venueData.venue_name}
                                    onChange={(event) =>
                                        setVenueData(
                                            'venue_name',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!venueErrors.venue_name}
                                />
                                <InputError message={venueErrors.venue_name} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event-venue-address">
                                    Address
                                </Label>
                                <Input
                                    id="event-venue-address"
                                    value={venueData.venue_address}
                                    onChange={(event) =>
                                        setVenueData(
                                            'venue_address',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!venueErrors.venue_address}
                                />
                                <InputError
                                    message={venueErrors.venue_address}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="event-venue-map-link">
                                Google Maps link
                            </Label>
                            <Input
                                id="event-venue-map-link"
                                value={venueData.venue_map_link}
                                onChange={(event) =>
                                    updateVenueMapLink(event.target.value)
                                }
                                placeholder="Paste full Google Maps URL to use its exact pin"
                                aria-invalid={!!venueErrors.venue_map_link}
                            />
                            <InputError message={venueErrors.venue_map_link} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="event-venue-latitude">
                                    Latitude
                                </Label>
                                <Input
                                    id="event-venue-latitude"
                                    value={venueData.venue_latitude}
                                    onChange={(event) =>
                                        setVenueData(
                                            'venue_latitude',
                                            event.target.value,
                                        )
                                    }
                                    inputMode="decimal"
                                    aria-invalid={!!venueErrors.venue_latitude}
                                />
                                <InputError
                                    message={venueErrors.venue_latitude}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="event-venue-longitude">
                                    Longitude
                                </Label>
                                <Input
                                    id="event-venue-longitude"
                                    value={venueData.venue_longitude}
                                    onChange={(event) =>
                                        setVenueData(
                                            'venue_longitude',
                                            event.target.value,
                                        )
                                    }
                                    inputMode="decimal"
                                    aria-invalid={!!venueErrors.venue_longitude}
                                />
                                <InputError
                                    message={venueErrors.venue_longitude}
                                />
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-md border bg-muted/30">
                            {venueMapSrc ? (
                                <iframe
                                    src={venueMapSrc}
                                    title="Venue map preview"
                                    className="h-[min(18rem,45dvh)] w-full"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="flex h-[min(18rem,45dvh)] items-center justify-center px-3 text-center text-sm text-muted-foreground">
                                    Enter a venue name or address to preview the
                                    map.
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={closeVenueDialog}
                                disabled={venueProcessing}
                            >
                                <X className="size-3.5" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={venueProcessing}
                            >
                                Save venue
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={statusEvent !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setStatusEvent(null);
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-sm"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            {statusEvent?.is_active ? (
                                <ToggleLeft className="size-4 text-amber-500" />
                            ) : (
                                <ToggleRight className="size-4 text-emerald-600" />
                            )}
                            {statusEvent?.is_active
                                ? 'Set inactive?'
                                : 'Set active?'}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Change whether{' '}
                            <span className="font-medium text-foreground">
                                {statusEvent?.name}
                            </span>{' '}
                            can be selected in new registrations.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusEvent(null)}
                        >
                            <X className="size-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={submitStatusToggle}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={registrationStatusEvent !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRegistrationStatusEvent(null);
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-sm"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            {registrationStatusEvent?.is_registration_closed ? (
                                <Unlock className="size-4 text-emerald-600" />
                            ) : (
                                <Lock className="size-4 text-amber-500" />
                            )}
                            {registrationStatusEvent?.is_registration_closed
                                ? 'Open registration?'
                                : 'Close registration?'}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            {registrationStatusEvent?.is_registration_closed
                                ? 'Allow new registrations for '
                                : 'Stop new registrations for '}
                            <span className="font-medium text-foreground">
                                {registrationStatusEvent?.name}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRegistrationStatusEvent(null)}
                        >
                            <X className="size-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={submitRegistrationStatusToggle}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deletingEvent !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingEvent(null);
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-sm"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <AlertTriangle className="size-4 text-destructive" />
                            Delete event?
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Delete{' '}
                            <span className="font-medium text-foreground">
                                {deletingEvent?.name}
                            </span>
                            ? Existing participant records will remain, but the
                            event will no longer be available.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingEvent(null)}
                        >
                            <X className="size-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={submitDelete}
                        >
                            <Trash2 className="size-3.5" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={viewingImageUrl !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingImageUrl(null);
                    }
                }}
            >
                <DialogContent
                    className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-hidden border-0 bg-black p-0 shadow-2xl sm:w-[92vw] sm:max-w-4xl [&>button]:top-3 [&>button]:right-3 [&>button]:bg-white/15 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/25 [&>button]:focus:ring-white/60"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>Event image preview</DialogTitle>
                        <DialogDescription>
                            Full size event image preview.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingImageUrl && (
                        <div className="flex max-h-[92dvh] min-h-64 w-full items-center justify-center p-3 sm:min-h-80 sm:p-6">
                            <img
                                src={viewingImageUrl}
                                alt=""
                                className="max-h-[86dvh] max-w-full object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={viewingPdfEvent !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingPdfEvent(null);
                    }
                }}
            >
                <DialogContent
                    className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-3 p-4 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[94vw]"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="shrink-0 gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <FileText className="size-4 text-muted-foreground" />
                            PDF Preview
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            View more event details.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingPdfEvent?.pdf_url && (
                        <iframe
                            src={viewingPdfEvent.pdf_url}
                            title="Event PDF preview"
                            className="h-full min-h-0 w-full flex-1 rounded-md border"
                        />
                    )}
                    <DialogFooter className="shrink-0">
                        {viewingPdfEvent?.pdf_url && (
                            <Button asChild>
                                <a
                                    href={viewingPdfEvent.pdf_url}
                                    download={getProgramFlowFileName(
                                        viewingPdfEvent,
                                    )}
                                >
                                    <FileText className="size-4" />
                                    Download PDF
                                </a>
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ActionButtons({
    event,
    onEdit,
    onVenue,
    onStatus,
    onRegistrationStatus,
    onDelete,
}: {
    event: ManagedEvent;
    onEdit: (event: ManagedEvent) => void;
    onVenue: (event: ManagedEvent) => void;
    onStatus: (event: ManagedEvent) => void;
    onRegistrationStatus: (event: ManagedEvent) => void;
    onDelete: (event: ManagedEvent) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Open actions for ${event.name}`}
                    className="size-8"
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem onSelect={() => onEdit(event)}>
                    <Pencil className="size-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onVenue(event)}>
                    <MapPin className="size-4" />
                    Add venue
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onStatus(event)}>
                    {event.is_active ? (
                        <ToggleLeft className="size-4" />
                    ) : (
                        <ToggleRight className="size-4" />
                    )}
                    {event.is_active ? 'Set inactive' : 'Set active'}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onRegistrationStatus(event)}>
                    {event.is_registration_closed ? (
                        <Unlock className="size-4" />
                    ) : (
                        <Lock className="size-4" />
                    )}
                    {event.is_registration_closed
                        ? 'Open registration'
                        : 'Close registration'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(event)}
                >
                    <Trash2 className="size-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function EventDateStatusBadge({ event }: { event: ManagedEvent }) {
    const status = getEventDateStatus(event);

    return (
        <Badge
            className={cn(
                'border-transparent capitalize',
                status === 'ongoing' &&
                    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
                status === 'closed' &&
                    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
                status === 'upcoming' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            )}
        >
            {status}
        </Badge>
    );
}

function EventRegistrationStatusBadge({ event }: { event: ManagedEvent }) {
    return (
        <Badge
            className={cn(
                'border-transparent capitalize',
                event.is_registration_closed
                    ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
            )}
        >
            {event.is_registration_closed
                ? 'Registration closed'
                : 'Registration open'}
        </Badge>
    );
}

EventsManagement.layout = {
    breadcrumbs: [
        {
            title: 'Events',
            href: '/events-management',
        },
    ],
};
