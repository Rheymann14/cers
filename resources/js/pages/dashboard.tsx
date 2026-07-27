import { Head, router } from '@inertiajs/react';
import ExcelJS from 'exceljs';
import {
    Activity,
    BarChart3,
    Building2,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Download,
    Filter,
    GraduationCap,
    LineChart as LineChartIcon,
    MapPin,
    PieChart,
    Search,
    RotateCcw,
    UserCheck,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
    ComponentProps,
    CSSProperties,
    FocusEvent,
    MouseEvent,
    ReactNode,
} from 'react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { dashboard } from '@/routes';

type Stats = {
    participants: number;
    checkedInParticipants: number;
    notCheckedInParticipants: number;
};

type RecentParticipant = {
    id: number;
    participant_id: string | null;
    name: string;
    email: string | null;
    organization: string | null;
    participant_type: string | null;
    event_name: string | null;
    created_at: string;
};

type EventSummary = {
    event_name: string;
    participants_count: number;
};

type RegistrationTrend = {
    date: string;
    label: string;
    count: number;
};

type AttendanceStatus = {
    label: string;
    count: number;
};

type EventAttendanceSummary = {
    id: number;
    name: string;
    slug: string;
    starts_at: string | null;
    ends_at: string | null;
    participants_count: number;
    checked_in_count: number;
    not_checked_in_count: number;
    attendance_rate: number;
    daily_attendance: DailyAttendanceSummary[];
};

type DailyAttendanceSummary = {
    date: string;
    participants_count: number;
    checked_in_count: number;
    not_checked_in_count: number;
    attendance_rate: number;
};

type EventStatus = 'ongoing' | 'upcoming' | 'closed';

type AttendanceParticipant = {
    id: number;
    row_key: string;
    participant_id: string | null;
    name: string;
    given_name: string | null;
    middle_name: string | null;
    surname: string | null;
    email: string;
    phone: string | null;
    organization: string | null;
    participant_type: string | null;
    sex: string | null;
    province: string | null;
    municipality: string | null;
    is_active: boolean;
    event_name: string | null;
    event_slug: string | null;
    registered_at: string | null;
    attendance_date: string | null;
    checked_in_at: string | null;
    scanned_by: string | null;
};

type StatisticParticipant = {
    id: number;
    province_id: number | null;
    municipality_id: number | null;
    sex: string | null;
    participant_type: string | null;
    organization_id: number | null;
    organization: string | null;
    event_name: string | null;
};

type StatisticOption = {
    id: number;
    name: string;
    users_count: number;
};

type StatisticProvince = StatisticOption & {
    code: string;
};

type StatisticMunicipality = StatisticOption & {
    province_id: number;
    code: string;
    type: string;
};

type StatisticParticipantType = StatisticOption & {
    slug: string;
    type: string;
    event_slug: string;
};

type StatisticOrganization = StatisticOption & {
    slug: string;
    type: string;
};

type ParticipantStatistics = {
    participants: StatisticParticipant[];
    provinces: StatisticProvince[];
    municipalities: StatisticMunicipality[];
    participantTypes: StatisticParticipantType[];
    organizations: StatisticOrganization[];
};

type StatisticFilters = {
    provinceId: string;
    municipalityId: string;
    sex: string;
    participantType: string;
    organizationId: string;
};

type StatisticBreakdownItem = {
    key: string;
    label: string;
    count: number;
    meta?: string | null;
    children?: StatisticBreakdownItem[];
};

type StatisticFilterOption = {
    value: string;
    label: string;
    count?: number;
    description?: string | null;
};

type StatisticChartType = 'bar' | 'pie' | 'line';

type Props = {
    stats: Stats;
    recentParticipants: RecentParticipant[];
    eventSummary: EventSummary[];
    registrationTrend: RegistrationTrend[];
    attendanceStatus: AttendanceStatus[];
    eventAttendanceSummary: EventAttendanceSummary[];
    checkedInParticipants: AttendanceParticipant[];
    notCheckedInParticipants: AttendanceParticipant[];
    participantStatistics: ParticipantStatistics;
};

const statCards = [
    {
        key: 'participants',
        title: 'Participants',
        icon: Users,
    },
    {
        key: 'checkedInParticipants',
        title: 'Checked In',
        icon: UserCheck,
    },
    {
        key: 'notCheckedInParticipants',
        title: 'Not Checked In',
        icon: Activity,
    },
] as const;

const attendancePageSizeOptions = [10, 25, 50, 100] as const;
const allStatisticFilterValue = 'all';
const statisticChartColors = [
    '#0038A8',
    '#F59E0B',
    '#059669',
    '#DC2626',
    '#7C3AED',
    '#0891B2',
    '#DB2777',
    '#475569',
];
const excelMimeType =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const unspecifiedStatisticKey = 'not-specified';
const overflowStatisticKey = 'other';

type AttendanceExportColumn = {
    header: string;
    key: string;
    width: number;
};

