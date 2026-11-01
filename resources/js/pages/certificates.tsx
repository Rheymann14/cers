import { Head, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Award,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Download,
    FileText,
    Printer,
    Search,
    Settings2,
    X,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CertificateSettings } from '@/components/certificates/certificate-settings-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useCertificatePdf } from '@/hooks/use-certificate-pdf';
import { useInitials } from '@/hooks/use-initials';
import { paperSizes } from '@/lib/certificate-config';
import type { CertificateEvent, PaperSize } from '@/lib/certificate-config';
import { cn } from '@/lib/utils';
import { certificates as certificatesRoute } from '@/routes';

const CertificatePdfViewer = lazy(
    () => import('@/components/certificates/certificate-pdf-viewer'),
);
const CertificateSettingsDialog = lazy(
    () => import('@/components/certificates/certificate-settings-dialog'),
);

const PAPER_SIZE_STORAGE_KEY = 'cers.certificates.paper-size';

type EventStatus = 'ongoing' | 'upcoming' | 'closed';

type EventOption = {
    id: number;
    value: string;
    label: string;
    starts_at: string | null;
    ends_at: string | null;
    checked_in_count: number;
};

type SelectedEvent = CertificateEvent & {
    id: number;
    slug: string;
};

type Recipient = {
    id: number;
    participant_id: string | null;
    name: string;
    email: string | null;
    avatar: string | null;
    organization: string | null;
    position: string | null;
    participant_type: string | null;
    days_attended: number;
    first_checked_in_at: string | null;
};

