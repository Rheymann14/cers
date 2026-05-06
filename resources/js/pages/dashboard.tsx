import { Head, router } from "@inertiajs/react";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboard } from "@/routes";

type Stats = {
  participants: number;
  checkedInParticipants: number;
  notCheckedInParticipants: number;
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
  participants_count: number;
  checked_in_count: number;
  not_checked_in_count: number;
  attendance_rate: number;
};

type AttendanceParticipant = {
  id: number;
  participant_id: string | null;
  name: string;
  email: string;
  organization: string | null;
  participant_type: string | null;
  event_name: string | null;
  event_slug: string | null;
  registered_at: string | null;
  checked_in_at: string | null;
};

type Props = {
  stats: Stats;
  recentParticipants: RecentParticipant[];
  eventSummary: EventSummary[];
  registrationTrend: RegistrationTrend[];
  attendanceStatus: AttendanceStatus[];
  eventAttendanceSummary: EventAttendanceSummary[];
  checkedInParticipants: AttendanceParticipant[];
  notCheckedInParticipants: AttendanceParticipant[];
};

const statCards = [
  {
    key: "participants",
    title: "Participants",
    icon: Users,
  },
  {
    key: "checkedInParticipants",
    title: "Checked In",
    icon: UserCheck,
  },
  {
    key: "notCheckedInParticipants",
    title: "Not Checked In",
    icon: Activity,
  },
] as const;

const attendancePageSizeOptions = [10, 25, 50, 100] as const;

const preventDialogOutsideClose: NonNullable<
  ComponentProps<typeof DialogContent>["onPointerDownOutside"]
> = (event) => {
  event.preventDefault();
};

const preventDialogInteractOutside: NonNullable<
  ComponentProps<typeof DialogContent>["onInteractOutside"]
> = (event) => {
  event.preventDefault();
};