const attendanceExportColumns: AttendanceExportColumn[] = [
    { header: 'Participant ID', key: 'participant_id', width: 22 },
    { header: 'Full Name', key: 'name', width: 28 },
    { header: 'Given Name', key: 'given_name', width: 20 },
    { header: 'Middle Name', key: 'middle_name', width: 18 },
    { header: 'Surname', key: 'surname', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Sex', key: 'sex', width: 12 },
    { header: 'Participant Type', key: 'participant_type', width: 20 },
    { header: 'Organization', key: 'organization', width: 34 },
    { header: 'Province', key: 'province', width: 22 },
    { header: 'Municipality / City', key: 'municipality', width: 24 },
    { header: 'Event', key: 'event_name', width: 34 },
    { header: 'Registered At', key: 'registered_at', width: 24 },
    { header: 'Attendance Day', key: 'attendance_date', width: 22 },
    { header: 'Checked In At', key: 'checked_in_at', width: 24 },
    { header: 'Attendance Status', key: 'attendance_status', width: 20 },
    { header: 'Account Status', key: 'account_status', width: 18 },
];

const checkedInAttendanceExportColumns: AttendanceExportColumn[] = [
    { header: 'Participant ID', key: 'participant_id', width: 22 },
    { header: 'Full Name', key: 'name', width: 28 },
    { header: 'Given Name', key: 'given_name', width: 20 },
    { header: 'Middle Name', key: 'middle_name', width: 18 },
    { header: 'Surname', key: 'surname', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Sex', key: 'sex', width: 12 },
    { header: 'Participant Type', key: 'participant_type', width: 20 },
    { header: 'Organization', key: 'organization', width: 34 },
    { header: 'Province', key: 'province', width: 22 },
    { header: 'Municipality / City', key: 'municipality', width: 24 },
    { header: 'Event', key: 'event_name', width: 34 },
    { header: 'Registered At', key: 'registered_at', width: 24 },
    { header: 'Attendance Day', key: 'attendance_date', width: 22 },
    { header: 'Checked In At', key: 'checked_in_at', width: 24 },
    { header: 'Scanned By', key: 'scanned_by', width: 24 },
    { header: 'Attendance Status', key: 'attendance_status', width: 20 },
    { header: 'Account Status', key: 'account_status', width: 18 },
];

const preventDialogOutsideClose: NonNullable<
    ComponentProps<typeof DialogContent>['onPointerDownOutside']
> = (event) => {
    event.preventDefault();
};

const preventDialogInteractOutside: NonNullable<
    ComponentProps<typeof DialogContent>['onInteractOutside']
> = (event) => {
    event.preventDefault();
};

function formatLabel(value: string | null): string {
    if (!value) {
        return '-';
    }

    return value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatLookupLabel(
    value: string | null,
    labelsByValue: Map<string, string>,
): string {
    if (!value) {
        return '-';
    }

    return labelsByValue.get(value) ?? formatLabel(value);
}

function formatParticipantCount(count: number): string {
    return `${count.toLocaleString()} ${
        count === 1 ? 'participant' : 'participants'
    }`;
}

function formatRegistrationCount(count: number): string {
    return `${count.toLocaleString()} ${
        count === 1 ? 'registration' : 'registrations'
    }`;
}

function statisticTooltipText(item: StatisticBreakdownItem): string {
    const label = item.meta ? `${item.label} (${item.meta})` : item.label;

    return `${label}: ${formatParticipantCount(item.count)}`;
}

function groupStatisticItemsForChart(
    items: StatisticBreakdownItem[],
    limit: number,
): StatisticBreakdownItem[] {
    const sortedItems = items
        .filter((item) => item.count > 0)
        .sort((first, second) => second.count - first.count);

    if (sortedItems.length <= limit) {
        return sortedItems;
    }

    const visibleItems = sortedItems.slice(0, limit - 1);
    const overflowItems = sortedItems.slice(limit - 1);
    const overflowCount = overflowItems.reduce(
        (sum, item) => sum + item.count,
        0,
    );

    return [
        ...visibleItems,
        {
            key: overflowStatisticKey,
            label: 'Other',
            meta: `${overflowItems.length.toLocaleString()} more categories`,
            count: overflowCount,
            children: overflowItems,
        },
    ];
}

function ChartTooltipTrigger({
    text,
    className = '',
    style,
    onClick,
    children,
}: {
    text: string;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
    children?: ReactNode;
}) {
    const [position, setPosition] = useState<{
        left: number;
        top: number;
    } | null>(null);

    function updatePosition(
        element: HTMLElement,
        pointerX: number | null = null,
    ) {
        const rect = element.getBoundingClientRect();

        setPosition({
            left: pointerX ?? rect.left + rect.width / 2,
            top: rect.top - 8,
        });
    }

    function handleMouseEnter(event: MouseEvent<HTMLButtonElement>) {
        updatePosition(event.currentTarget, event.clientX);
    }

    function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
        updatePosition(event.currentTarget, event.clientX);
    }

    function handleFocus(event: FocusEvent<HTMLButtonElement>) {
        updatePosition(event.currentTarget);
    }

    const tooltip =
        position && typeof document !== 'undefined'
            ? createPortal(
                  <span
                      className="pointer-events-none fixed z-[9999] max-w-72 -translate-x-1/2 -translate-y-full rounded-md bg-primary px-3 py-1.5 text-xs whitespace-pre-line text-primary-foreground shadow-lg"
                      style={{
                          left: position.left,
                          top: position.top,
                      }}
                  >
                      {text}
                  </span>,
                  document.body,
              )
            : null;

    return (
        <>
            <button
                type="button"
                aria-label={text}
                title={text}
                className={className}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setPosition(null)}
                onFocus={handleFocus}
                onBlur={() => setPosition(null)}
                onClick={onClick}
            >
                {children}
            </button>
            {tooltip}
        </>
    );
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatAttendanceDay(value: string | null): string {
    if (!value) {
        return '-';
    }

    const [year, month, day] = value.split('-').map(Number);

    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function getAttendanceDays(
    events: EventAttendanceSummary[],
    eventSlug: string,
): string[] {
    return [
        ...new Set(
            events
                .filter(
                    (event) => eventSlug === 'all' || event.slug === eventSlug,
                )
                .flatMap((event) =>
                    event.daily_attendance.map((attendance) => attendance.date),
                ),
        ),
    ].sort();
}

function getNearestAttendanceDay(
    events: EventAttendanceSummary[],
    eventSlug: string,
): string {
    const dates = getAttendanceDays(events, eventSlug);

    if (dates.length === 0) {
        return 'all';
    }

    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');

    return (
        dates.find((date) => date >= today) ?? dates[dates.length - 1] ?? 'all'
    );
}

function toEventDate(value: string | null): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getEventStatus(
    event: EventAttendanceSummary,
    now = new Date(),
): EventStatus {
    const startsAt = toEventDate(event.starts_at);
    const endsAt = toEventDate(event.ends_at);

    if (endsAt && now > endsAt) {
        return 'closed';
    }

    if (startsAt && now < startsAt) {
        return 'upcoming';
    }

    return 'ongoing';
}

function getEventDistance(event: EventAttendanceSummary, now: Date): number {
    const startsAt = toEventDate(event.starts_at);
    const endsAt = toEventDate(event.ends_at);

    if (startsAt && now < startsAt) {
        return startsAt.getTime() - now.getTime();
    }

    if (endsAt && now > endsAt) {
        return now.getTime() - endsAt.getTime();
    }

    if (startsAt || endsAt) {
        return 0;
    }

    return Number.POSITIVE_INFINITY;
}

function getNearestEventSlug(events: EventAttendanceSummary[]): string {
    if (events.length === 0) {
        return 'all';
    }

    const now = new Date();
    const statusOrder: Record<EventStatus, number> = {
        ongoing: 0,
        upcoming: 1,
        closed: 2,
    };

    return [...events].sort((a, b) => {
        const aDistance = getEventDistance(a, now);
        const bDistance = getEventDistance(b, now);

        if (aDistance !== bDistance) {
            return aDistance < bDistance ? -1 : 1;
        }

        const statusDifference =
            statusOrder[getEventStatus(a, now)] -
            statusOrder[getEventStatus(b, now)];

        if (statusDifference !== 0) {
            return statusDifference;
        }

        const aStartsAt =
            toEventDate(a.starts_at)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bStartsAt =
            toEventDate(b.starts_at)?.getTime() ?? Number.POSITIVE_INFINITY;

        if (aStartsAt === bStartsAt) {
            return a.name.localeCompare(b.name);
        }

        return aStartsAt < bStartsAt ? -1 : 1;
    })[0].slug;
}

function formatFileDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function sanitizeFilePart(value: string): string {
    const sanitized = value
        .replace(/[<>:"/\\|?*]+/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    return sanitized || 'all-events';
}

function getAttendanceExportFileName(
    checkedInParticipants: AttendanceParticipant[],
    notCheckedInParticipants: AttendanceParticipant[],
): string {
    const eventNames = [
        ...new Set(
            [...checkedInParticipants, ...notCheckedInParticipants]
                .map((participant) => participant.event_name)
                .filter((eventName): eventName is string => Boolean(eventName)),
        ),
    ];
    const eventName = eventNames.length === 1 ? eventNames[0] : 'all-events';

    return `cers-${formatFileDate(new Date())}-${sanitizeFilePart(eventName)}-attendance.xlsx`;
}

function attendanceExportRow(
    participant: AttendanceParticipant,
    status: 'Checked In' | 'Not Checked In',
) {
    return {
        participant_id: participant.participant_id ?? '-',
        name: participant.name || '-',
        given_name: participant.given_name ?? '-',
        middle_name: participant.middle_name ?? '-',
        surname: participant.surname ?? '-',
        email: participant.email ?? '-',
        phone: participant.phone ?? '-',
        sex: formatLabel(participant.sex),
        participant_type: formatLabel(participant.participant_type),
        organization: participant.organization ?? '-',
        province: participant.province ?? '-',
        municipality: participant.municipality ?? '-',
        event_name: participant.event_name ?? '-',
        registered_at: formatDateTime(participant.registered_at),
        attendance_date: formatAttendanceDay(participant.attendance_date),
        checked_in_at: formatDateTime(participant.checked_in_at),
        scanned_by: participant.scanned_by ?? '-',
        attendance_status: status,
        account_status: participant.is_active ? 'Active' : 'Inactive',
    };
}

function styleAttendanceWorksheet(
    worksheet: ExcelJS.Worksheet,
    headerColor: string,
) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length },
    };
    worksheet.properties.defaultRowHeight = 22;

    const headerRow = worksheet.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: headerColor },
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
        };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF475569' } },
            left: { style: 'thin', color: { argb: 'FF475569' } },
            bottom: { style: 'thin', color: { argb: 'FF475569' } },
            right: { style: 'thin', color: { argb: 'FF475569' } },
        };
    });

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
            row.height = 34;
        }

        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.alignment = {
                vertical: 'top',
                wrapText: true,
            };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
        });
    });
}

function percent(value: number): string {
    return `${Math.round(value)}%`;
}