type PaginatedRecipients = {
    data: Recipient[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type SortKey = 'name' | 'organization' | 'checked_in_at';

type SortDirection = 'asc' | 'desc';

type Filters = {
    search: string;
    event: string | null;
    sort: SortKey;
    direction: SortDirection;
    per_page: number;
};

type Props = {
    events: EventOption[];
    selectedEvent: SelectedEvent | null;
    certificate: CertificateSettings | null;
    participants: PaginatedRecipients | null;
    filters: Filters;
    timezone: string;
};

type PrintRequest = {
    label: string;
    ids?: number[];
    search?: string;
};

const columns: { key: SortKey | null; label: string; className: string }[] = [
    { key: 'name', label: 'Participant', className: 'w-[26%]' },
    { key: 'organization', label: 'Organization', className: 'w-[24%]' },
    { key: null, label: 'Position', className: 'w-[16%]' },
    { key: null, label: 'Type', className: 'w-[11%]' },
    { key: 'checked_in_at', label: 'Checked in', className: 'w-[15%]' },
];

function toDate(value: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getEventStatus(event: EventOption, now = new Date()): EventStatus {
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

function formatLabel(value: string | null): string {
    if (!value) {
        return '-';
    }

    return value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatDateTime(value: string | null, timeZone: string): string {
    const date = toDate(value);

    if (!date) {
        return '-';
    }

    return new Intl.DateTimeFormat('en', {
        timeZone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function sanitizeFilePart(value: string): string {
    return (
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'event'
    );
}

function readStoredPaperSize(): PaperSize {
    try {
        const value = window.localStorage.getItem(PAPER_SIZE_STORAGE_KEY);

        return value && value in paperSizes ? (value as PaperSize) : 'a4';
    } catch {
        return 'a4';
    }
}

function FilterCountBadge({ count }: { count: number }) {
    return (
        <Badge
            variant="secondary"
            className="ml-auto shrink-0 px-1.5 py-0 text-[10px]"
        >
            {count}
        </Badge>
    );
}

function EventStatusBadge({ status }: { status: EventStatus }) {
    return (
        <Badge
            className={cn(
                'shrink-0 border-transparent px-1.5 py-0 text-[10px] capitalize',
                status === 'ongoing' &&
                    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
                status === 'upcoming' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                status === 'closed' &&
                    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
            )}
        >
            {status}
        </Badge>
    );
}

function EventFilter({
    value,
    options,
    onChange,
}: {
    value: string | null;
    options: EventOption[];
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Filter certificates by event"
                    className="h-auto min-h-8 justify-between gap-2 px-2 py-1 text-xs"
                >
                    <span className="max-w-44 truncate text-left">
                        {selectedOption?.label ?? 'Select event'}
                    </span>
                    {selectedOption && (
                        <EventStatusBadge
                            status={getEventStatus(selectedOption)}
                        />
                    )}
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[min(calc(100vw-2rem),24rem)] p-0"
            >
                <Command>
                    <CommandInput placeholder="Search events..." />
                    <CommandList>
                        <CommandEmpty>No event found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const status = getEventStatus(option);

                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={`${option.label} ${status} ${option.starts_at ?? ''} ${option.ends_at ?? ''}`}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                        className="items-start"
                                    >
                                        <Check
                                            className={cn(
                                                'mt-0.5 mr-2 size-4 shrink-0',
                                                value === option.value
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <span className="min-w-0 flex-1 break-words whitespace-normal">
                                            {option.label}
                                        </span>
                                        <EventStatusBadge status={status} />
                                        <FilterCountBadge
                                            count={option.checked_in_count}
                                        />
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function RecipientsTableSkeleton() {
    return (
        <TableBody>
            {Array.from({ length: 6 }, (_, index) => (
                <TableRow key={index} className="odd:bg-muted/[0.18]">
                    <TableCell className="px-2 py-2">
                        <Skeleton className="size-4" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-4 w-6" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="size-8 rounded-full" />
                            <div className="grid flex-1 gap-1.5">
                                <Skeleton className="h-3.5 w-36" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-3.5 w-40" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-3.5 w-24" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-3.5 w-28" />
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right">
                        <Skeleton className="ml-auto size-8" />
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    );
}

function RecipientAvatar({ recipient }: { recipient: Recipient }) {
    const getInitials = useInitials();

    return (
        <Avatar className="size-8 shrink-0">
            {recipient.avatar && (
                <AvatarImage src={recipient.avatar} alt={recipient.name} />
            )}
            <AvatarFallback className="text-[11px]">
                {getInitials(recipient.name)}
            </AvatarFallback>
        </Avatar>
    );
}

function printPdf(
    url: string,
    frameRef: { current: HTMLIFrameElement | null },
) {
    frameRef.current?.remove();

    // Firefox can't print a PDF from a hidden frame; its viewer prints from a tab.
    if (navigator.userAgent.includes('Firefox')) {
        window.open(url, '_blank', 'noopener');

        return;
    }

    const frame = document.createElement('iframe');
    frame.setAttribute(
        'style',
        'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; visibility: hidden;',
    );
    frame.src = url;
    frame.onload = () => {
        try {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
        } catch {
            window.open(url, '_blank', 'noopener');
        }
    };
    document.body.appendChild(frame);
    frameRef.current = frame;
}

function CertificatePrintDialog({
    request,
    onClose,
    event,
    settings,
    timeZone,
}: {
    request: PrintRequest | null;
    onClose: () => void;
    event: SelectedEvent;
    settings: CertificateSettings;
    timeZone: string;
}) {
    const [paperSize, setPaperSize] = useState<PaperSize>(readStoredPaperSize);
    const [result, setResult] = useState<{
        key: string;
        recipients: Recipient[];
        error: string | null;
    } | null>(null);
    const printFrameRef = useRef<HTMLIFrameElement | null>(null);
    const requestKey = request
        ? JSON.stringify({ event: event.id, ...request })
        : null;
    const loaded = result !== null && result.key === requestKey;
    const recipients = loaded ? result.recipients : [];
    const pdf = useCertificatePdf(
        loaded && recipients.length > 0
            ? {
                  template: settings,
                  event,
                  recipients,
                  paperSize,
                  timeZone,
              }
            : null,
    );

    useEffect(() => {
        if (!requestKey) {
            return;
        }

        const {
            event: eventId,
            ids,
            search,
        } = JSON.parse(requestKey) as {
            event: number;
        } & PrintRequest;
        const params = new URLSearchParams();
        const controller = new AbortController();

        if (search) {
            params.set('search', search);
        }

        ids?.forEach((id) => params.append('ids[]', String(id)));

        fetch(`/certificates/${eventId}/recipients?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Request failed');
                }

                return response.json() as Promise<Recipient[]>;
            })
            .then((data) =>
                setResult({ key: requestKey, recipients: data, error: null }),
            )
            .catch(() => {
                if (!controller.signal.aborted) {
                    setResult({
                        key: requestKey,
                        recipients: [],
                        error: 'Unable to load checked-in participants.',
                    });
                }
            });

        return () => controller.abort();
    }, [requestKey]);

    useEffect(
        () => () => {
            printFrameRef.current?.remove();
        },
        [],
    );

    function updatePaperSize(size: PaperSize) {
        setPaperSize(size);

        try {
            window.localStorage.setItem(PAPER_SIZE_STORAGE_KEY, size);
        } catch {
            // Remembering the paper size is only a convenience.
        }
    }

    function download() {
        if (!pdf.url) {
            return;
        }

        const link = document.createElement('a');
        link.href = pdf.url;
        link.download = `${sanitizeFilePart(event.name)}-certificates-${paperSize}.pdf`;
        link.click();
    }

    const paper = paperSizes[paperSize];
    const error =
        (loaded ? result.error : null) ??
        pdf.error ??
        (loaded && recipients.length === 0
            ? 'No checked-in participants to print.'
            : null);

    return (
        <Dialog
            open={request !== null}
            onOpenChange={(open) => {
                if (!open) {
                    printFrameRef.current?.remove();
                    onClose();
                }
            }}
        >
            <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col gap-3 p-4 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[94vw] sm:max-w-[94vw] lg:max-w-5xl">
                <DialogHeader className="shrink-0 gap-1 text-left">
                    <DialogTitle className="inline-flex items-center gap-2 text-base">
                        <Printer className="size-4 text-muted-foreground" />
                        Print certificates
                    </DialogTitle>
                    <DialogDescription className="text-xs leading-5">
                        {request?.label}
                        {loaded && recipients.length > 0 && (
                            <>
                                {' '}
                                &middot; {recipients.length}{' '}
                                {recipients.length === 1 ? 'page' : 'pages'}
                            </>
                        )}{' '}
                        &middot; Certificate of Appearance and Certificate of
                        Participation on one page.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
                        {(Object.keys(paperSizes) as PaperSize[]).map(
                            (size) => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => updatePaperSize(size)}
                                    className={cn(
                                        'flex flex-1 flex-col items-center rounded-md px-3 py-1 transition-colors sm:flex-none',
                                        paperSize === size
                                            ? 'bg-background text-foreground shadow-xs'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <span className="text-xs font-medium">
                                        {paperSizes[size].label}
                                    </span>
                                    <span className="text-[10px] opacity-75">
                                        {paperSizes[size].description}
                                    </span>
                                </button>
                            ),
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={download}
                            disabled={!pdf.url || pdf.generating}
                            className="h-8 px-2 text-xs"
                        >
                            <Download className="size-3.5" />
                            Download PDF
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                                pdf.url && printPdf(pdf.url, printFrameRef)
                            }
                            disabled={!pdf.url || pdf.generating}
                            className="h-8 px-2 text-xs"
                        >
                            <Printer className="size-3.5" />
                            Print
                        </Button>
                    </div>
                </div>

                <Suspense
                    fallback={
                        <Skeleton className="min-h-0 flex-1 rounded-xl" />
                    }
                >
                    <CertificatePdfViewer
                        file={error ? null : pdf.blob}
                        url={pdf.url}
                        generating={!error && (!loaded || pdf.generating)}
                        statusLabel={
                            loaded
                                ? `Generating ${recipients.length} ${recipients.length === 1 ? 'certificate page' : 'certificate pages'}...`
                                : 'Loading checked-in participants...'
                        }
                        error={error}
                    />
                </Suspense>

                <p className="shrink-0 text-xs text-muted-foreground">
                    Load {paper.label} ({paper.description}) bond paper and
                    print at 100% scale (&ldquo;Actual size&rdquo;) for accurate
                    sizing.
                    {pdf.missingAssets.length > 0 && (
                        <span className="text-destructive">
                            {' '}
                            Could not load: {pdf.missingAssets.join(', ')}.
                        </span>
                    )}
                </p>
            </DialogContent>
        </Dialog>
    );
}

export default function Certificates({
    events,
    selectedEvent,
    certificate,
    participants: recipientPagination,
    filters,
    timezone,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [eventFilter, setEventFilter] = useState(filters.event);
    const [sortKey, setSortKey] = useState<SortKey>(filters.sort);
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        filters.direction,
    );
    const [page, setPage] = useState(recipientPagination?.current_page ?? 1);
    const [tableLoading, setTableLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [printRequest, setPrintRequest] = useState<PrintRequest | null>(null);
    const initialRequest = useRef(true);
    const recipients = recipientPagination?.data ?? [];
    const totalPages = Math.max(1, recipientPagination?.last_page ?? 1);
    const currentPage = recipientPagination?.current_page ?? 1;
    const startIndex = Math.max(0, (recipientPagination?.from ?? 1) - 1);
    const pageIds = recipients.map((recipient) => recipient.id);
    const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id));
    const headerChecked =
        pageIds.length > 0 && selectedOnPage.length === pageIds.length
            ? true
            : selectedOnPage.length > 0
              ? 'indeterminate'
              : false;
    const hasEvent = selectedEvent !== null && certificate !== null;

    useEffect(() => {
        if (initialRequest.current) {
            initialRequest.current = false;

            return;
        }

        const timeout = window.setTimeout(
            () => {
                router.get(
                    '/certificates',
                    {
                        search: search || undefined,
                        event: eventFilter ?? undefined,
                        sort: sortKey,
                        direction: sortDirection,
                        per_page: filters.per_page,
                        page,
                    },
                    {
                        only: [
                            'participants',
                            'filters',
                            'selectedEvent',
                            'certificate',
                        ],
                        preserveScroll: true,
                        preserveState: true,
                        replace: true,
                        onStart: () => setTableLoading(true),
                        onFinish: () => setTableLoading(false),
                    },
                );
            },
            search !== filters.search ? 300 : 0,
        );

        return () => window.clearTimeout(timeout);
        // filters.search is only read to decide the debounce delay.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventFilter, page, search, sortDirection, sortKey]);

    function updateSort(key: SortKey) {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }

        setPage(1);
    }

    function updateSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    function updateEventFilter(value: string) {
        setEventFilter(value);
        setSelectedIds([]);
        setPage(1);
    }

    function toggleSelected(id: number, checked: boolean) {
        setSelectedIds((current) =>
            checked
                ? [...new Set([...current, id])]
                : current.filter((selectedId) => selectedId !== id),
        );
    }

    function togglePageSelected(checked: boolean) {
        setSelectedIds((current) =>
            checked
                ? [...new Set([...current, ...pageIds])]
                : current.filter((id) => !pageIds.includes(id)),
        );
    }

    function printAll() {
        setPrintRequest({
            label: search
                ? `Checked-in participants matching “${search}”`
                : 'All checked-in participants',
            search: search || undefined,
        });
    }

    function printSelected() {
        setPrintRequest({
            label: `${selectedIds.length} selected ${selectedIds.length === 1 ? 'participant' : 'participants'}`,
            ids: selectedIds,
        });
    }

    function printOne(recipient: Recipient) {
        setPrintRequest({ label: recipient.name, ids: [recipient.id] });
    }

    function renderSortableHeader(column: (typeof columns)[number]) {
        if (!column.key) {
            return column.label;
        }

        const key = column.key;
        const isActive = sortKey === key;
        const SortIcon = isActive
            ? sortDirection === 'asc'
                ? ArrowUp
                : ArrowDown
            : ArrowUpDown;

        return (
            <button
                type="button"
                onClick={() => updateSort(key)}
                className={cn(
                    'inline-flex min-w-0 items-center gap-1 rounded-sm text-left hover:text-foreground',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
            >
                {column.label}
                <SortIcon className="size-3.5 shrink-0" />
            </button>
        );
    }

    return (
        <>
            <Head title="Certificates" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Certificates
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Certificates of appearance and participation for
                        checked-in participants.
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-sm">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    updateSearch(event.target.value)
                                }
                                placeholder="Search checked-in participants..."
                                className="pl-9"
                                disabled={!hasEvent}
                            />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                            <EventFilter
                                value={eventFilter}
                                options={events}
                                onChange={updateEventFilter}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSettingsOpen(true)}
                                disabled={!hasEvent}
                                className="h-8 justify-center px-2 text-xs"
                            >
                                <Settings2 className="size-3.5" />
                                Certificate settings
                            </Button>
                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={printSelected}
                                        className="h-8 flex-1 justify-center px-2 text-xs"
                                    >
                                        <Printer className="size-3.5" />
                                        Print selected
                                        <Badge
                                            variant="secondary"
                                            className="px-1.5 py-0 text-[10px]"
                                        >
                                            {selectedIds.length}
                                        </Badge>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        aria-label="Clear selection"
                                        onClick={() => setSelectedIds([])}
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                </div>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                onClick={printAll}
                                disabled={
                                    !hasEvent ||
                                    (recipientPagination?.total ?? 0) === 0
                                }
                                className="h-8 justify-center px-2 text-xs"
                            >
                                <FileText className="size-3.5" />
                                Generate PDF
                            </Button>
                        </div>
                    </div>

                    {!hasEvent ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                            <Award className="size-6" />
                            {events.length === 0
                                ? 'No events yet. Create an event to manage its certificates.'
                                : 'Select an event to manage its certificates.'}
                        </div>
                    ) : (
                        <>
                            {certificate && !certificate.is_configured && (
                                <div className="flex flex-col gap-2 border-b bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:bg-amber-950/30 dark:text-amber-200">
                                    <span>
                                        Certificates for this event use the
                                        default content. Upload backgrounds, the
                                        logo and signatures before printing.
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSettingsOpen(true)}
                                        className="h-7 shrink-0 px-2 text-xs"
                                    >
                                        <Settings2 className="size-3.5" />
                                        Set up certificates
                                    </Button>
                                </div>
                            )}

                            <div className="grid gap-2 p-3 md:hidden">
                                {tableLoading ? (
                                    Array.from({ length: 4 }, (_, index) => (
                                        <Skeleton
                                            key={index}
                                            className="h-24 rounded-lg"
                                        />
                                    ))
                                ) : recipients.length > 0 ? (
                                    recipients.map((recipient) => (
                                        <div
                                            key={recipient.id}
                                            className="flex items-start gap-3 rounded-lg border p-3"
                                        >
                                            <Checkbox
                                                checked={selectedIds.includes(
                                                    recipient.id,
                                                )}
                                                onCheckedChange={(checked) =>
                                                    toggleSelected(
                                                        recipient.id,
                                                        checked === true,
                                                    )
                                                }
                                                aria-label={`Select ${recipient.name}`}
                                                className="mt-2"
                                            />
                                            <RecipientAvatar
                                                recipient={recipient}
                                            />
                                            <div className="min-w-0 flex-1 text-sm">
                                                <p className="font-medium break-words">
                                                    {recipient.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {recipient.participant_id ??
                                                        '-'}
                                                </p>
                                                <p className="mt-1 text-xs break-words text-muted-foreground">
                                                    {recipient.organization ??
                                                        '-'}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Checked in{' '}
                                                    {formatDateTime(
                                                        recipient.first_checked_in_at,
                                                        timezone,
                                                    )}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="size-8 shrink-0"
                                                aria-label={`Print certificates for ${recipient.name}`}
                                                onClick={() =>
                                                    printOne(recipient)
                                                }
                                            >
                                                <Printer className="size-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        No checked-in participants found.
                                    </div>
                                )}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table className="min-w-[64rem] table-fixed text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/45 hover:bg-muted/45">
                                            <TableHead className="h-9 w-10 px-2">
                                                <Checkbox
                                                    checked={headerChecked}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        togglePageSelected(
                                                            checked === true,
                                                        )
                                                    }
                                                    disabled={
                                                        pageIds.length === 0
                                                    }
                                                    aria-label="Select participants on this page"
                                                />
                                            </TableHead>
                                            <TableHead className="h-9 w-12 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                                Seq
                                            </TableHead>
                                            {columns.map((column) => (
                                                <TableHead
                                                    key={column.label}
                                                    className={cn(
                                                        'h-9 px-2 text-[11px] font-semibold text-muted-foreground uppercase',
                                                        column.className,
                                                    )}
                                                >
                                                    {renderSortableHeader(
                                                        column,
                                                    )}
                                                </TableHead>
                                            ))}
                                            <TableHead className="h-9 w-20 px-2 text-right text-[11px] font-semibold text-muted-foreground uppercase">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    {tableLoading ? (
                                        <RecipientsTableSkeleton />
                                    ) : (
                                        <TableBody>
                                            {recipients.length > 0 ? (
                                                recipients.map(
                                                    (recipient, index) => (
                                                        <TableRow
                                                            key={recipient.id}
                                                            className="odd:bg-muted/[0.18]"
                                                            data-state={
                                                                selectedIds.includes(
                                                                    recipient.id,
                                                                )
                                                                    ? 'selected'
                                                                    : undefined
                                                            }
                                                        >
                                                            <TableCell className="px-2 py-2">
                                                                <Checkbox
                                                                    checked={selectedIds.includes(
                                                                        recipient.id,
                                                                    )}
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        toggleSelected(
                                                                            recipient.id,
                                                                            checked ===
                                                                                true,
                                                                        )
                                                                    }
                                                                    aria-label={`Select ${recipient.name}`}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2 font-medium text-muted-foreground">
                                                                {startIndex +
                                                                    index +
                                                                    1}
                                                            </TableCell>
                                                            <TableCell className="overflow-hidden px-2 py-2">
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <RecipientAvatar
                                                                        recipient={
                                                                            recipient
                                                                        }
                                                                    />
                                                                    <div className="min-w-0">
                                                                        <p className="truncate font-medium text-foreground">
                                                                            {
                                                                                recipient.name
                                                                            }
                                                                        </p>
                                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                                            {recipient.participant_id ??
                                                                                recipient.email ??
                                                                                '-'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2 leading-5 whitespace-normal">
                                                                {recipient.organization ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2 leading-5 whitespace-normal">
                                                                {recipient.position ??
                                                                    '-'}
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="max-w-full truncate px-1.5 py-0 text-[10px]"
                                                                >
                                                                    {formatLabel(
                                                                        recipient.participant_type,
                                                                    )}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2 leading-5 whitespace-normal text-muted-foreground">
                                                                {formatDateTime(
                                                                    recipient.first_checked_in_at,
                                                                    timezone,
                                                                )}
                                                                {recipient.days_attended >
                                                                    1 && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="ml-1 px-1.5 py-0 text-[10px]"
                                                                    >
                                                                        {
                                                                            recipient.days_attended
                                                                        }{' '}
                                                                        days
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="px-2 py-2 text-right">
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8"
                                                                            aria-label={`Print certificates for ${recipient.name}`}
                                                                            onClick={() =>
                                                                                printOne(
                                                                                    recipient,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Printer className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Preview
                                                                        &amp;
                                                                        print
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )
                                            ) : (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={
                                                            columns.length + 3
                                                        }
                                                        className="h-32 text-center text-muted-foreground"
                                                    >
                                                        No checked-in
                                                        participants found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    )}
                                </Table>
                            </div>

                            <div className="flex flex-col gap-3 border-t p-3 text-sm text-muted-foreground sm:p-4 md:flex-row md:items-center md:justify-between">
                                <p className="text-center md:text-left">
                                    Showing{' '}
                                    <span className="font-medium text-foreground">
                                        {recipientPagination?.from ?? 0}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium text-foreground">
                                        {recipientPagination?.to ?? 0}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium text-foreground">
                                        {recipientPagination?.total ?? 0}
                                    </span>{' '}
                                    checked-in participants
                                </p>
                                <div className="flex items-center justify-center gap-2 md:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Previous page"
                                        disabled={currentPage === 1}
                                        onClick={() =>
                                            setPage(
                                                Math.max(1, currentPage - 1),
                                            )
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
                                                Math.min(
                                                    totalPages,
                                                    currentPage + 1,
                                                ),
                                            )
                                        }
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {hasEvent && (
                <>
                    {settingsOpen && (
                        <Suspense fallback={null}>
                            <CertificateSettingsDialog
                                open={settingsOpen}
                                onOpenChange={setSettingsOpen}
                                event={selectedEvent}
                                settings={certificate}
                                sampleRecipient={{
                                    name:
                                        recipients[0]?.name ?? 'Juan Dela Cruz',
                                    participant_id:
                                        recipients[0]?.participant_id ?? null,
                                    organization:
                                        recipients[0]?.organization ?? null,
                                    position: recipients[0]?.position ?? null,
                                }}
                                timeZone={timezone}
                            />
                        </Suspense>
                    )}
                    <CertificatePrintDialog
                        request={printRequest}
                        onClose={() => setPrintRequest(null)}
                        event={selectedEvent}
                        settings={certificate}
                        timeZone={timezone}
                    />
                </>
            )}
        </>
    );
}

Certificates.layout = {
    breadcrumbs: [
        {
            title: 'Certificates',
            href: certificatesRoute(),
        },
    ],
};