function formatLabel(value: string | null): string {
  if (!value) {
    return "-";
  }

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatEventDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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
    .join(" ")
    .toLowerCase()
    .includes(query);
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
    const y = paddingTop + chartHeight - (item.count / maxValue) * chartHeight;

    return { ...item, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : "";

  return (
    <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily registration line chart"
        className="h-auto w-full min-w-[340px] sm:min-w-[560px]"
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
        {areaPath && <path d={areaPath} className="fill-blue-500/10" />}
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
            index === 0 || index === points.length - 1 || index % 3 === 0;

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
    </div>
  );
}

function DoughnutChart({
  data,
  onSelectStatus,
}: {
  data: AttendanceStatus[];
  onSelectStatus: (status: "checked-in" | "not-checked-in") => void;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const checkedIn =
    data.find((item) => item.label === "Checked In")?.count ?? 0;
  const notCheckedIn =
    data.find((item) => item.label === "Not Checked In")?.count ?? 0;
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
          onClick={() => onSelectStatus("checked-in")}
          className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#0038A8]" />
            <span className="text-sm font-medium">Checked In</span>
          </div>
          <span className="font-semibold">{checkedIn.toLocaleString()}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectStatus("not-checked-in")}
          className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-amber-500" />
            <span className="text-sm font-medium">Not Checked In</span>
          </div>
          <span className="font-semibold">{notCheckedIn.toLocaleString()}</span>
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
  selectedAttendanceStatus: "checked-in" | "not-checked-in" | null;
}) {
  return (
    <article className="rounded-lg border bg-card p-3 text-sm shadow-sm">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{participant.name}</p>
          <p className="mt-0.5 break-all text-xs text-muted-foreground">
            {participant.participant_id ?? "-"} · {participant.email}
          </p>
        </div>
        <div className="text-xs text-muted-foreground sm:text-right">
          <p className="font-medium text-foreground">
            {selectedAttendanceStatus === "checked-in"
              ? "Checked In At"
              : "Registered At"}
          </p>
          <p>
            {formatDateTime(
              selectedAttendanceStatus === "checked-in"
                ? participant.checked_in_at
                : participant.registered_at,
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard({
  stats,
  recentParticipants,
  eventSummary,
  registrationTrend,
  attendanceStatus,
  eventAttendanceSummary,
  checkedInParticipants,
  notCheckedInParticipants,
}: Props) {
  const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState<
    "checked-in" | "not-checked-in" | null
  >(null);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] =
    useState<(typeof attendancePageSizeOptions)[number]>(25);

  const selectedAttendanceRawParticipants =
    selectedAttendanceStatus === "checked-in"
      ? checkedInParticipants
      : notCheckedInParticipants;

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
  const currentAttendancePage = Math.min(attendancePage, attendanceTotalPages);
  const attendanceStartIndex = (currentAttendancePage - 1) * attendancePageSize;
  const attendanceEndIndex = attendanceStartIndex + attendancePageSize;
  const paginatedAttendanceParticipants = selectedAttendanceParticipants.slice(
    attendanceStartIndex,
    attendanceEndIndex,
  );

  const selectedAttendanceTitle =
    selectedAttendanceStatus === "checked-in"
      ? "Checked In Participants"
      : "Participants Not Checked In";

  const maxEventParticipants = Math.max(
    1,
    ...eventSummary.map((event) => event.participants_count),
  );

  function openAttendanceDialog(status: "checked-in" | "not-checked-in") {
    setAttendanceSearch("");
    setAttendancePage(1);
    setSelectedAttendanceStatus(status);
  }

  function closeAttendanceDialog() {
    setSelectedAttendanceStatus(null);
    setAttendanceSearch("");
    setAttendancePage(1);
  }

  function updateAttendanceSearch(value: string) {
    setAttendanceSearch(value);
    setAttendancePage(1);
  }

  function updateAttendancePageSize(value: number) {
    setAttendancePageSize(value as (typeof attendancePageSizeOptions)[number]);
    setAttendancePage(1);
  }

  return (
    <>
      <Head title="Dashboard" />

      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor participant registration, event attendance, and setup
            coverage.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                if (card.key === "participants") {
                  router.visit("/participants");
                }

                if (card.key === "checkedInParticipants") {
                  openAttendanceDialog("checked-in");
                }

                if (card.key === "notCheckedInParticipants") {
                  openAttendanceDialog("not-checked-in");
                }
              }}
              className="rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
            </button>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] 2xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
          <section className="min-w-0 rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Registration Trend</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Daily participant registrations for the last 14 days.
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
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="size-4 text-muted-foreground" />
              <div>
                <h2 className="text-base font-semibold">Attendance Status</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Checked-in vs not checked-in participants.
                </p>
              </div>
            </div>
            <DoughnutChart
              data={attendanceStatus}
              onSelectStatus={openAttendanceDialog}
            />
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="border-b p-4">
            <h2 className="text-base font-semibold">Attendance Per Event</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Shows registered participants, successful check-ins, and
              participants who did not scan or check in.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="w-32 text-right">Registered</TableHead>
                  <TableHead className="w-32 text-right">Checked In</TableHead>
                  <TableHead className="w-36 text-right">
                    Not Checked In
                  </TableHead>
                  <TableHead className="w-40">Attendance Rate</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventAttendanceSummary.length > 0 ? (
                  eventAttendanceSummary.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {event.name}
                          </p>
                          {/* <p className="text-xs text-muted-foreground">
                            {event.slug}
                          </p> */}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {event.participants_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-emerald-700 dark:text-emerald-300">
                        {event.checked_in_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-amber-700 dark:text-amber-300">
                        {event.not_checked_in_count.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-[#0038A8]"
                              style={{ width: percent(event.attendance_rate) }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-medium">
                            {percent(event.attendance_rate)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatEventDate(event.starts_at)}</TableCell>
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
              <h2 className="text-base font-semibold">Recent Registrations</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest participants added to CERS.
              </p>
            </div>

            {/* Mobile card layout */}
            <div className="space-y-3 p-3 md:hidden">
              {recentParticipants.length > 0 ? (
                recentParticipants.map((participant) => (
                  <article
                    key={participant.id}
                    className="rounded-lg border bg-background p-3 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          {participant.name}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-muted-foreground">
                          {participant.email}
                        </p>
                      </div>

                      <Badge variant="outline" className="shrink-0">
                        {formatLabel(participant.participant_type)}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div>
                        <p className="font-medium text-muted-foreground">
                          Organization
                        </p>
                        <p className="mt-0.5 break-words text-foreground">
                          {participant.organization ?? "-"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="font-medium text-muted-foreground">Event</p>
                          <p className="mt-0.5 break-words text-foreground">
                            {formatLabel(participant.event_name)}
                          </p>
                        </div>

                        <div>
                          <p className="font-medium text-muted-foreground">Date</p>
                          <p className="mt-0.5 text-foreground">
                            {formatDate(participant.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No registrations found.
                </div>
              )}
            </div>

            {/* Desktop table layout */}
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[1050px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28%]">Participant</TableHead>
                    <TableHead className="w-[29%]">Organization</TableHead>
                    <TableHead className="w-[12%]">Type</TableHead>
                    <TableHead className="w-[16%]">Event</TableHead>
                    <TableHead className="w-[15%]">Date</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recentParticipants.length > 0 ? (
                    recentParticipants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="align-top">
                          <div className="min-w-0">
                            <p className="whitespace-normal break-words font-medium leading-5 text-foreground">
                              {participant.name}
                            </p>
                            <p className="mt-0.5 break-all text-xs leading-4 text-muted-foreground">
                              {participant.email}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-normal break-words align-top leading-5">
                          {participant.organization ?? "-"}
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge
                            variant="outline"
                            className="whitespace-normal break-words text-center"
                          >
                            {formatLabel(participant.participant_type)}
                          </Badge>
                        </TableCell>

                        <TableCell className="whitespace-normal break-words align-top leading-5">
                          {formatLabel(participant.event_name)}
                        </TableCell>

                        <TableCell className="whitespace-normal break-words align-top text-sm leading-5">
                          {formatDate(participant.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
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
              <h2 className="text-base font-semibold">Event Summary</h2>
            </div>
            <div className="space-y-4">
              {eventSummary.length > 0 ? (
                eventSummary.map((event) => {
                  const width = `${Math.max(
                    8,
                    (event.participants_count / maxEventParticipants) * 100,
                  )}%`;

                  return (
                    <div key={event.event_name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <p className="font-medium">
                          {formatLabel(event.event_name)}
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
              {selectedAttendanceStatus === "checked-in"
                ? "Participants who already scanned or were manually checked in, including attendance date and time."
                : "Registered event participants who have not scanned or checked in yet."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={attendanceSearch}
                onChange={(event) => updateAttendanceSearch(event.target.value)}
                placeholder="Search by name, email, or participant ID..."
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground sm:text-right">
              Showing{" "}
              <span className="font-medium text-foreground">
                {selectedAttendanceParticipants.length.toLocaleString()}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {selectedAttendanceRawParticipants.length.toLocaleString()}
              </span>{" "}
              participants
            </p>
          </div>

          <div className="min-h-0 overflow-hidden rounded-lg border">
            <div className="hidden h-full overflow-auto md:block">
              <Table className="min-w-[720px]">
                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead className="w-56 text-right">
                      {selectedAttendanceStatus === "checked-in"
                        ? "Checked In At"
                        : "Registered At"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttendanceParticipants.length > 0 ? (
                    paginatedAttendanceParticipants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {participant.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {participant.participant_id ?? "-"} ·{" "}
                              {participant.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDateTime(
                            selectedAttendanceStatus === "checked-in"
                              ? participant.checked_in_at
                              : participant.registered_at,
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={2}
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
                paginatedAttendanceParticipants.map((participant) => (
                  <AttendanceParticipantCard
                    key={participant.id}
                    participant={participant}
                    selectedAttendanceStatus={selectedAttendanceStatus}
                  />
                ))
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
                  updateAttendancePageSize(Number(event.target.value))
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
                  : "0 of 0"}
              </span>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setAttendancePage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentAttendancePage <= 1}
                  className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  <ChevronLeft className="size-3.5" />
                  Prev
                </button>
                <span className="min-w-20 text-center">
                  Page {currentAttendancePage.toLocaleString()} of{" "}
                  {attendanceTotalPages.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAttendancePage((page) =>
                      Math.min(attendanceTotalPages, page + 1),
                    )
                  }
                  disabled={currentAttendancePage >= attendanceTotalPages}
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
      title: "Dashboard",
      href: dashboard(),
    },
  ],
};
