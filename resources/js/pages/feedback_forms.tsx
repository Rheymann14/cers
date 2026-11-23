import { Head, router } from '@inertiajs/react';
import type ExcelJS from 'exceljs';
import {
    ChevronLeft,
    ChevronRight,
    Eye,
    FileSpreadsheet,
    Lock,
    LockOpen,
    MessageSquareText,
    MoreHorizontal,
    Pencil,
    Plus,
    QrCode,
    Search,
    Star,
    Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EventFilter, FilterCountBadge } from '@/components/event-filter';
import type {
    FeedbackFormSettings,
    FeedbackQuestion,
} from '@/components/feedback/feedback-form-dialog';
import { FeedbackQrCard } from '@/components/feedback/feedback-qr-card';
import { StarDisplay, ratingLabels } from '@/components/feedback/star-rating';
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
import { cn } from '@/lib/utils';

const FeedbackFormDialog = lazy(
    () => import('@/components/feedback/feedback-form-dialog'),
);

type EventOption = {
    id: number;
    value: string;
    label: string;
    starts_at: string | null;
    ends_at: string | null;
    has_form: boolean;
    is_open: boolean;
    response_count: number;
};

type SelectedEvent = {
    id: number;
    slug: string;
    name: string;
    venue_name: string | null;
    venue_address: string | null;
    starts_at: string | null;
    ends_at: string | null;
    date_label: string | null;
};

type QuestionSummary = FeedbackQuestion & {
    count: number;
    average: number | null;
    distribution: Record<string, number>;
};

type Summary = {
    total_responses: number;
    overall_average: number | null;
    latest_response_at: string | null;
    questions: QuestionSummary[];
};

type FeedbackResponse = {
    id: number;
    name: string | null;
    school_agency: string | null;
    comments: string | null;
    average_rating: number | null;
    ratings: Record<string, number>;
    submitted_at: string | null;
};

type PaginatedResponses = {
    data: FeedbackResponse[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    search: string;
    event: string | null;
    per_page: number;
};

type Props = {
    events: EventOption[];
    selectedEvent: SelectedEvent | null;
    form: FeedbackFormSettings | null;
    defaultQuestions: string[];
    maxQuestions: number;
    summary: Summary | null;
    responses: PaginatedResponses | null;
    filters: Filters;
    timezone: string;
};

type ConfirmAction =
    | { type: 'delete-form' }
    | { type: 'delete-response'; response: FeedbackResponse };

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Ordinal blue ramp (validated light & dark): 1 star lightest/most recessive, 5 stars strongest.
 */
const ratingSegmentClasses: Record<number, string> = {
    1: 'bg-[#86b6ef] dark:bg-[#184f95]',
    2: 'bg-[#5598e7] dark:bg-[#256abf]',
    3: 'bg-[#2a78d6] dark:bg-[#3987e5]',
    4: 'bg-[#1c5cab] dark:bg-[#6da7ec]',
    5: 'bg-[#104281] dark:bg-[#9ec5f4]',
};

const excelMimeType =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function formatDateTime(value: string | null, timeZone: string): string {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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

function formatAverage(value: number | null): string {
    return value === null ? '–' : value.toFixed(2);
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

function styleWorksheet(worksheet: ExcelJS.Worksheet) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length },
    };

    const border = (argb: string) => ({
        top: { style: 'thin' as const, color: { argb } },
        left: { style: 'thin' as const, color: { argb } },
        bottom: { style: 'thin' as const, color: { argb } },
        right: { style: 'thin' as const, color: { argb } },
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            if (rowNumber === 1) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF0038A8' },
                };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true,
                };
                cell.border = border('FF475569');
            } else {
                cell.alignment = { vertical: 'top', wrapText: true };
                cell.border = border('FFE2E8F0');
            }
        });
    });
    worksheet.getRow(1).height = 30;
}

function StatTile({
    label,
    children,
    hint,
}: {
    label: string;
    children: ReactNode;
    hint?: ReactNode;
}) {
    return (
        <div className="grid content-start gap-1 rounded-lg border bg-background p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">
                {children}
            </div>
            {hint && (
                <div className="text-xs text-muted-foreground">{hint}</div>
            )}
        </div>
    );
}

