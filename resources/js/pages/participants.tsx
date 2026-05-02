import { Head, useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    AlertTriangle,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    KeyRound,
    MoreHorizontal,
    Pencil,
    RotateCcw,
    Search,
    Save,
    Trash2,
    UserX,
    X,
} from 'lucide-react';
import type { ComponentProps, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { participants as participantsRoute } from '@/routes';

type Participant = {
    id: number;
    name: string;
    given_name: string | null;
    middle_name: string | null;
    surname: string | null;
    email: string;
    avatar: string | null;
    phone: string | null;
    organization: string | null;
    participant_type: string | null;
    sex: string | null;
    event_name: string | null;
    created_at: string;
    deleted_at: string | null;
};

type Props = {
    participants: Participant[];
    deletedParticipants: Participant[];
};

type SortKey =
    | 'name'
    | 'email'
    | 'organization'
    | 'participant_type'
    | 'sex'
    | 'event_name'
    | 'created_at';

type SortDirection = 'asc' | 'desc';

type Option = {
    value: string;
    label: string;
};

type ParticipantFormData = {
    given_name: string;
    middle_name: string;
    surname: string;
    email: string;
    phone: string;
    organization: string;
    participant_type: string;
    sex: string;
    event_name: string;
};

const columns: {
    key: SortKey;
    label: string;
    className?: string;
}[] = [
    { key: 'name', label: 'Participant' },
    { key: 'email', label: 'Contact' },
    { key: 'organization', label: 'Org' },
    { key: 'participant_type', label: 'Type', className: 'w-24' },
    { key: 'sex', label: 'Sex', className: 'w-20' },
    { key: 'event_name', label: 'Event', className: 'w-36' },
    { key: 'created_at', label: 'Date', className: 'w-28' },
];

const pageSizeOptions = [5, 10, 25];

const participantTypeOptions: Option[] = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'staff', label: 'Staff' },
    { value: 'guest', label: 'Guest' },
];

const sexOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
];

const eventOptions: Option[] = [
    {
        value: 'ched-regional-orientation',
        label: 'CHED Regional Orientation',
    },
    {
        value: 'higher-education-summit',
        label: 'Higher Education Summit',
    },
    {
        value: 'faculty-development-workshop',
        label: 'Faculty Development Workshop',
    },
];

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

function getOptionLabel(options: Option[], value: string | null): string {
    return options.find((option) => option.value === value)?.label ?? '-';
}

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