function matchesParticipantSearch(
    participant: AttendanceParticipant,
    search: string,
): boolean {
    const query = search.trim().toLowerCase();

    if (!query) {
        return true;
    }

    return [participant.name, participant.email, participant.participant_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
}

function optionIdValue(id: number): string {
    return String(id);
}

function normalizeStatisticText(value: string | null): string {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function statisticOrganizationKey(label: string | null): string | null {
    const normalizedLabel = normalizeStatisticText(label);

    return normalizedLabel ? `organization:${normalizedLabel}` : null;
}

function participantOrganizationLabel(
    participant: StatisticParticipant,
    organizationsById: Map<number, StatisticOrganization>,
): string | null {
    const organization = participant.organization_id
        ? organizationsById.get(participant.organization_id)
        : undefined;

    return organization?.name ?? participant.organization;
}

function participantOrganizationKey(
    participant: StatisticParticipant,
    organizationsById: Map<number, StatisticOrganization>,
): string | null {
    return (
        statisticOrganizationKey(
            participantOrganizationLabel(participant, organizationsById),
        ) ?? statisticOrganizationKey('Not specified')
    );
}

function buildOrganizationGroups(
    participants: StatisticParticipant[],
    organizations: StatisticOrganization[],
    organizationsById: Map<number, StatisticOrganization>,
): StatisticBreakdownItem[] {
    const groups = new Map<
        string,
        {
            key: string;
            label: string;
            types: Set<string>;
            count: number;
        }
    >();

    function ensureGroup(label: string | null, type: string | null = null) {
        const trimmedLabel = label?.trim();
        const key = statisticOrganizationKey(trimmedLabel ?? null);

        if (!key || !trimmedLabel) {
            return null;
        }

        const group = groups.get(key) ?? {
            key,
            label: trimmedLabel,
            types: new Set<string>(),
            count: 0,
        };

        if (type) {
            group.types.add(type);
        }

        groups.set(key, group);

        return group;
    }

    organizations.forEach((organization) => {
        ensureGroup(organization.name, organization.type);
    });

    participants.forEach((participant) => {
        const organization = participant.organization_id
            ? organizationsById.get(participant.organization_id)
            : undefined;
        const label = organization?.name ?? participant.organization;
        const group =
            ensureGroup(label, organization?.type ?? null) ??
            ensureGroup('Not specified');

        if (group) {
            group.count += 1;
        }
    });

    return [...groups.values()]
        .map((group) => ({
            key: group.key,
            label: group.label,
            meta: [...group.types].filter(Boolean).sort().join(', ') || null,
            count: group.count,
        }))
        .sort((first, second) => first.label.localeCompare(second.label));
}

function matchesStatisticFilters(
    participant: StatisticParticipant,
    filters: StatisticFilters,
    organizationsById: Map<number, StatisticOrganization>,
): boolean {
    if (
        filters.provinceId !== allStatisticFilterValue &&
        participant.province_id !== Number(filters.provinceId)
    ) {
        return false;
    }

    if (
        filters.municipalityId !== allStatisticFilterValue &&
        participant.municipality_id !== Number(filters.municipalityId)
    ) {
        return false;
    }

    if (
        filters.sex !== allStatisticFilterValue &&
        participant.sex !== filters.sex
    ) {
        return false;
    }

    if (
        filters.participantType !== allStatisticFilterValue &&
        participant.participant_type !== filters.participantType
    ) {
        return false;
    }

    if (filters.organizationId === allStatisticFilterValue) {
        return true;
    }

    return (
        participantOrganizationKey(participant, organizationsById) ===
        filters.organizationId
    );
}

function countStatisticParticipants(
    participants: StatisticParticipant[],
    predicate: (participant: StatisticParticipant) => boolean,
): number {
    return participants.reduce(
        (count, participant) => count + (predicate(participant) ? 1 : 0),
        0,
    );
}

function TruncatedTooltipText({
    text,
    className = '',
    onClick,
}: {
    text: string;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={`block max-w-full min-w-0 truncate text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        onClick
                            ? 'cursor-pointer underline-offset-2 hover:underline'
                            : ''
                    } ${className}`}
                    onClick={onClick}
                >
                    {text}
                </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[min(20rem,calc(100vw-2rem))] break-words">
                {text}
            </TooltipContent>
        </Tooltip>
    );
}

function EventStatusBadge({ status }: { status: EventStatus }) {
    return (
        <Badge
            className={`shrink-0 border-transparent px-1.5 py-0 text-[10px] capitalize ${
                status === 'ongoing'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : status === 'upcoming'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
            }`}
        >
            {status}
        </Badge>
    );
}

function DashboardEventFilter({
    value,
    options,
    onChange,
}: {
    value: string;
    options: EventAttendanceSummary[];
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.slug === value);
    const totalCount = options.reduce(
        (count, option) => count + option.participants_count,
        0,
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Filter dashboard by event"
                    className="flex min-h-9 max-w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-80"
                >
                    <span className="min-w-0 truncate">
                        {selectedOption?.name ?? 'All events'}
                    </span>
                    {selectedOption && (
                        <EventStatusBadge
                            status={getEventStatus(selectedOption)}
                        />
                    )}
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
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
                            <CommandItem
                                value="All events"
                                onSelect={() => {
                                    onChange('all');
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={`mr-2 size-4 ${
                                        value === 'all'
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                    }`}
                                />
                                <span className="min-w-0 flex-1">
                                    All events
                                </span>
                                <Badge
                                    variant="secondary"
                                    className="shrink-0 px-1.5 py-0 text-[10px]"
                                >
                                    {totalCount.toLocaleString()}
                                </Badge>
                            </CommandItem>
                            {options.map((option) => {
                                const status = getEventStatus(option);

                                return (
                                    <CommandItem
                                        key={option.id}
                                        value={`${option.name} ${status} ${option.starts_at ?? ''} ${option.ends_at ?? ''}`}
                                        onSelect={() => {
                                            onChange(option.slug);
                                            setOpen(false);
                                        }}
                                        className="items-start"
                                    >
                                        <Check
                                            className={`mt-0.5 mr-2 size-4 shrink-0 ${
                                                value === option.slug
                                                    ? 'opacity-100'
                                                    : 'opacity-0'
                                            }`}
                                        />
                                        <span className="min-w-0 flex-1 leading-5 break-words">
                                            {option.name}
                                        </span>
                                        <EventStatusBadge status={status} />
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0 px-1.5 py-0 text-[10px]"
                                        >
                                            {option.participants_count.toLocaleString()}
                                        </Badge>
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

function SearchableStatisticFilter({
    label,
    description,
    value,
    onChange,
    options,
    searchPlaceholder,
}: {
    label: string;
    description: string;
    value: string;
    onChange: (value: string) => void;
    options: StatisticFilterOption[];
    searchPlaceholder: string;
}) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.value === value);

    return (
        <div className="grid gap-1.5">
            <div>
                <p className="text-xs font-medium text-muted-foreground">
                    {label}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    {description}
                </p>
            </div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-expanded={open}
                        className="flex min-h-10 w-full items-start justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm shadow-sm transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <span className="min-w-0 leading-5 break-words whitespace-normal">
                            {selectedOption?.label ?? 'Select filter'}
                        </span>
                        <ChevronsUpDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-[calc(100vw-2rem)] p-0 sm:w-80"
                >
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList>
                            <CommandEmpty>No options found.</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={`${option.label} ${option.description ?? ''}`}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                        }}
                                        className="items-start"
                                    >
                                        <Check
                                            className={`mt-0.5 size-4 ${
                                                option.value === value
                                                    ? 'opacity-100'
                                                    : 'opacity-0'
                                            }`}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-3">
                                                <span className="min-w-0 leading-5 break-words">
                                                    {option.label}
                                                </span>
                                                {option.count !== undefined && (
                                                    <span className="shrink-0 text-xs text-muted-foreground sm:text-right">
                                                        {option.count.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            {option.description && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {option.description}
                                                </p>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function BarBreakdownChart({
    items,
    onSelectItem,
}: {
    items: StatisticBreakdownItem[];
    onSelectItem: (item: StatisticBreakdownItem) => void;
}) {
    const maxCount = Math.max(1, ...items.map((item) => item.count));

    return (
        <div className="min-h-56">
            <div className="flex h-44 items-end gap-2 border-b border-l px-2 pt-4">
                {items.map((item, index) => {
                    const tooltipText = statisticTooltipText(item);

                    return (
                        <ChartTooltipTrigger
                            key={item.key}
                            text={tooltipText}
                            className={`relative flex min-w-0 flex-1 flex-col items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                                item.children
                                    ? 'cursor-pointer'
                                    : 'cursor-default'
                            }`}
                            onClick={
                                item.children
                                    ? () => onSelectItem(item)
                                    : undefined
                            }
                        >
                            <span className="text-[11px] font-semibold">
                                {item.count.toLocaleString()}
                            </span>
                            <span
                                className="w-full max-w-10 rounded-t"
                                style={{
                                    height: `${Math.max(8, (item.count / maxCount) * 120)}px`,
                                    backgroundColor:
                                        statisticChartColors[
                                            index % statisticChartColors.length
                                        ],
                                }}
                            />
                        </ChartTooltipTrigger>
                    );
                })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {items.map((item, index) => (
                    <div
                        key={item.key}
                        className="flex min-w-0 items-center gap-1.5"
                    >
                        <span
                            className="size-2.5 shrink-0 rounded-sm"
                            style={{
                                backgroundColor:
                                    statisticChartColors[
                                        index % statisticChartColors.length
                                    ],
                            }}
                        />
                        <TruncatedTooltipText
                            text={item.label}
                            onClick={
                                item.children
                                    ? () => onSelectItem(item)
                                    : undefined
                            }
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function PieBreakdownChart({
    items,
    onSelectItem,
}: {
    items: StatisticBreakdownItem[];
    onSelectItem: (item: StatisticBreakdownItem) => void;
}) {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    const summaryTooltipText = items.map(statisticTooltipText).join('\n');
    const radius = 36;
    const center = 72;
    const strokeWidth = 72;
    const circumference = 2 * Math.PI * radius;
    const segments = items.map((item, index) => {
        const previousCount = items
            .slice(0, index)
            .reduce((sum, previousItem) => sum + previousItem.count, 0);
        const length = total > 0 ? (item.count / total) * circumference : 0;
        const offset = total > 0 ? -(previousCount / total) * circumference : 0;
        const color = statisticChartColors[index % statisticChartColors.length];

        return { ...item, color, length, offset };
    });

    return (
        <div className="grid gap-4 sm:grid-cols-[9rem_1fr] sm:items-center">
            <ChartTooltipTrigger
                text={summaryTooltipText}
                className="relative mx-auto block size-36 cursor-default rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                <svg
                    viewBox="0 0 144 144"
                    role="img"
                    aria-label="Participant statistics pie chart"
                    className="size-36 rounded-full border shadow-inner"
                >
                    {total === 0 ? (
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            className="stroke-muted"
                            strokeWidth={strokeWidth}
                        />
                    ) : (
                        segments.map((segment) => {
                            const tooltipText = statisticTooltipText(segment);

                            return (
                                <circle
                                    key={segment.key}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="none"
                                    stroke={segment.color}
                                    strokeDasharray={`${segment.length} ${
                                        circumference - segment.length
                                    }`}
                                    strokeDashoffset={segment.offset}
                                    strokeWidth={strokeWidth}
                                    transform={`rotate(-90 ${center} ${center})`}
                                >
                                    <title>{tooltipText}</title>
                                </circle>
                            );
                        })
                    )}
                </svg>
            </ChartTooltipTrigger>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div
                        key={item.key}
                        className="flex items-center justify-between gap-3 text-sm"
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{
                                    backgroundColor:
                                        statisticChartColors[
                                            index % statisticChartColors.length
                                        ],
                                }}
                            />
                            <TruncatedTooltipText
                                text={item.label}
                                onClick={
                                    item.children
                                        ? () => onSelectItem(item)
                                        : undefined
                                }
                            />
                        </div>
                        <span className="shrink-0 text-right text-xs font-medium">
                            {item.count.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LineBreakdownChart({
    items,
    onSelectItem,
}: {
    items: StatisticBreakdownItem[];
    onSelectItem: (item: StatisticBreakdownItem) => void;
}) {
    const width = 520;
    const height = 200;
    const paddingX = 30;
    const paddingTop = 20;
    const paddingBottom = 42;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingTop - paddingBottom;
    const maxCount = Math.max(1, ...items.map((item) => item.count));
    const points = items.map((item, index) => {
        const x =
            paddingX +
            (items.length <= 1
                ? chartWidth / 2
                : (index / (items.length - 1)) * chartWidth);
        const y =
            paddingTop + chartHeight - (item.count / maxCount) * chartHeight;

        return { ...item, x, y };
    });
    const linePath = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
        )
        .join(' ');

    return (
        <div className="-mx-2 overflow-x-auto px-2">
            <div className="relative min-w-[360px]">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label="Participant statistics line chart"
                    className="h-auto w-full"
                >
                    <line
                        x1={paddingX}
                        x2={width - paddingX}
                        y1={paddingTop + chartHeight}
                        y2={paddingTop + chartHeight}
                        className="stroke-border"
                        strokeWidth="1"
                    />
                    <line
                        x1={paddingX}
                        x2={width - paddingX}
                        y1={paddingTop + chartHeight / 2}
                        y2={paddingTop + chartHeight / 2}
                        className="stroke-border/60"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                    />
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            className="stroke-[#0038A8]"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                        />
                    )}
                    {points.map((point, index) => (
                        <g key={point.key}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                className="fill-background stroke-[#0038A8]"
                                strokeWidth="2"
                            />
                            <text
                                x={point.x}
                                y={point.y - 10}
                                textAnchor="middle"
                                className="fill-foreground text-[10px] font-semibold"
                            >
                                {point.count}
                            </text>
                            <text
                                x={point.x}
                                y={height - 14}
                                textAnchor="middle"
                                className="fill-muted-foreground text-[10px]"
                            >
                                {String(index + 1)}
                            </text>
                        </g>
                    ))}
                </svg>
                {points.map((point) => {
                    const tooltipText = statisticTooltipText(point);

                    return (
                        <ChartTooltipTrigger
                            key={point.key}
                            text={tooltipText}
                            className={`group absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                                point.children
                                    ? 'cursor-pointer'
                                    : 'cursor-default'
                            }`}
                            style={{
                                left: `${(point.x / width) * 100}%`,
                                top: `${(point.y / height) * 100}%`,
                            }}
                            onClick={
                                point.children
                                    ? () => onSelectItem(point)
                                    : undefined
                            }
                        />
                    );
                })}
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
                {items.map((item, index) => (
                    <div key={item.key} className="flex min-w-0 gap-1.5">
                        <span className="font-semibold">{index + 1}.</span>
                        <TruncatedTooltipText
                            text={item.label}
                            onClick={
                                item.children
                                    ? () => onSelectItem(item)
                                    : undefined
                            }
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatisticChart({
    title,
    description,
    icon: Icon,
    items,
    emptyText,
    chartType,
}: {
    title: string;
    description: string;
    icon: LucideIcon;
    items: StatisticBreakdownItem[];
    emptyText: string;
    chartType: StatisticChartType;
}) {
    const visibleItems = groupStatisticItemsForChart(
        items,
        chartType === 'pie' ? 6 : 7,
    );
    const [selectedItem, setSelectedItem] =
        useState<StatisticBreakdownItem | null>(null);
    const selectedChildren = selectedItem?.children ?? [];
    const ChartIcon =
        chartType === 'bar'
            ? BarChart3
            : chartType === 'pie'
              ? PieChart
              : LineChartIcon;

    return (
        <>
            <section className="min-w-0 overflow-visible rounded-lg border bg-background p-3 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">
                                {title}
                            </h3>
                            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    <ChartIcon className="size-4 shrink-0 text-muted-foreground" />
                </div>

                {visibleItems.length > 0 ? (
                    chartType === 'bar' ? (
                        <BarBreakdownChart
                            items={visibleItems}
                            onSelectItem={setSelectedItem}
                        />
                    ) : chartType === 'pie' ? (
                        <PieBreakdownChart
                            items={visibleItems}
                            onSelectItem={setSelectedItem}
                        />
                    ) : (
                        <LineBreakdownChart
                            items={visibleItems}
                            onSelectItem={setSelectedItem}
                        />
                    )
                ) : (
                    <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
                        {emptyText}
                    </div>
                )}
            </section>

            <Dialog
                open={!!selectedItem}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedItem(null);
                    }
                }}
            >
                <DialogContent
                    className="grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden p-4 sm:max-h-[min(36rem,calc(100dvh-2rem))] sm:max-w-lg sm:gap-4 sm:p-6"
                    onPointerDownOutside={preventDialogOutsideClose}
                    onInteractOutside={preventDialogInteractOutside}
                >
                    <DialogHeader className="pr-8 text-left">
                        <DialogTitle className="leading-6">
                            {title} Other Categories
                        </DialogTitle>
                        <DialogDescription>
                            {selectedItem
                                ? `${selectedItem.count.toLocaleString()} participants across ${selectedChildren.length.toLocaleString()} categories.`
                                : null}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 overflow-y-auto overscroll-contain rounded-md border">
                        {selectedChildren.map((item) => (
                            <div
                                key={item.key}
                                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium break-words">
                                        {item.label}
                                    </p>
                                    {item.meta && (
                                        <p className="mt-0.5 text-xs break-words text-muted-foreground">
                                            {item.meta}
                                        </p>
                                    )}
                                </div>
                                <span className="shrink-0 font-semibold">
                                    {item.count.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function LineChart({ data }: { data: RegistrationTrend[] }) {
    const width = 720;
    const height = 220;
    const paddingX = 34;
    const paddingTop = 22;
    const paddingBottom = 42;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingTop - paddingBottom;
    const maxValue = Math.max(1, ...data.map((item) => item.count));

    const points = data.map((item, index) => {
        const x =
            paddingX +
            (data.length <= 1
                ? chartWidth / 2
                : (index / (data.length - 1)) * chartWidth);
        const y =
            paddingTop + chartHeight - (item.count / maxValue) * chartHeight;

        return { ...item, x, y };
    });

    const linePath = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
        )
        .join(' ');

    const areaPath = points.length
        ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
        : '';

    return (
        <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
            <div className="relative min-w-[340px] sm:min-w-[560px]">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label="Daily registration line chart"
                    className="h-auto w-full"
                >
                    <line
                        x1={paddingX}
                        x2={width - paddingX}
                        y1={paddingTop + chartHeight}
                        y2={paddingTop + chartHeight}
                        className="stroke-border"
                        strokeWidth="1"
                    />
                    <line
                        x1={paddingX}
                        x2={width - paddingX}
                        y1={paddingTop + chartHeight / 2}
                        y2={paddingTop + chartHeight / 2}
                        className="stroke-border/60"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                    />
                    {areaPath && (
                        <path d={areaPath} className="fill-blue-500/10" />
                    )}
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            className="stroke-[#0038A8]"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                        />
                    )}
                    {points.map((point, index) => {
                        const showMobileLabel =
                            index === 0 ||
                            index === points.length - 1 ||
                            index % 3 === 0;

                        return (
                            <g key={point.date}>
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4"
                                    className="fill-background stroke-[#0038A8]"
                                    strokeWidth="2"
                                />
                                <text
                                    x={point.x}
                                    y={point.y - 10}
                                    textAnchor="middle"
                                    className="fill-foreground text-[10px] font-semibold"
                                >
                                    {point.count}
                                </text>
                                {showMobileLabel && (
                                    <text
                                        x={point.x}
                                        y={height - 14}
                                        textAnchor="middle"
                                        className="fill-muted-foreground text-[10px]"
                                    >
                                        {point.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
                {points.map((point) => {
                    const tooltipText = `${point.label}: ${formatRegistrationCount(
                        point.count,
                    )}`;

                    return (
                        <ChartTooltipTrigger
                            key={point.date}
                            text={tooltipText}
                            className="group absolute size-8 -translate-x-1/2 -translate-y-1/2 cursor-default rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            style={{
                                left: `${(point.x / width) * 100}%`,
                                top: `${(point.y / height) * 100}%`,
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function DoughnutChart({
    data,
    onSelectStatus,
}: {
    data: AttendanceStatus[];
    onSelectStatus: (status: 'checked-in' | 'not-checked-in') => void;
}) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const checkedIn =
        data.find((item) => item.label === 'Checked In')?.count ?? 0;
    const notCheckedIn =
        data.find((item) => item.label === 'Not Checked In')?.count ?? 0;
    const checkedPercent = total > 0 ? (checkedIn / total) * 100 : 0;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const checkedLength = (checkedPercent / 100) * circumference;
    const notCheckedLength = circumference - checkedLength;

    return (
        <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
            <div className="relative mx-auto size-36 sm:size-40 xl:size-36 2xl:size-44">
                <svg
                    viewBox="0 0 160 160"
                    role="img"
                    aria-label="Attendance doughnut chart"
                >
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        className="stroke-muted"
                        strokeWidth="22"
                    />
                    {total > 0 && (
                        <>
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                className="stroke-[#0038A8]"
                                strokeDasharray={`${checkedLength} ${circumference - checkedLength}`}
                                strokeLinecap="round"
                                strokeWidth="22"
                                transform="rotate(-90 80 80)"
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                className="stroke-amber-500"
                                strokeDasharray={`${notCheckedLength} ${circumference - notCheckedLength}`}
                                strokeDashoffset={-checkedLength}
                                strokeLinecap="round"
                                strokeWidth="22"
                                transform="rotate(-90 80 80)"
                            />
                        </>
                    )}
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                        <p className="text-xl font-semibold tracking-tight sm:text-2xl">
                            {percent(checkedPercent)}
                        </p>
                        <p className="text-[11px] text-muted-foreground sm:text-xs">
                            Checked in
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-2">
                <button
                    type="button"
                    onClick={() => onSelectStatus('checked-in')}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <div className="flex items-center gap-2">
                        <span className="size-3 rounded-full bg-[#0038A8]" />
                        <span className="text-sm font-medium">Checked In</span>
                    </div>
                    <span className="font-semibold">
                        {checkedIn.toLocaleString()}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => onSelectStatus('not-checked-in')}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <div className="flex items-center gap-2">
                        <span className="size-3 rounded-full bg-amber-500" />
                        <span className="text-sm font-medium">
                            Not Checked In
                        </span>
                    </div>
                    <span className="font-semibold">
                        {notCheckedIn.toLocaleString()}
                    </span>
                </button>
                <p className="text-xs text-muted-foreground">
                    Based on registered participants assigned to events.
                </p>
            </div>
        </div>
    );
}

function AttendanceParticipantCard({
    participant,
    selectedAttendanceStatus,
}: {
    participant: AttendanceParticipant;
    selectedAttendanceStatus: 'checked-in' | 'not-checked-in' | null;
}) {
    return (
        <article className="rounded-lg border bg-card p-3 text-sm shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
                <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                        {participant.name}
                    </p>
                    <p className="mt-0.5 text-xs break-all text-muted-foreground">
                        {participant.participant_id ?? '-'} ·{' '}
                        {participant.email}
                    </p>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                    <p className="font-medium text-foreground">
                        {selectedAttendanceStatus === 'checked-in'
                            ? 'Checked In At'
                            : 'Registered At'}
                    </p>
                    <p>
                        {formatDateTime(
                            selectedAttendanceStatus === 'checked-in'
                                ? participant.checked_in_at
                                : participant.registered_at,
                        )}
                    </p>
                    <p className="mt-2 font-medium text-foreground">
                        Attendance Day
                    </p>
                    <p>{formatAttendanceDay(participant.attendance_date)}</p>
                    {selectedAttendanceStatus === 'checked-in' ? (
                        <>
                            <p className="mt-2 font-medium text-foreground">
                                Scanned By
                            </p>
                            <p>{participant.scanned_by ?? '-'}</p>
                        </>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

export default function Dashboard({
    recentParticipants,
    eventSummary,
    registrationTrend,
    eventAttendanceSummary,
    checkedInParticipants,
    notCheckedInParticipants,
    participantStatistics,
}: Props) {
    const initialEventFilter = getNearestEventSlug(eventAttendanceSummary);
    const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState<
        'checked-in' | 'not-checked-in' | null
    >(null);
    const [attendanceSearch, setAttendanceSearch] = useState('');
    const [attendancePage, setAttendancePage] = useState(1);
    const [attendancePageSize, setAttendancePageSize] =
        useState<(typeof attendancePageSizeOptions)[number]>(25);
    const [isExportingAttendance, setIsExportingAttendance] = useState(false);
    const [eventFilter, setEventFilter] = useState(initialEventFilter);
    const [attendanceDayFilter, setAttendanceDayFilter] = useState(() =>
        getNearestAttendanceDay(eventAttendanceSummary, initialEventFilter),
    );
    const [statisticFilters, setStatisticFilters] = useState<StatisticFilters>({
        provinceId: allStatisticFilterValue,
        municipalityId: allStatisticFilterValue,
        sex: allStatisticFilterValue,
        participantType: allStatisticFilterValue,
        organizationId: allStatisticFilterValue,
    });

    const availableAttendanceDays = useMemo(
        () => getAttendanceDays(eventAttendanceSummary, eventFilter),
        [eventAttendanceSummary, eventFilter],
    );
    const eventCheckedInParticipants = useMemo(
        () =>
            checkedInParticipants.filter(
                (participant) =>
                    (eventFilter === 'all' ||
                        participant.event_slug === eventFilter) &&
                    (attendanceDayFilter === 'all' ||
                        participant.attendance_date === attendanceDayFilter),
            ),
        [attendanceDayFilter, checkedInParticipants, eventFilter],
    );
    const eventNotCheckedInParticipants = useMemo(
        () =>
            notCheckedInParticipants.filter(
                (participant) =>
                    (eventFilter === 'all' ||
                        participant.event_slug === eventFilter) &&
                    (attendanceDayFilter === 'all' ||
                        participant.attendance_date === attendanceDayFilter),
            ),
        [attendanceDayFilter, eventFilter, notCheckedInParticipants],
    );
    const filteredStats: Stats = {
        participants:
            eventCheckedInParticipants.length +
            eventNotCheckedInParticipants.length,
        checkedInParticipants: eventCheckedInParticipants.length,
        notCheckedInParticipants: eventNotCheckedInParticipants.length,
    };
    const filteredAttendanceStatus: AttendanceStatus[] = [
        {
            label: 'Checked In',
            count: eventCheckedInParticipants.length,
        },
        {
            label: 'Not Checked In',
            count: eventNotCheckedInParticipants.length,
        },
    ];
    const filteredRecentParticipants = useMemo(
        () =>
            (eventFilter === 'all'
                ? recentParticipants
                : recentParticipants.filter(
                      (participant) => participant.event_name === eventFilter,
                  )
            ).slice(0, 5),
        [eventFilter, recentParticipants],
    );

    const selectedAttendanceRawParticipants =
        selectedAttendanceStatus === 'checked-in'
            ? eventCheckedInParticipants
            : eventNotCheckedInParticipants;

    const selectedAttendanceParticipants = useMemo(
        () =>
            selectedAttendanceRawParticipants.filter((participant) =>
                matchesParticipantSearch(participant, attendanceSearch),
            ),
        [selectedAttendanceRawParticipants, attendanceSearch],
    );

    const attendanceTotalPages = Math.max(
        1,
        Math.ceil(selectedAttendanceParticipants.length / attendancePageSize),
    );
    const currentAttendancePage = Math.min(
        attendancePage,
        attendanceTotalPages,
    );
    const attendanceStartIndex =
        (currentAttendancePage - 1) * attendancePageSize;
    const attendanceEndIndex = attendanceStartIndex + attendancePageSize;
    const paginatedAttendanceParticipants =
        selectedAttendanceParticipants.slice(
            attendanceStartIndex,
            attendanceEndIndex,
        );
    const participantTypeLabelsBySlug = useMemo(
        () =>
            new Map(
                participantStatistics.participantTypes.map(
                    (participantType) => [
                        participantType.slug,
                        participantType.name,
                    ],
                ),
            ),
        [participantStatistics.participantTypes],
    );

    const selectedAttendanceTitle =
        selectedAttendanceStatus === 'checked-in'
            ? 'Daily Checked-In Participants'
            : 'Participants Missing Daily Check-In';

    const dailyAttendanceRows = useMemo(
        () =>
            eventAttendanceSummary.flatMap((event) =>
                event.daily_attendance
                    .filter(
                        (attendance) =>
                            (eventFilter === 'all' ||
                                event.slug === eventFilter) &&
                            (attendanceDayFilter === 'all' ||
                                attendance.date === attendanceDayFilter),
                    )
                    .map((attendance) => ({
                        ...attendance,
                        event_id: event.id,
                        event_name: event.name,
                        event_slug: event.slug,
                    })),
            ),
        [attendanceDayFilter, eventAttendanceSummary, eventFilter],
    );

    const maxEventParticipants = Math.max(
        1,
        ...eventSummary.map((event) => event.participants_count),
    );
    const filteredStatisticMunicipalities = useMemo(() => {
        if (statisticFilters.provinceId === allStatisticFilterValue) {
            return participantStatistics.municipalities;
        }

        return participantStatistics.municipalities.filter(
            (municipality) =>
                municipality.province_id ===
                Number(statisticFilters.provinceId),
        );
    }, [participantStatistics.municipalities, statisticFilters.provinceId]);
    const organizationsById = useMemo(
        () =>
            new Map(
                participantStatistics.organizations.map((organization) => [
                    organization.id,
                    organization,
                ]),
            ),
        [participantStatistics.organizations],
    );
    const eventStatisticParticipants = useMemo(
        () =>
            eventFilter === 'all'
                ? participantStatistics.participants
                : participantStatistics.participants.filter(
                      (participant) => participant.event_name === eventFilter,
                  ),
        [eventFilter, participantStatistics.participants],
    );
    const eventParticipantTypes = useMemo(() => {
        if (eventFilter !== 'all') {
            return participantStatistics.participantTypes.filter(
                (participantType) => participantType.event_slug === eventFilter,
            );
        }

        return Array.from(
            new Map(
                participantStatistics.participantTypes.map(
                    (participantType) => [
                        participantType.slug,
                        participantType,
                    ],
                ),
            ).values(),
        );
    }, [eventFilter, participantStatistics.participantTypes]);
    const filteredStatisticParticipants = useMemo(
        () =>
            eventStatisticParticipants.filter((participant) =>
                matchesStatisticFilters(
                    participant,
                    statisticFilters,
                    organizationsById,
                ),
            ),
        [eventStatisticParticipants, organizationsById, statisticFilters],
    );
    const organizationGroups = useMemo(
        () =>
            buildOrganizationGroups(
                eventStatisticParticipants,
                participantStatistics.organizations,
                organizationsById,
            ),
        [
            eventStatisticParticipants,
            organizationsById,
            participantStatistics.organizations,
        ],
    );
    const sexFilterOptions = useMemo(
        () =>
            [
                ...new Set(
                    eventStatisticParticipants.map(
                        (participant) => participant.sex,
                    ),
                ),
            ]
                .filter((sex): sex is string => Boolean(sex))
                .sort((first, second) =>
                    formatLabel(first).localeCompare(formatLabel(second)),
                ),
        [eventStatisticParticipants],
    );
    const sexBreakdown = useMemo(() => {
        const counts = new Map<string, number>();

        filteredStatisticParticipants.forEach((participant) => {
            const sex = participant.sex ?? 'not-specified';
            counts.set(sex, (counts.get(sex) ?? 0) + 1);
        });

        return [...counts.entries()].map(([sex, count]) => ({
            key: sex,
            label: sex === 'not-specified' ? 'Not specified' : formatLabel(sex),
            count,
        }));
    }, [filteredStatisticParticipants]);
    const provinceBreakdown = useMemo(() => {
        const knownProvinceIds = new Set(
            participantStatistics.provinces.map((province) => province.id),
        );
        const locationMissingCount = countStatisticParticipants(
            filteredStatisticParticipants,
            (participant) =>
                !participant.province_id ||
                !knownProvinceIds.has(participant.province_id),
        );

        return [
            ...participantStatistics.provinces.map((province) => ({
                key: optionIdValue(province.id),
                label: province.name,
                meta: province.code,
                count: countStatisticParticipants(
                    filteredStatisticParticipants,
                    (participant) => participant.province_id === province.id,
                ),
            })),
            {
                key: unspecifiedStatisticKey,
                label: 'Not specified',
                count: locationMissingCount,
            },
        ];
    }, [filteredStatisticParticipants, participantStatistics.provinces]);
    const municipalityBreakdown = useMemo(() => {
        const knownMunicipalityIds = new Set(
            filteredStatisticMunicipalities.map(
                (municipality) => municipality.id,
            ),
        );
        const locationMissingCount = countStatisticParticipants(
            filteredStatisticParticipants,
            (participant) =>
                !participant.municipality_id ||
                !knownMunicipalityIds.has(participant.municipality_id),
        );

        return [
            ...filteredStatisticMunicipalities.map((municipality) => ({
                key: optionIdValue(municipality.id),
                label: municipality.name,
                meta: formatLabel(municipality.type),
                count: countStatisticParticipants(
                    filteredStatisticParticipants,
                    (participant) =>
                        participant.municipality_id === municipality.id,
                ),
            })),
            {
                key: unspecifiedStatisticKey,
                label: 'Not specified',
                count: locationMissingCount,
            },
        ];
    }, [filteredStatisticMunicipalities, filteredStatisticParticipants]);
    const participantTypeBreakdown = useMemo(() => {
        const knownParticipantTypeSlugs = new Set(
            eventParticipantTypes.map(
                (participantType) => participantType.slug,
            ),
        );
        const unlistedParticipantTypeCount = countStatisticParticipants(
            filteredStatisticParticipants,
            (participant) =>
                !!participant.participant_type &&
                !knownParticipantTypeSlugs.has(participant.participant_type),
        );
        const missingParticipantTypeCount = countStatisticParticipants(
            filteredStatisticParticipants,
            (participant) => !participant.participant_type,
        );

        return [
            ...eventParticipantTypes.map((participantType) => ({
                key: participantType.slug,
                label: participantType.name,
                meta: formatLabel(participantType.type),
                count: countStatisticParticipants(
                    filteredStatisticParticipants,
                    (participant) =>
                        participant.participant_type === participantType.slug,
                ),
            })),
            {
                key: 'unlisted-participant-type',
                label: 'Unlisted participant type',
                count: unlistedParticipantTypeCount,
            },
            {
                key: unspecifiedStatisticKey,
                label: 'Not specified',
                count: missingParticipantTypeCount,
            },
        ];
    }, [eventParticipantTypes, filteredStatisticParticipants]);
    const organizationBreakdown = useMemo(
        () =>
            buildOrganizationGroups(
                filteredStatisticParticipants,
                participantStatistics.organizations,
                organizationsById,
            ),
        [
            filteredStatisticParticipants,
            organizationsById,
            participantStatistics.organizations,
        ],
    );
    const provinceFilterOptions = useMemo(
        () => [
            {
                value: allStatisticFilterValue,
                label: 'All provinces',
                count: eventStatisticParticipants.length,
                description: 'Include every province.',
            },
            ...participantStatistics.provinces.map((province) => ({
                value: optionIdValue(province.id),
                label: province.name,
                count: countStatisticParticipants(
                    eventStatisticParticipants,
                    (participant) => participant.province_id === province.id,
                ),
                description: `Province code ${province.code}`,
            })),
        ],
        [eventStatisticParticipants, participantStatistics.provinces],
    );
    const municipalityFilterOptions = useMemo(
        () => [
            {
                value: allStatisticFilterValue,
                label: 'All municipalities',
                count: filteredStatisticParticipants.length,
                description:
                    statisticFilters.provinceId === allStatisticFilterValue
                        ? 'Include every city and municipality.'
                        : 'Include every city and municipality in the selected province.',
            },
            ...filteredStatisticMunicipalities.map((municipality) => ({
                value: optionIdValue(municipality.id),
                label: municipality.name,
                count: countStatisticParticipants(
                    eventStatisticParticipants,
                    (participant) =>
                        participant.municipality_id === municipality.id,
                ),
                description: formatLabel(municipality.type),
            })),
        ],
        [
            filteredStatisticMunicipalities,
            filteredStatisticParticipants.length,
            eventStatisticParticipants,
            statisticFilters.provinceId,
        ],
    );
    const sexFilterOptionItems = useMemo(
        () => [
            {
                value: allStatisticFilterValue,
                label: 'All sex values',
                count: eventStatisticParticipants.length,
                description: 'Include every recorded sex value.',
            },
            ...sexFilterOptions.map((sex) => ({
                value: sex,
                label: formatLabel(sex),
                count: countStatisticParticipants(
                    eventStatisticParticipants,
                    (participant) => participant.sex === sex,
                ),
                description: 'Recorded participant sex.',
            })),
        ],
        [eventStatisticParticipants, sexFilterOptions],
    );
    const participantTypeFilterOptions = useMemo(
        () => [
            {
                value: allStatisticFilterValue,
                label: 'All participant types',
                count: eventStatisticParticipants.length,
                description: 'Include every participant category.',
            },
            ...eventParticipantTypes.map((participantType) => ({
                value: participantType.slug,
                label: participantType.name,
                count: countStatisticParticipants(
                    eventStatisticParticipants,
                    (participant) =>
                        participant.participant_type === participantType.slug,
                ),
                description: formatLabel(participantType.type),
            })),
        ],
        [eventParticipantTypes, eventStatisticParticipants],
    );
    const organizationFilterOptions = useMemo(
        () => [
            {
                value: allStatisticFilterValue,
                label: 'All schools and organizations',
                count: eventStatisticParticipants.length,
                description: 'Include every school and partner organization.',
            },
            ...organizationGroups
                .filter((organization) => organization.count > 0)
                .map((organization) => ({
                    value: organization.key,
                    label: organization.label,
                    count: organization.count,
                    description: organization.meta,
                })),
        ],
        [eventStatisticParticipants.length, organizationGroups],
    );
    const statisticFiltersActive = Object.values(statisticFilters).some(
        (value) => value !== allStatisticFilterValue,
    );

    function updateStatisticFilter(key: keyof StatisticFilters, value: string) {
        setStatisticFilters((currentFilters) => ({
            ...currentFilters,
            [key]: value,
            ...(key === 'provinceId'
                ? { municipalityId: allStatisticFilterValue }
                : {}),
        }));
    }

    function resetStatisticFilters() {
        setStatisticFilters({
            provinceId: allStatisticFilterValue,
            municipalityId: allStatisticFilterValue,
            sex: allStatisticFilterValue,
            participantType: allStatisticFilterValue,
            organizationId: allStatisticFilterValue,
        });
    }

    function updateEventFilter(value: string) {
        setEventFilter(value);
        setAttendanceDayFilter(
            getNearestAttendanceDay(eventAttendanceSummary, value),
        );
        setAttendancePage(1);
    }

    function updateAttendanceDayFilter(value: string) {
        setAttendanceDayFilter(value);
        setAttendancePage(1);
    }

    function openAttendanceDialog(status: 'checked-in' | 'not-checked-in') {
        setAttendanceSearch('');
        setAttendancePage(1);
        setSelectedAttendanceStatus(status);
    }

    function closeAttendanceDialog() {
        setSelectedAttendanceStatus(null);
        setAttendanceSearch('');
        setAttendancePage(1);
    }

    function updateAttendanceSearch(value: string) {
        setAttendanceSearch(value);
        setAttendancePage(1);
    }

    function updateAttendancePageSize(value: number) {
        setAttendancePageSize(
            value as (typeof attendancePageSizeOptions)[number],
        );
        setAttendancePage(1);
    }

    async function downloadAttendanceExcel() {
        setIsExportingAttendance(true);

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'CERS';
            workbook.created = new Date();
            workbook.modified = new Date();

            const checkedInSheet = workbook.addWorksheet('Checked In');
            checkedInSheet.columns = checkedInAttendanceExportColumns;
            checkedInSheet.addRows(
                eventCheckedInParticipants.map((participant) =>
                    attendanceExportRow(participant, 'Checked In'),
                ),
            );
            styleAttendanceWorksheet(checkedInSheet, 'FF0038A8');

            const notCheckedInSheet = workbook.addWorksheet('Not Checked In');
            notCheckedInSheet.columns = attendanceExportColumns;
            notCheckedInSheet.addRows(
                eventNotCheckedInParticipants.map((participant) =>
                    attendanceExportRow(participant, 'Not Checked In'),
                ),
            );
            styleAttendanceWorksheet(notCheckedInSheet, 'FFF59E0B');

            const workbookArrayBuffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([workbookArrayBuffer], {
                type: excelMimeType,
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = getAttendanceExportFileName(
                eventCheckedInParticipants,
                eventNotCheckedInParticipants,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success('Attendance Excel downloaded.');
        } catch (error) {
            console.error(error);
            toast.error('Unable to download attendance Excel.');
        } finally {
            setIsExportingAttendance(false);
        }
    }

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Monitor participant registration, event attendance,
                            and setup coverage.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <DashboardEventFilter
                            value={eventFilter}
                            options={eventAttendanceSummary}
                            onChange={updateEventFilter}
                        />
                        <label className="flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm">
                            <CalendarDays className="size-3.5 text-muted-foreground" />
                            <span className="sr-only">Attendance day</span>
                            <select
                                value={attendanceDayFilter}
                                onChange={(event) =>
                                    updateAttendanceDayFilter(
                                        event.target.value,
                                    )
                                }
                                className="min-w-0 bg-transparent outline-none"
                                aria-label="Filter dashboard by attendance day"
                            >
                                <option value="all">
                                    All event days (
                                    {availableAttendanceDays.length})
                                </option>
                                {availableAttendanceDays.map((date) => (
                                    <option key={date} value={date}>
                                        {formatAttendanceDay(date)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {statCards.map((card) => (
                        <button
                            key={card.key}
                            type="button"
                            onClick={() => {
                                if (card.key === 'participants') {
                                    router.visit('/participants');
                                }

                                if (card.key === 'checkedInParticipants') {
                                    openAttendanceDialog('checked-in');
                                }

                                if (card.key === 'notCheckedInParticipants') {
                                    openAttendanceDialog('not-checked-in');
                                }
                            }}
                            className="rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {card.key === 'participants' &&
                                    attendanceDayFilter === 'all'
                                        ? 'Expected Attendances'
                                        : card.title}
                                </p>
                                <card.icon className="size-4 text-muted-foreground" />
                            </div>
                            <p className="mt-3 text-2xl font-semibold tracking-tight">
                                {filteredStats[card.key].toLocaleString()}
                            </p>
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] 2xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
                    <section className="min-w-0 rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-semibold">
                                    Registration Trend
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Daily participant registrations for the last
                                    14 days.
                                </p>
                            </div>
                        </div>
                        {registrationTrend.length > 0 ? (
                            <LineChart data={registrationTrend} />
                        ) : (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No registration trend available.
                            </div>
                        )}
                    </section>

                    <section className="min-w-0 rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-center gap-2">
                                <UserCheck className="size-4 text-muted-foreground" />
                                <div>
                                    <h2 className="text-base font-semibold">
                                        Attendance Status
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Checked-in vs missing check-ins for the
                                        selected attendance day.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => void downloadAttendanceExcel()}
                                disabled={isExportingAttendance}
                                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                            >
                                <Download className="size-4" />
                                {isExportingAttendance
                                    ? 'Preparing...'
                                    : 'Download Excel'}
                            </button>
                        </div>
                        <DoughnutChart
                            data={filteredAttendanceStatus}
                            onSelectStatus={openAttendanceDialog}
                        />
                    </section>
                </div>

                <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="border-b p-4">
                        <h2 className="text-base font-semibold">
                            Attendance Per Event Day
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Each event date is measured independently, including
                            registered, checked-in, and missing participants.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <Table className="min-w-[760px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead className="w-32 text-right">
                                        Registered
                                    </TableHead>
                                    <TableHead className="w-32 text-right">
                                        Checked In
                                    </TableHead>
                                    <TableHead className="w-36 text-right">
                                        Not Checked In
                                    </TableHead>
                                    <TableHead className="w-40">
                                        Attendance Rate
                                    </TableHead>
                                    <TableHead className="w-28">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dailyAttendanceRows.length > 0 ? (
                                    dailyAttendanceRows.map((attendance) => (
                                        <TableRow
                                            key={`${attendance.event_id}:${attendance.date}`}
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {attendance.event_name}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {attendance.participants_count.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-emerald-700 dark:text-emerald-300">
                                                {attendance.checked_in_count.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-amber-700 dark:text-amber-300">
                                                {attendance.not_checked_in_count.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 flex-1 rounded-full bg-muted">
                                                        <div
                                                            className="h-full rounded-full bg-[#0038A8]"
                                                            style={{
                                                                width: percent(
                                                                    attendance.attendance_rate,
                                                                ),
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="w-10 text-right text-xs font-medium">
                                                        {percent(
                                                            attendance.attendance_rate,
                                                        )}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {formatAttendanceDay(
                                                    attendance.date,
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-sm text-muted-foreground"
                                        >
                                            No event attendance data found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </section>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="border-b p-4">
                            <div>
                                <h2 className="text-base font-semibold">
                                    Recent Registrations
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Latest participants added to CERS.
                                </p>
                            </div>
                        </div>

                        {/* Mobile card layout */}
                        <div className="space-y-3 p-3 md:hidden">
                            {filteredRecentParticipants.length > 0 ? (
                                filteredRecentParticipants.map(
                                    (participant) => (
                                        <article
                                            key={participant.id}
                                            className="rounded-lg border bg-background p-3 text-sm shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-foreground">
                                                        {participant.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs break-all text-muted-foreground">
                                                        {participant.email}
                                                    </p>
                                                </div>

                                                <Badge
                                                    variant="outline"
                                                    className="shrink-0"
                                                >
                                                    {formatLookupLabel(
                                                        participant.participant_type,
                                                        participantTypeLabelsBySlug,
                                                    )}
                                                </Badge>
                                            </div>

                                            <div className="mt-3 space-y-2 text-xs">
                                                <div>
                                                    <p className="font-medium text-muted-foreground">
                                                        Organization
                                                    </p>
                                                    <p className="mt-0.5 break-words text-foreground">
                                                        {participant.organization ??
                                                            '-'}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="font-medium text-muted-foreground">
                                                            Event
                                                        </p>
                                                        <p className="mt-0.5 break-words text-foreground">
                                                            {formatLabel(
                                                                participant.event_name,
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="font-medium text-muted-foreground">
                                                            Date
                                                        </p>
                                                        <p className="mt-0.5 text-foreground">
                                                            {formatDate(
                                                                participant.created_at,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    ),
                                )
                            ) : (
                                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No registrations found for this event.
                                </div>
                            )}
                        </div>

                        {/* Desktop table layout */}
                        <div className="hidden overflow-x-auto md:block">
                            <Table className="min-w-[1050px] table-fixed">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[28%]">
                                            Participant
                                        </TableHead>
                                        <TableHead className="w-[29%]">
                                            Organization
                                        </TableHead>
                                        <TableHead className="w-[12%]">
                                            Type
                                        </TableHead>
                                        <TableHead className="w-[16%]">
                                            Event
                                        </TableHead>
                                        <TableHead className="w-[15%]">
                                            Date
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredRecentParticipants.length > 0 ? (
                                        filteredRecentParticipants.map(
                                            (participant) => (
                                                <TableRow key={participant.id}>
                                                    <TableCell className="align-top">
                                                        <div className="min-w-0">
                                                            <p className="leading-5 font-medium break-words whitespace-normal text-foreground">
                                                                {
                                                                    participant.name
                                                                }
                                                            </p>
                                                            <p className="mt-0.5 text-xs leading-4 break-all text-muted-foreground">
                                                                {
                                                                    participant.email
                                                                }
                                                            </p>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="align-top leading-5 break-words whitespace-normal">
                                                        {participant.organization ??
                                                            '-'}
                                                    </TableCell>

                                                    <TableCell className="align-top">
                                                        <Badge
                                                            variant="outline"
                                                            className="text-center break-words whitespace-normal"
                                                        >
                                                            {formatLookupLabel(
                                                                participant.participant_type,
                                                                participantTypeLabelsBySlug,
                                                            )}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="align-top leading-5 break-words whitespace-normal">
                                                        {formatLabel(
                                                            participant.event_name,
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="align-top text-sm leading-5 break-words whitespace-normal">
                                                        {formatDate(
                                                            participant.created_at,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-24 text-center text-sm text-muted-foreground"
                                            >
                                                No registrations found for this
                                                event.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </section>

                    <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <CalendarDays className="size-4 text-muted-foreground" />
                            <h2 className="text-base font-semibold">
                                Event Summary
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {eventSummary.length > 0 ? (
                                eventSummary.map((event) => {
                                    const width = `${Math.max(
                                        8,
                                        (event.participants_count /
                                            maxEventParticipants) *
                                            100,
                                    )}%`;

                                    return (
                                        <div
                                            key={event.event_name}
                                            className="space-y-2"
                                        >
                                            <div className="flex items-center justify-between gap-3 text-sm">
                                                <p className="font-medium">
                                                    {formatLabel(
                                                        event.event_name,
                                                    )}
                                                </p>
                                                <span className="text-muted-foreground">
                                                    {event.participants_count.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-[#0038A8]"
                                                    style={{ width }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No event registrations found.
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <TooltipProvider>
                    <section className="min-w-0 overflow-visible rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
                        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                            <div className="flex items-start gap-2">
                                <Filter className="mt-1 size-4 shrink-0 text-muted-foreground" />
                                <div>
                                    <h2 className="text-base font-semibold">
                                        Participant Statistics
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Search each filter to narrow the charts
                                        by province, municipality, sex,
                                        participant type, and school or
                                        organization.
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[auto_auto] lg:justify-end">
                                <div className="rounded-lg border bg-background px-4 py-3 text-sm shadow-sm sm:text-right">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Matching Participants
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                                        {filteredStatisticParticipants.length.toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetStatisticFilters}
                                    disabled={!statisticFiltersActive}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:self-end"
                                >
                                    <RotateCcw className="size-3.5" />
                                    Reset filters
                                </button>
                            </div>
                        </div>

                        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <SearchableStatisticFilter
                                label="Province"
                                description="Start here to focus the location charts."
                                value={statisticFilters.provinceId}
                                onChange={(value) =>
                                    updateStatisticFilter('provinceId', value)
                                }
                                options={provinceFilterOptions}
                                searchPlaceholder="Search provinces..."
                            />

                            <SearchableStatisticFilter
                                label="Municipality"
                                description="Updates when a province is selected."
                                value={statisticFilters.municipalityId}
                                onChange={(value) =>
                                    updateStatisticFilter(
                                        'municipalityId',
                                        value,
                                    )
                                }
                                options={municipalityFilterOptions}
                                searchPlaceholder="Search municipalities..."
                            />

                            <SearchableStatisticFilter
                                label="Sex"
                                description="Compare participant counts by sex."
                                value={statisticFilters.sex}
                                onChange={(value) =>
                                    updateStatisticFilter('sex', value)
                                }
                                options={sexFilterOptionItems}
                                searchPlaceholder="Search sex values..."
                            />

                            <SearchableStatisticFilter
                                label="Participant Type"
                                description="Focus on one registration category."
                                value={statisticFilters.participantType}
                                onChange={(value) =>
                                    updateStatisticFilter(
                                        'participantType',
                                        value,
                                    )
                                }
                                options={participantTypeFilterOptions}
                                searchPlaceholder="Search participant types..."
                            />

                            <SearchableStatisticFilter
                                label="School / Organization"
                                description="Filter to one school or partner."
                                value={statisticFilters.organizationId}
                                onChange={(value) =>
                                    updateStatisticFilter(
                                        'organizationId',
                                        value,
                                    )
                                }
                                options={organizationFilterOptions}
                                searchPlaceholder="Search schools or organizations..."
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <StatisticChart
                                title="Province Distribution"
                                description="Shows where registered participants are coming from."
                                icon={MapPin}
                                items={provinceBreakdown}
                                emptyText="No province statistics found."
                                chartType="bar"
                            />
                            <StatisticChart
                                title="Municipality Distribution"
                                description="City and municipality counts within the current filters."
                                icon={MapPin}
                                items={municipalityBreakdown}
                                emptyText="No municipality statistics found."
                                chartType="line"
                            />
                            <StatisticChart
                                title="Sex Split"
                                description="Participant counts grouped by recorded sex."
                                icon={Users}
                                items={sexBreakdown}
                                emptyText="No sex statistics found."
                                chartType="pie"
                            />
                            <StatisticChart
                                title="Participant Types"
                                description="Counts by the category selected during registration."
                                icon={GraduationCap}
                                items={participantTypeBreakdown}
                                emptyText="No participant type statistics found."
                                chartType="pie"
                            />
                            <StatisticChart
                                title="Schools / Organizations"
                                description="Schools and partner organizations represented in the list."
                                icon={Building2}
                                items={organizationBreakdown}
                                emptyText="No school or organization statistics found."
                                chartType="bar"
                            />
                        </div>
                    </section>
                </TooltipProvider>
            </div>

            <Dialog
                open={selectedAttendanceStatus !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeAttendanceDialog();
                    }
                }}
            >
                <DialogContent
                    className="grid h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3 overflow-hidden p-3 sm:h-[88vh] sm:max-h-[88vh] sm:w-[92vw] sm:!max-w-3xl sm:p-4 lg:!max-w-4xl xl:!max-w-5xl"
                    onPointerDownOutside={preventDialogOutsideClose}
                    onInteractOutside={preventDialogInteractOutside}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="text-base sm:text-lg">
                            {selectedAttendanceTitle}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5 sm:text-sm">
                            {selectedAttendanceStatus === 'checked-in'
                                ? 'Participants checked in for the selected event day, including scan date and time.'
                                : 'Registered participants who have not checked in for the selected event day.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={attendanceSearch}
                                onChange={(event) =>
                                    updateAttendanceSearch(event.target.value)
                                }
                                placeholder="Search by name, email, or participant ID..."
                                className="pl-9"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-right">
                            Showing{' '}
                            <span className="font-medium text-foreground">
                                {selectedAttendanceParticipants.length.toLocaleString()}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-foreground">
                                {selectedAttendanceRawParticipants.length.toLocaleString()}
                            </span>{' '}
                            participants
                        </p>
                    </div>

                    <div className="min-h-0 overflow-hidden rounded-lg border">
                        <div className="hidden h-full overflow-auto md:block">
                            <Table className="min-w-[860px]">
                                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                    <TableRow>
                                        <TableHead>Participant</TableHead>
                                        <TableHead className="w-40">
                                            Attendance Day
                                        </TableHead>
                                        {selectedAttendanceStatus ===
                                        'checked-in' ? (
                                            <TableHead className="w-48">
                                                Scanned By
                                            </TableHead>
                                        ) : null}
                                        <TableHead className="w-56 text-right">
                                            {selectedAttendanceStatus ===
                                            'checked-in'
                                                ? 'Checked In At'
                                                : 'Registered At'}
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedAttendanceParticipants.length >
                                    0 ? (
                                        paginatedAttendanceParticipants.map(
                                            (participant) => (
                                                <TableRow
                                                    key={participant.row_key}
                                                >
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-foreground">
                                                                {
                                                                    participant.name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {participant.participant_id ??
                                                                    '-'}{' '}
                                                                ·{' '}
                                                                {
                                                                    participant.email
                                                                }
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatAttendanceDay(
                                                            participant.attendance_date,
                                                        )}
                                                    </TableCell>
                                                    {selectedAttendanceStatus ===
                                                    'checked-in' ? (
                                                        <>
                                                            <TableCell>
                                                                {participant.scanned_by ??
                                                                    '-'}
                                                            </TableCell>
                                                        </>
                                                    ) : null}
                                                    <TableCell className="text-right">
                                                        {formatDateTime(
                                                            selectedAttendanceStatus ===
                                                                'checked-in'
                                                                ? participant.checked_in_at
                                                                : participant.registered_at,
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={
                                                    selectedAttendanceStatus ===
                                                    'checked-in'
                                                        ? 4
                                                        : 3
                                                }
                                                className="h-24 text-center text-sm text-muted-foreground"
                                            >
                                                No participants found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="h-full space-y-2 overflow-y-auto bg-muted/20 p-2 md:hidden">
                            {paginatedAttendanceParticipants.length > 0 ? (
                                paginatedAttendanceParticipants.map(
                                    (participant) => (
                                        <AttendanceParticipantCard
                                            key={participant.row_key}
                                            participant={participant}
                                            selectedAttendanceStatus={
                                                selectedAttendanceStatus
                                            }
                                        />
                                    ),
                                )
                            ) : (
                                <div className="rounded-md border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">
                                    No participants found.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <span>Rows per page</span>
                            <select
                                value={attendancePageSize}
                                onChange={(event) =>
                                    updateAttendancePageSize(
                                        Number(event.target.value),
                                    )
                                }
                                className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
                            >
                                {attendancePageSizeOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <span className="text-center sm:text-right">
                                {selectedAttendanceParticipants.length > 0
                                    ? `${attendanceStartIndex + 1}-${Math.min(
                                          attendanceEndIndex,
                                          selectedAttendanceParticipants.length,
                                      ).toLocaleString()} of ${selectedAttendanceParticipants.length.toLocaleString()}`
                                    : '0 of 0'}
                            </span>
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAttendancePage((page) =>
                                            Math.max(1, page - 1),
                                        )
                                    }
                                    disabled={currentAttendancePage <= 1}
                                    className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                                >
                                    <ChevronLeft className="size-3.5" />
                                    Prev
                                </button>
                                <span className="min-w-20 text-center">
                                    Page{' '}
                                    {currentAttendancePage.toLocaleString()} of{' '}
                                    {attendanceTotalPages.toLocaleString()}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAttendancePage((page) =>
                                            Math.min(
                                                attendanceTotalPages,
                                                page + 1,
                                            ),
                                        )
                                    }
                                    disabled={
                                        currentAttendancePage >=
                                        attendanceTotalPages
                                    }
                                    className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="size-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