function RatingDistributionBar({ question }: { question: QuestionSummary }) {
    if (question.count === 0) {
        return <div className="h-2 rounded-full bg-muted" aria-hidden />;
    }

    return (
        <div className="flex h-5 items-center gap-0.5">
            {STAR_VALUES.map((star) => {
                const count = question.distribution[star] ?? 0;

                if (count === 0) {
                    return null;
                }

                const share = (count / question.count) * 100;

                return (
                    <Tooltip key={star}>
                        <TooltipTrigger asChild>
                            <span
                                tabIndex={0}
                                aria-label={`${star} ${star === 1 ? 'star' : 'stars'}: ${count} (${Math.round(share)}%)`}
                                className="flex h-5 min-w-1 cursor-default items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                style={{ width: `${share}%` }}
                            >
                                <span
                                    className={cn(
                                        'block h-2 w-full rounded-full transition-opacity hover:opacity-80',
                                        ratingSegmentClasses[star],
                                    )}
                                />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <span className="font-medium">
                                {star} {star === 1 ? 'star' : 'stars'} &middot;{' '}
                                {ratingLabels[star]}
                            </span>
                            <span className="block tabular-nums opacity-80">
                                {count.toLocaleString()}{' '}
                                {count === 1 ? 'rating' : 'ratings'} (
                                {Math.round(share)}%)
                            </span>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </div>
    );
}

function QuestionBreakdown({ summary }: { summary: Summary }) {
    return (
        <div className="grid gap-3 rounded-lg border bg-background p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold">
                        Ratings by question
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Average out of 5 and how ratings are spread.
                    </p>
                </div>
                <div
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
                    aria-label="Legend"
                >
                    {STAR_VALUES.map((star) => (
                        <span
                            key={star}
                            className="inline-flex items-center gap-1"
                        >
                            <span
                                className={cn(
                                    'size-2.5 rounded-full',
                                    ratingSegmentClasses[star],
                                )}
                            />
                            {star}
                            <Star className="size-3" />
                        </span>
                    ))}
                </div>
            </div>

            <ol className="grid gap-3">
                {summary.questions.map((question, index) => (
                    <li
                        key={question.id}
                        className="grid gap-1.5 border-t pt-3 first:border-t-0 first:pt-0"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-sm leading-5">
                                <span className="mr-1 font-semibold text-muted-foreground">
                                    Q{index + 1}.
                                </span>
                                {question.question}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                                <StarDisplay
                                    value={question.average}
                                    className="hidden sm:inline-flex"
                                />
                                <span className="w-10 text-right text-sm font-semibold tabular-nums">
                                    {formatAverage(question.average)}
                                </span>
                            </div>
                        </div>
                        <RatingDistributionBar question={question} />
                    </li>
                ))}
            </ol>
        </div>
    );
}

function ResponseDetailsDialog({
    response,
    questions,
    timeZone,
    onOpenChange,
}: {
    response: FeedbackResponse | null;
    questions: FeedbackQuestion[];
    timeZone: string;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={response !== null} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-lg">
                {response && (
                    <>
                        <DialogHeader className="gap-1 text-left">
                            <DialogTitle className="text-base">
                                {response.name ?? 'Anonymous'}
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                {response.school_agency ??
                                    'No school / agency given'}{' '}
                                &middot;{' '}
                                {formatDateTime(
                                    response.submitted_at,
                                    timeZone,
                                )}
                            </DialogDescription>
                        </DialogHeader>
                        <ol className="grid gap-2">
                            {questions.map((question, index) => {
                                const rating = response.ratings[question.id];

                                return (
                                    <li
                                        key={question.id}
                                        className="grid gap-1 rounded-md border p-2.5"
                                    >
                                        <p className="text-sm leading-5">
                                            <span className="mr-1 font-semibold text-muted-foreground">
                                                Q{index + 1}.
                                            </span>
                                            {question.question}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <StarDisplay
                                                value={rating ?? null}
                                            />
                                            {rating
                                                ? `${rating} · ${ratingLabels[rating]}`
                                                : 'Not rated (question added later)'}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                        <div className="grid gap-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                                Comments / Suggestions
                            </p>
                            <p className="rounded-md bg-muted/50 p-3 text-sm leading-6 whitespace-pre-line">
                                {response.comments ?? (
                                    <span className="text-muted-foreground">
                                        No comments.
                                    </span>
                                )}
                            </p>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function ConfirmDialog({
    action,
    processing,
    onCancel,
    onConfirm,
}: {
    action: ConfirmAction | null;
    processing: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const deletingForm = action?.type === 'delete-form';

    return (
        <Dialog
            open={action !== null}
            onOpenChange={(open) => !open && onCancel()}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-left">
                    <DialogTitle>
                        {deletingForm
                            ? 'Delete feedback form?'
                            : 'Delete this response?'}
                    </DialogTitle>
                    <DialogDescription>
                        {deletingForm
                            ? 'The form, its QR code and every submitted response will be permanently deleted. The printed QR code will stop working.'
                            : 'This response and its ratings will be permanently removed from the results.'}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={processing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={processing}
                    >
                        <Trash2 className="size-4" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function FeedbackForms({
    events,
    selectedEvent,
    form,
    defaultQuestions,
    maxQuestions,
    summary,
    responses: responsePagination,
    filters,
    timezone,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [eventFilter, setEventFilter] = useState(filters.event);
    const [page, setPage] = useState(responsePagination?.current_page ?? 1);
    const [tableLoading, setTableLoading] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [viewing, setViewing] = useState<FeedbackResponse | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
        null,
    );
    const [processing, setProcessing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const initialRequest = useRef(true);
    const responses = responsePagination?.data ?? [];
    const totalPages = Math.max(1, responsePagination?.last_page ?? 1);
    const currentPage = responsePagination?.current_page ?? 1;
    const startIndex = Math.max(0, (responsePagination?.from ?? 1) - 1);
    const questions = form?.questions ?? [];

    useEffect(() => {
        if (initialRequest.current) {
            initialRequest.current = false;

            return;
        }

        const timeout = window.setTimeout(
            () => {
                router.get(
                    '/feedback-forms',
                    {
                        search: search || undefined,
                        event: eventFilter ?? undefined,
                        per_page: filters.per_page,
                        page,
                    },
                    {
                        only: [
                            'responses',
                            'filters',
                            'selectedEvent',
                            'form',
                            'summary',
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
    }, [eventFilter, page, search]);

    function updateEventFilter(value: string) {
        setEventFilter(value);
        setSearch('');
        setPage(1);
    }

    function toggleStatus() {
        if (!selectedEvent) {
            return;
        }

        router.patch(
            `/feedback-forms/${selectedEvent.id}/status`,
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function confirm() {
        if (!confirmAction || !selectedEvent) {
            return;
        }

        const url =
            confirmAction.type === 'delete-form'
                ? `/feedback-forms/${selectedEvent.id}`
                : `/feedback-forms/responses/${confirmAction.response.id}`;

        router.delete(url, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => setConfirmAction(null),
        });
    }

    async function exportExcel() {
        if (!selectedEvent || !form) {
            return;
        }

        setExporting(true);

        try {
            const response = await fetch(
                `/feedback-forms/${selectedEvent.id}/export`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Request failed');
            }

            const data = (await response.json()) as {
                questions: FeedbackQuestion[];
                responses: FeedbackResponse[];
            };
            const { default: ExcelJS } = await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'CERS';
            workbook.created = new Date();

            const responsesSheet = workbook.addWorksheet('Responses');
            responsesSheet.columns = [
                { header: 'No.', key: 'no', width: 6 },
                { header: 'Submitted', key: 'submitted', width: 22 },
                { header: 'Name', key: 'name', width: 26 },
                { header: 'School / Agency', key: 'school', width: 32 },
                ...data.questions.map((question, index) => ({
                    header: `Q${index + 1}. ${question.question}`,
                    key: `q${question.id}`,
                    width: 18,
                })),
                { header: 'Average', key: 'average', width: 10 },
                {
                    header: 'Comments / Suggestions',
                    key: 'comments',
                    width: 50,
                },
            ];
            responsesSheet.addRows(
                data.responses.map((item, index) => ({
                    no: index + 1,
                    submitted: formatDateTime(item.submitted_at, timezone),
                    name: item.name ?? 'Anonymous',
                    school: item.school_agency ?? '-',
                    ...Object.fromEntries(
                        data.questions.map((question) => [
                            `q${question.id}`,
                            item.ratings[question.id] ?? '',
                        ]),
                    ),
                    average: item.average_rating ?? '',
                    comments: item.comments ?? '',
                })),
            );
            styleWorksheet(responsesSheet);

            const summarySheet = workbook.addWorksheet('Summary');
            summarySheet.columns = [
                { header: 'No.', key: 'no', width: 6 },
                { header: 'Question', key: 'question', width: 60 },
                { header: 'Average', key: 'average', width: 10 },
                { header: 'Ratings', key: 'count', width: 10 },
                ...[5, 4, 3, 2, 1].map((star) => ({
                    header: `${star} ★`,
                    key: `s${star}`,
                    width: 8,
                })),
            ];
            summarySheet.addRows(
                (summary?.questions ?? []).map((question, index) => ({
                    no: index + 1,
                    question: question.question,
                    average: question.average ?? '',
                    count: question.count,
                    ...Object.fromEntries(
                        STAR_VALUES.map((star) => [
                            `s${star}`,
                            question.distribution[star] ?? 0,
                        ]),
                    ),
                })),
            );
            styleWorksheet(summarySheet);

            const buffer = await workbook.xlsx.writeBuffer();
            const url = URL.createObjectURL(
                new Blob([buffer], { type: excelMimeType }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = `${sanitizeFilePart(selectedEvent.name)}-feedback.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success('Feedback Excel downloaded.');
        } catch {
            toast.error('Unable to download feedback Excel.');
        } finally {
            setExporting(false);
        }
    }

    return (
        <>
            <Head title="Feedback" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Feedback
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create a feedback form per event, share its QR code and
                        review the responses.
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                            {form && (
                                <Badge
                                    className={cn(
                                        'shrink-0 gap-1 border-transparent',
                                        form.is_open
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300',
                                    )}
                                >
                                    {form.is_open ? (
                                        <LockOpen className="size-3" />
                                    ) : (
                                        <Lock className="size-3" />
                                    )}
                                    {form.is_open
                                        ? 'Accepting responses'
                                        : 'Responses closed'}
                                </Badge>
                            )}
                            <p className="truncate text-sm font-medium">
                                {form?.title ??
                                    (selectedEvent
                                        ? 'No feedback form yet'
                                        : '')}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                            <EventFilter
                                value={eventFilter}
                                options={events}
                                onChange={updateEventFilter}
                                ariaLabel="Select event for feedback"
                                renderMeta={(option) =>
                                    option.has_form ? (
                                        <FilterCountBadge
                                            count={option.response_count}
                                        />
                                    ) : null
                                }
                            />
                            {selectedEvent && form && (
                                <>
                                    <Button
                                        type="button"
                                        variant={
                                            form.is_open ? 'outline' : 'default'
                                        }
                                        size="sm"
                                        onClick={toggleStatus}
                                        disabled={processing}
                                        className="h-8 justify-center px-2 text-xs"
                                    >
                                        {form.is_open ? (
                                            <Lock className="size-3.5" />
                                        ) : (
                                            <LockOpen className="size-3.5" />
                                        )}
                                        {form.is_open
                                            ? 'Close responses'
                                            : 'Open responses'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={exportExcel}
                                        disabled={
                                            exporting ||
                                            form.response_count === 0
                                        }
                                        className="h-8 justify-center px-2 text-xs"
                                    >
                                        <FileSpreadsheet className="size-3.5" />
                                        Export Excel
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 justify-center px-2 text-xs"
                                                aria-label="More form actions"
                                            >
                                                <MoreHorizontal className="size-3.5" />
                                                <span className="sm:hidden">
                                                    More
                                                </span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    setBuilderOpen(true)
                                                }
                                            >
                                                <Pencil className="size-4" />
                                                Edit form
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onSelect={() =>
                                                    setConfirmAction({
                                                        type: 'delete-form',
                                                    })
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                Delete form
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>
                    </div>

                    {!selectedEvent ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                            <MessageSquareText className="size-6" />
                            {events.length === 0
                                ? 'No events yet. Create an event to collect feedback.'
                                : 'Select an event to manage its feedback.'}
                        </div>
                    ) : !form ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                            <span className="inline-flex size-12 items-center justify-center rounded-full bg-blue-50 text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300">
                                <QrCode className="size-6" />
                            </span>
                            <div className="grid max-w-md gap-1">
                                <p className="text-sm font-semibold">
                                    Collect feedback for {selectedEvent.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Add star-rating questions and we&rsquo;ll
                                    generate a QR code with the event name and
                                    date. Participants can also give their name,
                                    school / agency and comments.
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => setBuilderOpen(true)}
                            >
                                <Plus className="size-4" />
                                Create feedback form
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 border-b bg-muted/20 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
                                <div className="grid content-start gap-4">
                                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                                        <StatTile
                                            label="Responses"
                                            hint={
                                                summary?.latest_response_at
                                                    ? `Latest ${formatDateTime(summary.latest_response_at, timezone)}`
                                                    : 'No responses yet'
                                            }
                                        >
                                            {(
                                                summary?.total_responses ?? 0
                                            ).toLocaleString()}
                                        </StatTile>
                                        <StatTile
                                            label="Overall rating"
                                            hint={
                                                <StarDisplay
                                                    value={
                                                        summary?.overall_average ??
                                                        null
                                                    }
                                                />
                                            }
                                        >
                                            {formatAverage(
                                                summary?.overall_average ??
                                                    null,
                                            )}
                                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                                                / 5
                                            </span>
                                        </StatTile>
                                        <StatTile
                                            label="Questions"
                                            hint="Star rating, required"
                                        >
                                            {questions.length}
                                        </StatTile>
                                    </div>

                                    {summary && (
                                        <QuestionBreakdown summary={summary} />
                                    )}
                                </div>

                                <div className="grid content-start gap-2">
                                    <FeedbackQrCard
                                        url={form.url}
                                        eventName={selectedEvent.name}
                                        dateLabel={selectedEvent.date_label}
                                        venueName={selectedEvent.venue_name}
                                        closed={!form.is_open}
                                    />
                                    {!form.is_open && (
                                        <p className="text-center text-xs text-muted-foreground">
                                            The QR is hidden from the public
                                            Events page while responses are
                                            closed.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 border-b p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                                <h2 className="text-sm font-semibold">
                                    Responses
                                </h2>
                                <div className="relative w-full md:max-w-sm">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(event) => {
                                            setSearch(event.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search name, school / agency, comments..."
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2 p-3 md:hidden">
                                {tableLoading ? (
                                    Array.from({ length: 3 }, (_, index) => (
                                        <Skeleton
                                            key={index}
                                            className="h-24 rounded-lg"
                                        />
                                    ))
                                ) : responses.length > 0 ? (
                                    responses.map((response) => (
                                        <div
                                            key={response.id}
                                            className="grid gap-1.5 rounded-lg border p-3 text-sm"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-medium break-words">
                                                        {response.name ?? (
                                                            <span className="text-muted-foreground italic">
                                                                Anonymous
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs break-words text-muted-foreground">
                                                        {response.school_agency ??
                                                            '-'}
                                                    </p>
                                                </div>
                                                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums">
                                                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                                    {formatAverage(
                                                        response.average_rating,
                                                    )}
                                                </span>
                                            </div>
                                            {response.comments && (
                                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                                    {response.comments}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDateTime(
                                                        response.submitted_at,
                                                        timezone,
                                                    )}
                                                </span>
                                                <div className="flex gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="size-8"
                                                        aria-label="View response"
                                                        onClick={() =>
                                                            setViewing(response)
                                                        }
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="size-8 text-destructive"
                                                        aria-label="Delete response"
                                                        onClick={() =>
                                                            setConfirmAction({
                                                                type: 'delete-response',
                                                                response,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        {search
                                            ? 'No responses match your search.'
                                            : 'No responses yet. Share the QR code to start collecting feedback.'}
                                    </div>
                                )}
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table className="min-w-[60rem] table-fixed text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-muted/45 hover:bg-muted/45">
                                            <TableHead className="h-9 w-12 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                                Seq
                                            </TableHead>
                                            <TableHead className="h-9 w-[22%] px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                                Respondent
                                            </TableHead>
                                            <TableHead className="h-9 w-[14%] px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                                Average
                                            </TableHead>
                                            <TableHead className="h-9 w-[18%] px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                                Ratings
                                            </TableHead>
                                            <TableHead className="h-9 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                                Comments / Suggestions
                                            </TableHead>
                                            <TableHead className="h-9 w-[13%] px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                                Submitted
                                            </TableHead>
                                            <TableHead className="h-9 w-20 px-2" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tableLoading ? (
                                            Array.from(
                                                { length: 5 },
                                                (_, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell
                                                            colSpan={7}
                                                            className="px-2 py-2"
                                                        >
                                                            <Skeleton className="h-8 w-full" />
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )
                                        ) : responses.length > 0 ? (
                                            responses.map((response, index) => (
                                                <TableRow
                                                    key={response.id}
                                                    className="odd:bg-muted/[0.18]"
                                                >
                                                    <TableCell className="px-2 py-2 text-muted-foreground tabular-nums">
                                                        {startIndex + index + 1}
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 whitespace-normal">
                                                        <p className="font-medium break-words">
                                                            {response.name ?? (
                                                                <span className="font-normal text-muted-foreground italic">
                                                                    Anonymous
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="break-words text-muted-foreground">
                                                            {response.school_agency ??
                                                                '-'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2">
                                                        <div className="grid gap-0.5">
                                                            <span className="text-sm font-semibold tabular-nums">
                                                                {formatAverage(
                                                                    response.average_rating,
                                                                )}
                                                            </span>
                                                            <StarDisplay
                                                                value={
                                                                    response.average_rating
                                                                }
                                                                starClassName="size-3"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 whitespace-normal">
                                                        <div className="flex flex-wrap gap-1">
                                                            {questions.map(
                                                                (
                                                                    question,
                                                                    questionIndex,
                                                                ) => (
                                                                    <Tooltip
                                                                        key={
                                                                            question.id
                                                                        }
                                                                    >
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <span className="inline-flex cursor-default items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                                                                                <span className="text-muted-foreground">
                                                                                    Q
                                                                                    {questionIndex +
                                                                                        1}
                                                                                </span>
                                                                                <span className="font-semibold">
                                                                                    {response
                                                                                        .ratings[
                                                                                        question
                                                                                            .id
                                                                                    ] ??
                                                                                        '–'}
                                                                                </span>
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="max-w-xs">
                                                                            {
                                                                                question.question
                                                                            }
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                ),
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 whitespace-normal">
                                                        <p className="line-clamp-2 leading-5 break-words text-muted-foreground">
                                                            {response.comments ??
                                                                '-'}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 leading-5 whitespace-normal text-muted-foreground">
                                                        {formatDateTime(
                                                            response.submitted_at,
                                                            timezone,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 text-right">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            aria-label="View response"
                                                            onClick={() =>
                                                                setViewing(
                                                                    response,
                                                                )
                                                            }
                                                        >
                                                            <Eye className="size-4" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 text-destructive hover:text-destructive"
                                                            aria-label="Delete response"
                                                            onClick={() =>
                                                                setConfirmAction(
                                                                    {
                                                                        type: 'delete-response',
                                                                        response,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="h-32 text-center text-muted-foreground"
                                                >
                                                    {search
                                                        ? 'No responses match your search.'
                                                        : 'No responses yet. Share the QR code to start collecting feedback.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-col gap-3 border-t p-3 text-sm text-muted-foreground sm:p-4 md:flex-row md:items-center md:justify-between">
                                <p className="text-center md:text-left">
                                    Showing{' '}
                                    <span className="font-medium text-foreground">
                                        {responsePagination?.from ?? 0}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-medium text-foreground">
                                        {responsePagination?.to ?? 0}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium text-foreground">
                                        {responsePagination?.total ?? 0}
                                    </span>{' '}
                                    responses
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

            {selectedEvent && builderOpen && (
                <Suspense fallback={null}>
                    <FeedbackFormDialog
                        key={`${selectedEvent.id}-${form?.updated_at ?? 'new'}`}
                        open={builderOpen}
                        onOpenChange={setBuilderOpen}
                        eventId={selectedEvent.id}
                        eventName={selectedEvent.name}
                        form={form}
                        defaultQuestions={defaultQuestions}
                        maxQuestions={maxQuestions}
                    />
                </Suspense>
            )}

            <ResponseDetailsDialog
                response={viewing}
                questions={questions}
                timeZone={timezone}
                onOpenChange={(open) => !open && setViewing(null)}
            />

            <ConfirmDialog
                action={confirmAction}
                processing={processing}
                onCancel={() => setConfirmAction(null)}
                onConfirm={confirm}
            />
        </>
    );
}

FeedbackForms.layout = {
    breadcrumbs: [
        {
            title: 'Feedback',
            href: '/feedback-forms',
        },
    ],
};
