import { Head } from '@inertiajs/react';
import {
    CalendarDays,
    GraduationCap,
    School,
    UserRoundX,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { dashboard } from '@/routes';

type Stats = {
    participants: number;
    deletedParticipants: number;
    organizations: number;
    participantTypes: number;
};

type RecentParticipant = {
    id: number;
    participant_id: string | null;
    name: string;
    email: string;
    organization: string | null;
    participant_type: string | null;
    event_name: string | null;
    created_at: string;
};

type EventSummary = {
    event_name: string;
    participants_count: number;
};

type Props = {
    stats: Stats;
    recentParticipants: RecentParticipant[];
    eventSummary: EventSummary[];
};

const statCards = [
    {
        key: 'participants',
        title: 'Participants',
        icon: Users,
    },
    {
        key: 'organizations',
        title: 'Active Organizations',
        icon: School,
    },
    {
        key: 'participantTypes',
        title: 'Active Types',
        icon: GraduationCap,
    },
    {
        key: 'deletedParticipants',
        title: 'Deleted Users',
        icon: UserRoundX,
    },
] as const;

function formatLabel(value: string | null): string {
    if (!value) {
        return '-';
    }

    return value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}

export default function Dashboard({
    stats,
    recentParticipants,
    eventSummary,
}: Props) {
    const maxEventParticipants = Math.max(
        1,
        ...eventSummary.map((event) => event.participants_count),
    );

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Monitor participant registration activity and setup
                        coverage.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map((card) => (
                        <div
                            key={card.key}
                            className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </p>
                                <card.icon className="size-4 text-muted-foreground" />
                            </div>
                            <p className="mt-3 text-2xl font-semibold tracking-tight">
                                {stats[card.key].toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                    <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="border-b p-4">
                            <h2 className="text-base font-semibold">
                                Recent Registrations
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Latest participants added to CERS.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Participant</TableHead>
                                        <TableHead>Organization</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead className="w-28">
                                            Date
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentParticipants.length > 0 ? (
                                        recentParticipants.map(
                                            (participant) => (
                                                <TableRow key={participant.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-foreground">
                                                                {
                                                                    participant.name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    participant.email
                                                                }
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {participant.organization ??
                                                            '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {formatLabel(
                                                                participant.participant_type,
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatLabel(
                                                            participant.event_name,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
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
                                                No registrations found.
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
            </div>
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