function SearchableOptionField({
    id,
    label,
    value,
    options,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    error,
    onValueChange,
}: {
    id: string;
    label: string;
    value: string;
    options: Option[];
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
    error?: string;
    onValueChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selectedOption = options.find((option) => option.value === value);

    return (
        <div className="space-y-2">
            <Label id={`${id}_label`}>{label}</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-labelledby={`${id}_label`}
                        aria-expanded={open}
                        aria-invalid={!!error}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selectedOption && 'text-muted-foreground',
                        )}
                    >
                        <span className="truncate">
                            {selectedOption?.label ?? placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                >
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList>
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                            onValueChange(option.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 size-4',
                                                value === option.value
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        {option.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <InputError message={error} />
        </div>
    );
}

function ParticipantActions({
    participant,
    onEdit,
    onDelete,
    onResetPassword,
}: {
    participant: Participant;
    onEdit: (participant: Participant) => void;
    onDelete: (participant: Participant) => void;
    onResetPassword: (participant: Participant) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Open actions for ${participant.name}`}
                    className="size-8"
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem onSelect={() => onEdit(participant)}>
                    <Pencil className="size-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => onResetPassword(participant)}
                    className="text-amber-600 focus:text-amber-700 dark:text-amber-400 dark:focus:text-amber-300 [&_svg]:!text-amber-500"
                >
                    <KeyRound className="size-4" />
                    Reset password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onDelete(participant)}
                >
                    <Trash2 className="size-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function Participants({
    participants,
    deletedParticipants,
}: Props) {
    const getInitials = useInitials();
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [editingParticipant, setEditingParticipant] =
        useState<Participant | null>(null);
    const [deletingParticipant, setDeletingParticipant] =
        useState<Participant | null>(null);
    const [resettingPasswordParticipant, setResettingPasswordParticipant] =
        useState<Participant | null>(null);
    const [deletedDialogOpen, setDeletedDialogOpen] = useState(false);
    const {
        data,
        setData,
        patch: patchParticipant,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm<ParticipantFormData>({
        given_name: '',
        middle_name: '',
        surname: '',
        email: '',
        phone: '',
        organization: '',
        participant_type: '',
        sex: '',
        event_name: '',
    });
    const { delete: destroyParticipant, processing: deleting } = useForm({});
    const { post: postPasswordReset, processing: resettingPassword } = useForm(
        {},
    );
    const { patch: restoreParticipant, processing: restoring } = useForm({});

    const filteredParticipants = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        const filtered = normalizedSearch
            ? participants.filter((participant) =>
                  [
                      participant.name,
                      participant.email,
                      participant.phone,
                      participant.organization,
                      participant.participant_type,
                      participant.sex,
                      participant.event_name,
                  ]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase()
                      .includes(normalizedSearch),
              )
            : participants;

        return [...filtered].sort((a, b) => {
            const aValue = a[sortKey] ?? '';
            const bValue = b[sortKey] ?? '';

            if (sortKey === 'created_at') {
                const comparison =
                    new Date(aValue).getTime() - new Date(bValue).getTime();

                return sortDirection === 'asc' ? comparison : -comparison;
            }

            const comparison = String(aValue).localeCompare(String(bValue));

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [participants, search, sortDirection, sortKey]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredParticipants.length / pageSize),
    );
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageParticipants = filteredParticipants.slice(
        startIndex,
        startIndex + pageSize,
    );

    function updateSort(key: SortKey) {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            setPage(1);

            return;
        }

        setSortKey(key);
        setSortDirection('asc');
        setPage(1);
    }

    function updateSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    function updatePageSize(value: number) {
        setPageSize(value);
        setPage(1);
    }

    function openEditDialog(participant: Participant) {
        setEditingParticipant(participant);
        clearErrors();
        setData({
            given_name: participant.given_name ?? '',
            middle_name: participant.middle_name ?? '',
            surname: participant.surname ?? '',
            email: participant.email,
            phone: participant.phone ?? '',
            organization: participant.organization ?? '',
            participant_type: participant.participant_type ?? '',
            sex: participant.sex ?? '',
            event_name: participant.event_name ?? '',
        });
    }

    function closeEditDialog() {
        if (processing) {
            return;
        }

        setEditingParticipant(null);
        clearErrors();
        reset();
    }

    function submitEdit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!editingParticipant) {
            return;
        }

        patchParticipant(`/participants/${editingParticipant.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingParticipant(null);
                clearErrors();
                reset();
            },
            onError: () => {
                toast.error('Please review the highlighted fields.');
            },
        });
    }

    function closeDeleteDialog() {
        if (deleting) {
            return;
        }

        setDeletingParticipant(null);
    }

    function submitDelete() {
        if (!deletingParticipant) {
            return;
        }

        destroyParticipant(`/participants/${deletingParticipant.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingParticipant(null);
            },
            onError: () => {
                toast.error('Unable to delete participant.');
            },
        });
    }

    function submitRestore(participant: Participant) {
        restoreParticipant(`/participants/${participant.id}/restore`, {
            preserveScroll: true,
            onError: () => {
                toast.error('Unable to restore participant.');
            },
        });
    }

    function closeResetPasswordDialog() {
        if (resettingPassword) {
            return;
        }

        setResettingPasswordParticipant(null);
    }

    function submitPasswordReset() {
        if (!resettingPasswordParticipant) {
            return;
        }

        postPasswordReset(
            `/participants/${resettingPasswordParticipant.id}/password-reset`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResettingPasswordParticipant(null);
                    toast.success('Participant password reset to cers2026.');
                },
                onError: () => {
                    toast.error(
                        'Validation error. Unable to reset participant password.',
                    );
                },
            },
        );
    }

    return (
        <>
            <Head title="Participants" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        Participants
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Registered participant details from event registration.
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
                                placeholder="Search participants..."
                                className="pl-9"
                            />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-[1fr_auto] md:flex md:items-center">
                            <div className="grid grid-cols-[1fr_auto] gap-2 md:hidden">
                                <select
                                    value={sortKey}
                                    onChange={(event) => {
                                        setSortKey(
                                            event.target.value as SortKey,
                                        );
                                        setPage(1);
                                    }}
                                    aria-label="Sort participants by"
                                    className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {columns.map((column) => (
                                        <option
                                            key={column.key}
                                            value={column.key}
                                        >
                                            Sort by {column.label}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                                    onClick={() => {
                                        setSortDirection(
                                            sortDirection === 'asc'
                                                ? 'desc'
                                                : 'asc',
                                        );
                                        setPage(1);
                                    }}
                                >
                                    {sortDirection === 'asc' ? (
                                        <ArrowUp className="size-4" />
                                    ) : (
                                        <ArrowDown className="size-4" />
                                    )}
                                </Button>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeletedDialogOpen(true)}
                                    className="h-8 justify-center px-2 text-xs"
                                >
                                    <UserX className="size-3.5" />
                                    Deleted
                                    {deletedParticipants.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-0.5 px-1.5 py-0 text-[10px]"
                                        >
                                            {deletedParticipants.length}
                                        </Badge>
                                    )}
                                </Button>
                                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground sm:justify-end">
                                    <span>Rows</span>
                                    <select
                                        value={pageSize}
                                        onChange={(event) =>
                                            updatePageSize(
                                                Number(event.target.value),
                                            )
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
                        </div>
                    </div>

                    <div className="divide-y md:hidden">
                        {pageParticipants.length > 0 ? (
                            pageParticipants.map((participant) => (
                                <article
                                    key={participant.id}
                                    className="p-3 sm:p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar className="size-10">
                                            <AvatarImage
                                                src={
                                                    participant.avatar ??
                                                    undefined
                                                }
                                                alt={participant.name}
                                            />
                                            <AvatarFallback className="bg-[#eef5ff] text-xs font-semibold text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300">
                                                {getInitials(participant.name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h2 className="truncate text-sm font-semibold text-foreground">
                                                        {participant.name}
                                                    </h2>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {participant.email}
                                                    </p>
                                                </div>
                                                <ParticipantActions
                                                    participant={participant}
                                                    onEdit={openEditDialog}
                                                    onDelete={
                                                        setDeletingParticipant
                                                    }
                                                    onResetPassword={
                                                        setResettingPasswordParticipant
                                                    }
                                                />
                                            </div>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className="max-w-full"
                                                >
                                                    {getOptionLabel(
                                                        participantTypeOptions,
                                                        participant.participant_type,
                                                    )}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="max-w-full"
                                                >
                                                    {formatLabel(
                                                        participant.sex,
                                                    )}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="max-w-full"
                                                >
                                                    {formatDate(
                                                        participant.created_at,
                                                    )}
                                                </Badge>
                                            </div>

                                            <dl className="mt-3 grid gap-2 text-xs">
                                                <div className="min-w-0">
                                                    <dt className="font-medium text-muted-foreground">
                                                        Event
                                                    </dt>
                                                    <dd className="mt-0.5 text-foreground">
                                                        {getOptionLabel(
                                                            eventOptions,
                                                            participant.event_name,
                                                        )}
                                                    </dd>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="min-w-0">
                                                        <dt className="font-medium text-muted-foreground">
                                                            Phone
                                                        </dt>
                                                        <dd className="mt-0.5 truncate text-foreground">
                                                            {participant.phone ??
                                                                '-'}
                                                        </dd>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <dt className="font-medium text-muted-foreground">
                                                            ID
                                                        </dt>
                                                        <dd className="mt-0.5 text-foreground">
                                                            #{participant.id}
                                                        </dd>
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <dt className="font-medium text-muted-foreground">
                                                        Organization
                                                    </dt>
                                                    <dd className="mt-0.5 line-clamp-2 text-foreground">
                                                        {participant.organization ??
                                                            '-'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="p-10 text-center text-sm text-muted-foreground">
                                No participants found.
                            </div>
                        )}
                    </div>

                    <Table className="hidden table-fixed text-xs md:table">
                        <TableHeader>
                            <TableRow className="bg-muted/45 hover:bg-muted/45">
                                {columns.map((column) => {
                                    const isActive = sortKey === column.key;
                                    const SortIcon = isActive
                                        ? sortDirection === 'asc'
                                            ? ArrowUp
                                            : ArrowDown
                                        : ArrowUpDown;

                                    return (
                                        <TableHead
                                            key={column.key}
                                            className={cn(
                                                'h-9 px-2 text-[11px] font-semibold text-muted-foreground uppercase',
                                                column.className,
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateSort(column.key)
                                                }
                                                className={cn(
                                                    'inline-flex min-w-0 items-center gap-1 rounded-sm text-left hover:text-foreground',
                                                    isActive
                                                        ? 'text-foreground'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {column.label}
                                                <SortIcon className="size-3.5" />
                                            </button>
                                        </TableHead>
                                    );
                                })}
                                <TableHead className="h-9 w-20 px-2 text-right text-[11px] font-semibold text-muted-foreground uppercase">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pageParticipants.length > 0 ? (
                                pageParticipants.map((participant) => (
                                    <TableRow
                                        key={participant.id}
                                        className="odd:bg-muted/[0.18]"
                                    >
                                        <TableCell className="px-2 py-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <Avatar className="size-8">
                                                    <AvatarImage
                                                        src={
                                                            participant.avatar ??
                                                            undefined
                                                        }
                                                        alt={participant.name}
                                                    />
                                                    <AvatarFallback className="bg-[#eef5ff] text-[11px] font-semibold text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300">
                                                        {getInitials(
                                                            participant.name,
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-foreground">
                                                        {participant.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        ID #{participant.id}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            <div className="min-w-0 leading-5">
                                                <p className="truncate font-medium text-foreground">
                                                    {participant.email}
                                                </p>
                                                <p className="truncate text-muted-foreground">
                                                    {participant.phone ?? '-'}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-2 py-2 leading-5 whitespace-normal">
                                            <span className="line-clamp-2">
                                                {participant.organization ??
                                                    '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-2 py-2">
                                            <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-[#0038A8] dark:bg-blue-950/40 dark:text-blue-300">
                                                {formatLabel(
                                                    participant.participant_type,
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-muted-foreground">
                                            {formatLabel(participant.sex)}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 leading-5 whitespace-normal">
                                            <span className="line-clamp-2">
                                                {formatLabel(
                                                    participant.event_name,
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-muted-foreground">
                                            {formatDate(participant.created_at)}
                                        </TableCell>
                                        <TableCell className="px-2 py-2 text-right">
                                            <ParticipantActions
                                                participant={participant}
                                                onEdit={openEditDialog}
                                                onDelete={
                                                    setDeletingParticipant
                                                }
                                                onResetPassword={
                                                    setResettingPasswordParticipant
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length + 1}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        No participants found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex flex-col gap-3 border-t p-3 text-sm text-muted-foreground sm:p-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-center md:text-left">
                            Showing{' '}
                            <span className="font-medium text-foreground">
                                {filteredParticipants.length === 0
                                    ? 0
                                    : startIndex + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium text-foreground">
                                {Math.min(
                                    startIndex + pageSize,
                                    filteredParticipants.length,
                                )}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-foreground">
                                {filteredParticipants.length}
                            </span>{' '}
                            participants
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
                </div>
            </div>
            <Dialog
                open={editingParticipant !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditDialog();
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100vh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-xl"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <Pencil className="size-4 text-muted-foreground" />
                            Edit participant
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Update the participant registration details.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitEdit} className="space-y-3">
                        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="given_name">Given name</Label>
                                <Input
                                    id="given_name"
                                    value={data.given_name}
                                    onChange={(event) =>
                                        setData(
                                            'given_name',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.given_name}
                                />
                                <InputError message={errors.given_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="middle_name">Middle name</Label>
                                <Input
                                    id="middle_name"
                                    value={data.middle_name}
                                    onChange={(event) =>
                                        setData(
                                            'middle_name',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.middle_name}
                                />
                                <InputError message={errors.middle_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="surname">Surname</Label>
                                <Input
                                    id="surname"
                                    value={data.surname}
                                    onChange={(event) =>
                                        setData('surname', event.target.value)
                                    }
                                    aria-invalid={!!errors.surname}
                                />
                                <InputError message={errors.surname} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(event) =>
                                        setData('email', event.target.value)
                                    }
                                    aria-invalid={!!errors.email}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(event) =>
                                        setData('phone', event.target.value)
                                    }
                                    aria-invalid={!!errors.phone}
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organization">
                                    Organization
                                </Label>
                                <Input
                                    id="organization"
                                    value={data.organization}
                                    onChange={(event) =>
                                        setData(
                                            'organization',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={!!errors.organization}
                                />
                                <InputError message={errors.organization} />
                            </div>

                            <SearchableOptionField
                                id="participant_type"
                                label="Participant type"
                                value={data.participant_type}
                                options={participantTypeOptions}
                                placeholder="Search and select type"
                                searchPlaceholder="Search participant type..."
                                emptyMessage="No type found."
                                error={errors.participant_type}
                                onValueChange={(value) =>
                                    setData('participant_type', value)
                                }
                            />

                            <div className="space-y-2">
                                <Label>Sex</Label>
                                <Select
                                    value={data.sex}
                                    onValueChange={(value) =>
                                        setData('sex', value)
                                    }
                                >
                                    <SelectTrigger
                                        className="w-full"
                                        aria-invalid={!!errors.sex}
                                    >
                                        <SelectValue placeholder="Select sex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sexOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.sex} />
                            </div>
                        </div>

                        <SearchableOptionField
                            id="event_name"
                            label="Event"
                            value={data.event_name}
                            options={eventOptions}
                            placeholder="Search and select event"
                            searchPlaceholder="Search event..."
                            emptyMessage="No event found."
                            error={errors.event_name}
                            onValueChange={(value) =>
                                setData('event_name', value)
                            }
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={closeEditDialog}
                                disabled={processing}
                            >
                                <X className="size-4" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={processing}
                            >
                                <Save className="size-4" />
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={deletingParticipant !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeDeleteDialog();
                    }
                }}
            >
                <DialogContent
                    className="gap-3 p-4 sm:max-w-sm"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <AlertTriangle className="size-4 text-destructive" />
                            Delete participant?
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Would you like to delete{' '}
                            <span className="font-medium text-foreground">
                                {deletingParticipant?.name}
                            </span>
                            ? This participant will move to deleted users and
                            can be restored later.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={closeDeleteDialog}
                            disabled={deleting}
                        >
                            <X className="size-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={submitDelete}
                            disabled={deleting}
                        >
                            <Trash2 className="size-3.5" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={resettingPasswordParticipant !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeResetPasswordDialog();
                    }
                }}
            >
                <DialogContent
                    className="gap-3 p-4 sm:max-w-sm"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <KeyRound className="size-4 text-amber-500" />
                            Reset password?
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Reset{' '}
                            <span className="font-medium text-foreground">
                                {resettingPasswordParticipant?.name}
                            </span>
                            's password to the default password{' '}
                            <span className="font-medium text-foreground">
                                cers2026
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={closeResetPasswordDialog}
                            disabled={resettingPassword}
                        >
                            <X className="size-3.5" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={submitPasswordReset}
                            disabled={resettingPassword}
                            className="bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500/30"
                        >
                            <KeyRound className="size-3.5" />
                            Reset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={deletedDialogOpen}
                onOpenChange={setDeletedDialogOpen}
            >
                <DialogContent
                    className="grid max-h-[min(calc(100vh-1rem),34rem)] gap-3 overflow-hidden p-4 sm:max-w-xl"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <UserX className="size-4 text-muted-foreground" />
                            Deleted users
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Restore participants that were previously deleted.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                        {deletedParticipants.length > 0 ? (
                            deletedParticipants.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Avatar className="size-8">
                                            <AvatarImage
                                                src={
                                                    participant.avatar ??
                                                    undefined
                                                }
                                                alt={participant.name}
                                            />
                                            <AvatarFallback className="bg-[#eef5ff] text-[11px] font-semibold text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300">
                                                {getInitials(participant.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-foreground">
                                                {participant.name}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {participant.email}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                Deleted{' '}
                                                {participant.deleted_at
                                                    ? formatDate(
                                                          participant.deleted_at,
                                                      )
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            submitRestore(participant)
                                        }
                                        disabled={restoring}
                                        className="h-8 w-full text-xs sm:w-auto"
                                    >
                                        <RotateCcw className="size-3.5" />
                                        Restore
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                                <UserX className="mx-auto mb-2 size-5 opacity-60" />
                                No deleted users found.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

Participants.layout = {
    breadcrumbs: [
        {
            title: 'Participants',
            href: participantsRoute(),
        },
    ],
};
