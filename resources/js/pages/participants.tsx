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
    ImagePlus,
    KeyRound,
    MoreHorizontal,
    Pencil,
    Plus,
    QrCode,
    RotateCcw,
    Search,
    Save,
    Trash2,
    ToggleLeft,
    ToggleRight,
    UserX,
    X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ComponentProps, FormEvent } from 'react';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useInitials } from '@/hooks/use-initials';
import { normalizeContactNumber } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { participants as participantsRoute } from '@/routes';

type Participant = {
    id: number;
    participant_id: string | null;
    name: string;
    given_name: string | null;
    middle_name: string | null;
    surname: string | null;
    email: string | null;
    avatar: string | null;
    phone: string | null;
    province: LocationOption | null;
    municipality: LocationOption | null;
    organization: string | null;
    participant_type: string | null;
    sex: string | null;
    event_name: string | null;
    is_active: boolean;
    created_by: CreatedByUser | null;
    created_at: string;
    deleted_at: string | null;
};

type CreatedByUser = {
    id: number;
    name: string;
};

type Props = {
    participants: Participant[];
    deletedParticipants: Participant[];
    organizations: Option[];
    participantTypes: Option[];
    events: Option[];
    addedByOptions: Option[];
    provinces: Option[];
};

type SortKey =
    | 'name'
    | 'email'
    | 'location'
    | 'organization'
    | 'participant_type'
    | 'sex'
    | 'event_name'
    | 'added_by'
    | 'created_at';

type SortDirection = 'asc' | 'desc';

type Option = {
    value: string;
    label: string;
    type?: string | null;
};

type LocationOption = {
    code: string;
    name: string;
};

type ParticipantFormData = {
    given_name: string;
    middle_name: string;
    surname: string;
    email: string;
    phone: string;
    province: string;
    municipality: string;
    organization: string;
    participant_type: string;
    sex: string;
    event_name: string;
};

type AddParticipantFormData = ParticipantFormData & {
    avatar: string;
};

const columns: {
    key: SortKey;
    label: string;
    className?: string;
}[] = [
    { key: 'name', label: 'Participant', className: 'w-64' },
    { key: 'email', label: 'Contact', className: 'w-48' },
    { key: 'location', label: 'Location', className: 'w-44' },
    { key: 'organization', label: 'Org', className: 'w-72' },
    { key: 'participant_type', label: 'Type', className: 'w-36' },
    { key: 'sex', label: 'Sex', className: 'w-20' },
    { key: 'event_name', label: 'Event', className: 'w-44' },
    { key: 'added_by', label: 'Added By', className: 'w-40' },
    { key: 'created_at', label: 'Date', className: 'w-40' },
];

const pageSizeOptions = [5, 10, 25];

const sexOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
];

const emptyParticipantFormData: ParticipantFormData = {
    given_name: '',
    middle_name: '',
    surname: '',
    email: '',
    phone: '',
    province: '',
    municipality: '',
    organization: '',
    participant_type: '',
    sex: '',
    event_name: '',
};

const emptyAddParticipantFormData: AddParticipantFormData = {
    ...emptyParticipantFormData,
    avatar: '',
};

const addParticipantSteps = ['Participant', 'Registration'] as const;

const participantTypeBadgeClassNames = [
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300',
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300',
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300',
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300',
    'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-300',
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/70 dark:bg-cyan-950/40 dark:text-cyan-300',
];

function getCenteredCircleCrop(width: number, height: number): Crop {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 80,
            },
            1,
            width,
            height,
        ),
        width,
        height,
    );
}

function getCroppedImageDataUrl(
    image: HTMLImageElement,
    crop: PixelCrop,
    mimeType: 'image/png' | 'image/jpeg',
) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const outputSize = 512;

    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext('2d');

    if (!context) {
        return '';
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        outputSize,
        outputSize,
    );

    return canvas.toDataURL(mimeType, 0.92);
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

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function getOptionLabel(options: Option[], value: string | null): string {
    return options.find((option) => option.value === value)?.label ?? '-';
}

function getLocationLabel(participant: Participant): string {
    return (
        [participant.province?.name, participant.municipality?.name]
            .filter(Boolean)
            .join(' / ') || '-'
    );
}

function getAddedByType(participant: Participant): 'Admin' | 'System' {
    return participant.created_by ? 'Admin' : 'System';
}

function getAddedByLabel(participant: Participant): string {
    return participant.created_by?.name ?? 'System';
}

function getAddedByFilterValue(participant: Participant): string {
    return participant.created_by
        ? `admin:${participant.created_by.id}`
        : 'system';
}

function getSortValue(participant: Participant, key: SortKey): string {
    if (key === 'location') {
        return getLocationLabel(participant);
    }

    if (key === 'added_by') {
        return `${getAddedByType(participant)} ${getAddedByLabel(participant)}`;
    }

    return String(participant[key] ?? '');
}

function getInitials(name: string) {
    return (
        name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || 'C'
    );
}

function getParticipantCardInitials(participant: Participant) {
    const initials = [participant.given_name, participant.surname]
        .map((value) => value?.trim()[0])
        .filter(Boolean)
        .join('')
        .toUpperCase();

    return initials || getInitials(participant.name);
}

function getParticipantTypeBadgeClassName(
    value: string | null,
    options: Option[],
): string {
    if (!value) {
        return 'border-border bg-muted text-muted-foreground';
    }

    const knownIndex = options.findIndex((option) => option.value === value);

    if (knownIndex >= 0) {
        return participantTypeBadgeClassNames[
            knownIndex % participantTypeBadgeClassNames.length
        ];
    }

    const colorIndex = [...value].reduce(
        (total, character) => total + character.charCodeAt(0),
        0,
    );

    return participantTypeBadgeClassNames[
        colorIndex % participantTypeBadgeClassNames.length
    ];
}

function hashString(value: string) {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36).toUpperCase();
}

function createQrToken({
    email,
    fullName,
    organization,
    participantId,
}: {
    email: string;
    fullName: string;
    organization: string;
    participantId: string;
}) {
    const fingerprint = hashString(
        ['CERS-VIRTUAL-ID', participantId, fullName, email, organization]
            .map((value) => value.trim().toLowerCase())
            .join('|'),
    );

    return `CERS:VID:1:${fingerprint}`;
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
    disabled = false,
    grouped = false,
    organizationOptions = [],
    schoolOptions = [],
    participantTypeGrouped = false,
    fourPsOptions = [],
    generalOptions = [],
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
    disabled?: boolean;
    grouped?: boolean;
    organizationOptions?: Option[];
    schoolOptions?: Option[];
    participantTypeGrouped?: boolean;
    fourPsOptions?: Option[];
    generalOptions?: Option[];
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
                        disabled={disabled}
                        className={cn(
                            'w-full justify-between font-normal',
                            !selectedOption && 'text-muted-foreground',
                            disabled &&
                                'cursor-not-allowed opacity-70 hover:bg-background',
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
                    className="z-[100] w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                >
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList className="h-[260px] max-h-[260px] overflow-y-auto overscroll-contain">
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                            {grouped ? (
                                <>
                                    {organizationOptions.length > 0 && (
                                        <CommandGroup heading="Organization">
                                            {organizationOptions.map(
                                                (option) => (
                                                    <CommandItem
                                                        key={option.value}
                                                        value={option.label}
                                                        onSelect={() => {
                                                            onValueChange(
                                                                option.value,
                                                            );
                                                            setOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 size-4',
                                                                value ===
                                                                    option.value
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        <span className="min-w-0 flex-1 break-words whitespace-normal">
                                                            {option.label}
                                                        </span>
                                                    </CommandItem>
                                                ),
                                            )}
                                        </CommandGroup>
                                    )}

                                    {schoolOptions.length > 0 && (
                                        <CommandGroup heading="School">
                                            {schoolOptions.map((option) => (
                                                <CommandItem
                                                    key={option.value}
                                                    value={option.label}
                                                    onSelect={() => {
                                                        onValueChange(
                                                            option.value,
                                                        );
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 size-4',
                                                            value ===
                                                                option.value
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    <span className="min-w-0 flex-1 break-words whitespace-normal">
                                                        {option.label}
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </>
                            ) : participantTypeGrouped ? (
                                <>
                                    {fourPsOptions.length > 0 && (
                                        <CommandGroup heading="4Ps">
                                            {fourPsOptions.map((option) => (
                                                <CommandItem
                                                    key={option.value}
                                                    value={option.label}
                                                    onSelect={() => {
                                                        onValueChange(
                                                            option.value,
                                                        );
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 size-4',
                                                            value ===
                                                                option.value
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    <span className="min-w-0 flex-1 break-words whitespace-normal">
                                                        {option.label}
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}

                                    {generalOptions.length > 0 && (
                                        <CommandGroup heading="General">
                                            {generalOptions.map((option) => (
                                                <CommandItem
                                                    key={option.value}
                                                    value={option.label}
                                                    onSelect={() => {
                                                        onValueChange(
                                                            option.value,
                                                        );
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 size-4',
                                                            value ===
                                                                option.value
                                                                ? 'opacity-100'
                                                                : 'opacity-0',
                                                        )}
                                                    />
                                                    <span className="min-w-0 flex-1 break-words whitespace-normal">
                                                        {option.label}
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </>
                            ) : (
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
                            )}
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
    onStatus,
    onResetPassword,
}: {
    participant: Participant;
    onEdit: (participant: Participant) => void;
    onDelete: (participant: Participant) => void;
    onStatus: (participant: Participant) => void;
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
                <DropdownMenuItem onSelect={() => onStatus(participant)}>
                    {participant.is_active ? (
                        <ToggleLeft className="size-4" />
                    ) : (
                        <ToggleRight className="size-4" />
                    )}
                    {participant.is_active ? 'Set inactive' : 'Set active'}
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

function UserStatusBadge({ active }: { active: boolean }) {
    return active ? (
        <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Active
        </Badge>
    ) : (
        <Badge className="border-transparent bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            Inactive
        </Badge>
    );
}

function ParticipantName({ name }: { name: string }) {
    return (
        <p className="font-semibold break-words whitespace-normal text-foreground">
            {name}
        </p>
    );
}

function ParticipantAvatarThumbnail({
    participant,
    getInitials,
    sizeClassName,
    fallbackClassName,
    onViewImage,
}: {
    participant: Participant;
    getInitials: (name: string) => string;
    sizeClassName: string;
    fallbackClassName: string;
    onViewImage: (participant: Participant) => void;
}) {
    const avatar = (
        <Avatar className={sizeClassName}>
            <AvatarImage
                src={participant.avatar ?? undefined}
                alt={participant.name}
            />
            <AvatarFallback className={fallbackClassName}>
                {getInitials(participant.name)}
            </AvatarFallback>
        </Avatar>
    );

    if (!participant.avatar) {
        return avatar;
    }

    return (
        <button
            type="button"
            aria-label={`View profile image for ${participant.name}`}
            onClick={() => onViewImage(participant)}
            className="rounded-full ring-offset-background transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
            {avatar}
        </button>
    );
}

function ParticipantIdButton({
    participant,
    onOpen,
}: {
    participant: Participant;
    onOpen: (participant: Participant) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onOpen(participant)}
            className="inline-block max-w-full rounded-sm align-bottom font-medium break-all text-[#0038A8] underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-blue-300"
        >
            {participant.participant_id ?? '-'}
        </button>
    );
}

function VirtualIdCard({ participant }: { participant: Participant }) {
    const displayName = participant.name || 'Participant';
    const displayId = participant.participant_id || 'Not assigned';
    const organization = participant.organization ?? '';
    const qrValue = createQrToken({
        email: participant.email ?? '',
        fullName: displayName,
        organization,
        participantId: participant.participant_id ?? '',
    });

    return (
        <section className="flex justify-center">
            <div className="grid aspect-[27/17] w-full max-w-[420px] grid-cols-[1fr_38%] gap-2 overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_12%_15%,rgba(251,191,36,0.28),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(14,165,233,0.2),transparent_26%),linear-gradient(135deg,#f8fbff_0%,#e8f6ff_48%,#fff7ed_100%)] p-3 shadow-xs">
                <div className="grid min-w-0 content-between gap-2">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center gap-3">
                            <img
                                src="/ched_logo.png"
                                alt="CHED"
                                className="size-8 rounded-full bg-white object-contain p-1 shadow-sm sm:size-9"
                            />
                            <div>
                                <p className="text-sm leading-tight font-semibold text-slate-900 sm:text-base">
                                    CERS
                                </p>
                                <p className="text-[10px] text-slate-600 sm:text-xs">
                                    Participant Identification
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-[52px_1fr] items-center gap-2 sm:grid-cols-[60px_1fr]">
                        <div className="flex size-13 items-center justify-center overflow-hidden rounded-md border border-white/80 bg-white text-base font-semibold text-sky-900 shadow-sm sm:size-15">
                            {participant.avatar ? (
                                <img
                                    src={participant.avatar}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                getParticipantCardInitials(participant)
                            )}
                        </div>

                        <div className="min-w-0">
                            <h2 className="line-clamp-2 text-xs leading-[1.1] font-semibold text-slate-950 sm:text-sm">
                                {displayName}
                            </h2>
                            <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight font-medium break-words text-slate-700 sm:text-[10px]">
                                {organization || 'Organization not assigned'}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <div className="min-w-0">
                            <p className="text-[9px] font-medium tracking-wide text-slate-500 uppercase sm:text-[10px]">
                                Participant ID
                            </p>
                            <div className="mt-1 inline-flex max-w-full rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold tracking-wide text-slate-950 shadow-sm sm:text-xs">
                                <span className="truncate">{displayId}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid min-w-0 content-center justify-items-center gap-2 rounded-lg border border-white/80 bg-white/90 p-2 text-center shadow-sm sm:p-3">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-800 sm:text-xs">
                        <QrCode className="size-3" />
                        QR Code
                    </div>
                    <div className="rounded-md bg-white p-1.5 shadow-inner">
                        <QRCodeSVG
                            value={qrValue}
                            size={176}
                            level="M"
                            marginSize={1}
                            className="size-16 sm:size-24"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="line-clamp-2 text-[9px] font-semibold break-words text-slate-900 sm:text-[10px]">
                            {displayId}
                        </p>
                        <p className="mt-0.5 text-[8px] text-slate-500 sm:text-[9px]">
                            CERS scanner verification only.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function MobileParticipantsSkeleton() {
    return (
        <div className="divide-y md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <div className="grid flex-1 gap-2">
                                    <Skeleton className="h-3 w-12" />
                                    <Skeleton className="h-4 w-3/5" />
                                    <Skeleton className="h-3 w-4/5" />
                                </div>
                                <Skeleton className="size-8" />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-6 w-14 rounded-full" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                                <Skeleton className="h-6 w-16 rounded-full" />
                            </div>
                            <div className="mt-3 grid gap-2">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-4 w-2/3" />
                                <div className="grid grid-cols-2 gap-3">
                                    <Skeleton className="h-10" />
                                    <Skeleton className="h-10" />
                                </div>
                                <Skeleton className="h-10" />
                            </div>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}

function ParticipantsTableSkeleton() {
    return (
        <TableBody>
            {Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index} className="odd:bg-muted/[0.18]">
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-4 w-6" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <Skeleton className="size-8 rounded-full" />
                            <div className="grid flex-1 gap-2">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-36" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <div className="grid gap-2">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-4 w-full max-w-28" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <div className="grid gap-1">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </TableCell>
                    <TableCell className="px-2 py-2">
                        <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right">
                        <Skeleton className="ml-auto size-8" />
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    );
}

function AddedByFilter({
    value,
    options,
    onChange,
}: {
    value: string;
    options: Option[];
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
                    className="h-auto min-h-8 justify-between px-2 py-1 text-xs"
                >
                    <span className="max-w-44 text-left leading-tight break-words whitespace-normal">
                        {selectedOption?.label ?? 'Added by'}
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[min(calc(100vw-2rem),20rem)] p-0"
            >
                <Command>
                    <CommandInput placeholder="Search added by..." />
                    <CommandList>
                        <CommandEmpty>No source found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="All added by"
                                onSelect={() => {
                                    onChange('all');
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        'mr-2 size-4',
                                        value === 'all'
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                    )}
                                />
                                <span>All</span>
                            </CommandItem>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={`${option.label} ${option.type ?? ''}`}
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
                                    <div className="min-w-0">
                                        <p className="text-sm leading-snug break-words whitespace-normal">
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {option.type === 'system'
                                                ? 'System'
                                                : 'Administrator'}
                                        </p>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default function Participants({
    participants,
    deletedParticipants,
    organizations,
    participantTypes,
    events,
    addedByOptions,
    provinces,
}: Props) {
    const getInitials = useInitials();
    const [search, setSearch] = useState('');
    const [addedByFilter, setAddedByFilter] = useState('all');
    const [sortKey, setSortKey] = useState<SortKey>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addStep, setAddStep] = useState(0);
    const [addAvatarPreview, setAddAvatarPreview] = useState('');
    const [addAvatarError, setAddAvatarError] = useState('');
    const [addCropDialogOpen, setAddCropDialogOpen] = useState(false);
    const [addCropImageSrc, setAddCropImageSrc] = useState('');
    const [addCrop, setAddCrop] = useState<Crop>();
    const [addCompletedCrop, setAddCompletedCrop] = useState<PixelCrop>();
    const [addMunicipalitiesLoading, setAddMunicipalitiesLoading] =
        useState(false);
    const [addMunicipalityOptions, setAddMunicipalityOptions] = useState<
        Option[]
    >([]);
    const [editMunicipalitiesLoading, setEditMunicipalitiesLoading] =
        useState(false);
    const [editMunicipalityOptions, setEditMunicipalityOptions] = useState<
        Option[]
    >([]);
    const [addCropMimeType, setAddCropMimeType] = useState<
        'image/png' | 'image/jpeg'
    >('image/jpeg');
    const addCropImageRef = useRef<HTMLImageElement | null>(null);
    const [editingParticipant, setEditingParticipant] =
        useState<Participant | null>(null);
    const [deletingParticipant, setDeletingParticipant] =
        useState<Participant | null>(null);
    const [resettingPasswordParticipant, setResettingPasswordParticipant] =
        useState<Participant | null>(null);
    const [deletedDialogOpen, setDeletedDialogOpen] = useState(false);
    const [viewingImageParticipant, setViewingImageParticipant] =
        useState<Participant | null>(null);
    const [viewingIdParticipant, setViewingIdParticipant] =
        useState<Participant | null>(null);
    const {
        data,
        setData,
        patch: patchParticipant,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm<ParticipantFormData>(emptyParticipantFormData);
    const {
        data: addData,
        setData: setAddData,
        post: postParticipant,
        processing: addingParticipant,
        errors: addErrors,
        reset: resetAddForm,
        clearErrors: clearAddErrors,
    } = useForm<AddParticipantFormData>(emptyAddParticipantFormData);
    const { delete: destroyParticipant, processing: deleting } = useForm({});
    const { post: postPasswordReset, processing: resettingPassword } = useForm(
        {},
    );
    const { patch: restoreParticipant, processing: restoring } = useForm({});
    const { patch: patchParticipantStatus, processing: updatingStatus } =
        useForm({});
    const tableLoading =
        addingParticipant ||
        processing ||
        deleting ||
        resettingPassword ||
        restoring ||
        updatingStatus;

    const organizationOptions = useMemo(
        () =>
            organizations.filter(
                (organization) =>
                    organization.type?.trim().toLowerCase() === 'agency',
            ),
        [organizations],
    );

    const schoolOptions = useMemo(
        () =>
            organizations.filter(
                (organization) =>
                    organization.type?.trim().toLowerCase() === 'institution',
            ),
        [organizations],
    );

    const fourPsParticipantTypes = useMemo(
        () =>
            participantTypes.filter(
                (type) => type.type?.trim().toLowerCase() === '4ps',
            ),
        [participantTypes],
    );

    const generalParticipantTypes = useMemo(
        () =>
            participantTypes.filter(
                (type) => type.type?.trim().toLowerCase() !== '4ps',
            ),
        [participantTypes],
    );

    const normalizedAddedByOptions = useMemo(() => {
        const seen = new Set<string>();

        return addedByOptions.filter((option) => {
            if (seen.has(option.value)) {
                return false;
            }

            seen.add(option.value);

            return true;
        });
    }, [addedByOptions]);

    useEffect(() => {
        if (!addData.province) {
            return;
        }

        const controller = new AbortController();

        async function loadMunicipalities() {
            setAddMunicipalitiesLoading(true);

            try {
                const searchParams = new URLSearchParams({
                    province: addData.province,
                });
                const response = await fetch(
                    `/welcome-lookups/municipalities?${searchParams.toString()}`,
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error('Unable to load municipalities.');
                }

                const data = (await response.json()) as Option[];

                setAddMunicipalityOptions(data);
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setAddMunicipalityOptions([]);
                setAddData('municipality', '');
                toast.error(
                    'Municipalities could not be loaded. Please select the province again.',
                );
            } finally {
                if (!controller.signal.aborted) {
                    setAddMunicipalitiesLoading(false);
                }
            }
        }

        loadMunicipalities();

        return () => controller.abort();
    }, [addData.province, setAddData]);

    useEffect(() => {
        if (!editingParticipant || !data.province) {
            return;
        }

        const controller = new AbortController();

        async function loadMunicipalities() {
            setEditMunicipalitiesLoading(true);

            try {
                const searchParams = new URLSearchParams({
                    province: data.province,
                });
                const response = await fetch(
                    `/welcome-lookups/municipalities?${searchParams.toString()}`,
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error('Unable to load municipalities.');
                }

                const municipalities = (await response.json()) as Option[];

                setEditMunicipalityOptions(municipalities);
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setEditMunicipalityOptions([]);
                setData('municipality', '');
                toast.error(
                    'Municipalities could not be loaded. Please select the province again.',
                );
            } finally {
                if (!controller.signal.aborted) {
                    setEditMunicipalitiesLoading(false);
                }
            }
        }

        loadMunicipalities();

        return () => controller.abort();
    }, [data.province, editingParticipant, setData]);

    const filteredParticipants = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        const addedByFiltered =
            addedByFilter === 'all'
                ? participants
                : participants.filter(
                      (participant) =>
                          getAddedByFilterValue(participant) === addedByFilter,
                  );

        const filtered = normalizedSearch
            ? addedByFiltered.filter((participant) =>
                  [
                      participant.name,
                      participant.participant_id,
                      participant.email,
                      participant.phone,
                      getLocationLabel(participant),
                      participant.organization,
                      participant.participant_type,
                      participant.sex,
                      participant.event_name,
                      getAddedByType(participant),
                      getAddedByLabel(participant),
                      participant.is_active ? 'active' : 'inactive',
                  ]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase()
                      .includes(normalizedSearch),
              )
            : addedByFiltered;

        return [...filtered].sort((a, b) => {
            const aValue = getSortValue(a, sortKey);
            const bValue = getSortValue(b, sortKey);

            if (sortKey === 'created_at') {
                const comparison =
                    new Date(aValue).getTime() - new Date(bValue).getTime();

                return sortDirection === 'asc' ? comparison : -comparison;
            }

            const comparison = String(aValue).localeCompare(String(bValue));

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [addedByFilter, participants, search, sortDirection, sortKey]);

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

    function updateAddedByFilter(value: string) {
        setAddedByFilter(value);
        setPage(1);
    }

    function updatePageSize(value: number) {
        setPageSize(value);
        setPage(1);
    }

    function openAddDialog() {
        clearAddErrors();
        setAddAvatarError('');
        setAddDialogOpen(true);
    }

    function closeAddDialog() {
        if (addingParticipant) {
            return;
        }

        setAddDialogOpen(false);
        setAddStep(0);
        setAddAvatarPreview('');
        setAddAvatarError('');
        setAddCropDialogOpen(false);
        setAddCropImageSrc('');
        setAddCrop(undefined);
        setAddCompletedCrop(undefined);
        setAddMunicipalityOptions([]);
        setAddMunicipalitiesLoading(false);
        clearAddErrors();
        resetAddForm();
    }

    function handleAddAvatarSelect(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            const message = 'Upload a PNG, JPG, or JPEG image.';

            setAddAvatarError(message);
            toast.error(message);

            return;
        }

        setAddAvatarError('');
        setAddCropMimeType(
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        );
        setAddCrop({
            unit: '%',
            x: 10,
            y: 10,
            width: 80,
            height: 80,
        });
        setAddCompletedCrop(undefined);

        const reader = new FileReader();

        reader.onload = () => {
            setAddCropImageSrc(String(reader.result));
            setAddCropDialogOpen(true);
        };
        reader.onerror = () => {
            const message = 'Could not read the selected image.';

            setAddAvatarError(message);
            toast.error(message);
        };
        reader.readAsDataURL(file);
    }

    function removeAddAvatar() {
        setAddAvatarPreview('');
        setAddAvatarError('');
        setAddData('avatar', '');
        setAddCropImageSrc('');
        setAddCompletedCrop(undefined);
    }

    function handleUseCroppedAddAvatar() {
        const image = addCropImageRef.current;

        if (!image) {
            return;
        }

        const fallbackSize = Math.round(
            Math.min(image.width, image.height) * 0.8,
        );
        const fallbackCrop: PixelCrop = {
            unit: 'px',
            x: Math.round((image.width - fallbackSize) / 2),
            y: Math.round((image.height - fallbackSize) / 2),
            width: fallbackSize,
            height: fallbackSize,
        };
        const croppedDataUrl = getCroppedImageDataUrl(
            image,
            addCompletedCrop ?? fallbackCrop,
            addCropMimeType,
        );

        if (!croppedDataUrl) {
            const message = 'Could not crop the selected image.';

            setAddAvatarError(message);
            toast.error(message);

            return;
        }

        setAddAvatarPreview(croppedDataUrl);
        setAddData('avatar', croppedDataUrl);
        setAddAvatarError('');
        setAddCropDialogOpen(false);
    }

    function submitAdd(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        postParticipant('/participants', {
            preserveScroll: true,
            onSuccess: () => {
                setAddDialogOpen(false);
                setAddStep(0);
                setAddAvatarPreview('');
                setAddAvatarError('');
                setAddCropDialogOpen(false);
                setAddCropImageSrc('');
                setAddCrop(undefined);
                setAddCompletedCrop(undefined);
                setAddMunicipalityOptions([]);
                setAddMunicipalitiesLoading(false);
                clearAddErrors();
                resetAddForm();
            },
            onError: () => {
                toast.error('Please review the highlighted fields.');
            },
        });
    }

    function openEditDialog(participant: Participant) {
        setEditingParticipant(participant);
        clearErrors();
        setData({
            given_name: participant.given_name ?? '',
            middle_name: participant.middle_name ?? '',
            surname: participant.surname ?? '',
            email: participant.email ?? '',
            phone: normalizeContactNumber(participant.phone ?? ''),
            province: participant.province?.code ?? '',
            municipality: participant.municipality?.code ?? '',
            organization: participant.organization ?? '',
            participant_type: participant.participant_type ?? '',
            sex: participant.sex ?? '',
            event_name: participant.event_name ?? '',
        });
        setEditMunicipalityOptions(
            participant.municipality
                ? [
                      {
                          value: participant.municipality.code,
                          label: participant.municipality.name,
                      },
                  ]
                : [],
        );
    }

    function closeEditDialog() {
        if (processing) {
            return;
        }

        setEditingParticipant(null);
        setEditMunicipalityOptions([]);
        setEditMunicipalitiesLoading(false);
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
                setEditMunicipalityOptions([]);
                setEditMunicipalitiesLoading(false);
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

    function submitStatus(participant: Participant) {
        patchParticipantStatus(`/participants/${participant.id}/status`, {
            preserveScroll: true,
            onError: () => {
                toast.error('Unable to update participant status.');
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
                                <AddedByFilter
                                    value={addedByFilter}
                                    options={normalizedAddedByOptions}
                                    onChange={updateAddedByFilter}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={openAddDialog}
                                    className="h-8 justify-center px-2 text-xs"
                                >
                                    <Plus className="size-3.5" />
                                    Add participant
                                </Button>
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

                    {tableLoading ? (
                        <MobileParticipantsSkeleton />
                    ) : (
                        <div className="divide-y md:hidden">
                            {pageParticipants.length > 0 ? (
                                pageParticipants.map((participant, index) => (
                                    <article
                                        key={participant.id}
                                        className="p-3 sm:p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <ParticipantAvatarThumbnail
                                                participant={participant}
                                                getInitials={getInitials}
                                                sizeClassName="size-10"
                                                fallbackClassName="bg-[#eef5ff] text-xs font-semibold text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300"
                                                onViewImage={
                                                    setViewingImageParticipant
                                                }
                                            />

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                                                            Seq{' '}
                                                            {startIndex +
                                                                index +
                                                                1}
                                                        </p>
                                                        <h2 className="truncate text-sm font-semibold text-foreground">
                                                            {participant.name}
                                                        </h2>
                                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                            {participant.email ??
                                                                '-'}
                                                        </p>
                                                    </div>
                                                    <ParticipantActions
                                                        participant={
                                                            participant
                                                        }
                                                        onEdit={openEditDialog}
                                                        onDelete={
                                                            setDeletingParticipant
                                                        }
                                                        onStatus={submitStatus}
                                                        onResetPassword={
                                                            setResettingPasswordParticipant
                                                        }
                                                    />
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'max-w-full',
                                                            getParticipantTypeBadgeClassName(
                                                                participant.participant_type,
                                                                participantTypes,
                                                            ),
                                                        )}
                                                    >
                                                        {getOptionLabel(
                                                            participantTypes,
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
                                                    {participant.created_by && (
                                                        <Badge
                                                            variant="outline"
                                                            className="max-w-full"
                                                        >
                                                            Admin
                                                        </Badge>
                                                    )}
                                                    <UserStatusBadge
                                                        active={
                                                            participant.is_active
                                                        }
                                                    />
                                                </div>

                                                <dl className="mt-3 grid gap-2 text-xs">
                                                    <div className="min-w-0">
                                                        <dt className="font-medium text-muted-foreground">
                                                            Event
                                                        </dt>
                                                        <dd className="mt-0.5 text-foreground">
                                                            {getOptionLabel(
                                                                events,
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
                                                                Participant ID
                                                            </dt>
                                                            <dd className="mt-0.5 text-foreground">
                                                                <ParticipantIdButton
                                                                    participant={
                                                                        participant
                                                                    }
                                                                    onOpen={
                                                                        setViewingIdParticipant
                                                                    }
                                                                />
                                                            </dd>
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <dt className="font-medium text-muted-foreground">
                                                            Organization
                                                        </dt>
                                                        <dd className="mt-0.5 break-words whitespace-normal text-foreground">
                                                            {participant.organization ??
                                                                '-'}
                                                        </dd>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <dt className="font-medium text-muted-foreground">
                                                            Added by
                                                        </dt>
                                                        <dd className="mt-0.5 truncate text-foreground">
                                                            {getAddedByLabel(
                                                                participant,
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <dt className="font-medium text-muted-foreground">
                                                            Province /
                                                            Municipality
                                                        </dt>
                                                        <dd className="mt-0.5 line-clamp-2 text-foreground">
                                                            {getLocationLabel(
                                                                participant,
                                                            )}
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
                    )}

                    <div className="hidden overflow-x-auto md:block">
                        <Table className="min-w-[92rem] table-fixed text-xs">
                            <TableHeader>
                                <TableRow className="bg-muted/45 hover:bg-muted/45">
                                    <TableHead className="h-9 w-12 px-2 text-[11px] font-semibold text-muted-foreground uppercase">
                                        Seq
                                    </TableHead>
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
                                                    <SortIcon className="size-3.5 shrink-0" />
                                                </button>
                                            </TableHead>
                                        );
                                    })}
                                    <TableHead className="h-9 w-20 px-2 text-right text-[11px] font-semibold text-muted-foreground uppercase">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            {tableLoading ? (
                                <ParticipantsTableSkeleton />
                            ) : (
                                <TableBody>
                                    {pageParticipants.length > 0 ? (
                                        pageParticipants.map(
                                            (participant, index) => (
                                                <TableRow
                                                    key={participant.id}
                                                    className="odd:bg-muted/[0.18]"
                                                >
                                                    <TableCell className="px-2 py-2 font-medium text-muted-foreground">
                                                        {startIndex + index + 1}
                                                    </TableCell>
                                                    <TableCell className="overflow-hidden px-2 py-2">
                                                        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                                                            <ParticipantAvatarThumbnail
                                                                participant={
                                                                    participant
                                                                }
                                                                getInitials={
                                                                    getInitials
                                                                }
                                                                sizeClassName="size-8"
                                                                fallbackClassName="bg-[#eef5ff] text-[11px] font-semibold text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300"
                                                                onViewImage={
                                                                    setViewingImageParticipant
                                                                }
                                                            />
                                                            <div className="grid min-w-0 gap-1 overflow-hidden">
                                                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                    <ParticipantName
                                                                        name={
                                                                            participant.name
                                                                        }
                                                                    />
                                                                    <UserStatusBadge
                                                                        active={
                                                                            participant.is_active
                                                                        }
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Participant
                                                                    ID
                                                                </p>
                                                                <div className="min-w-0 text-xs leading-5">
                                                                    <ParticipantIdButton
                                                                        participant={
                                                                            participant
                                                                        }
                                                                        onOpen={
                                                                            setViewingIdParticipant
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2">
                                                        <div className="min-w-0 leading-5">
                                                            <p className="truncate font-medium text-foreground">
                                                                {participant.email ??
                                                                    '-'}
                                                            </p>
                                                            <p className="truncate text-muted-foreground">
                                                                {participant.phone ??
                                                                    '-'}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 leading-5 whitespace-normal">
                                                        <span className="line-clamp-2">
                                                            {getLocationLabel(
                                                                participant,
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 leading-5 whitespace-normal">
                                                        <span className="break-words whitespace-normal">
                                                            {participant.organization ??
                                                                '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded-full border px-2 py-1 text-[11px] font-medium',
                                                                getParticipantTypeBadgeClassName(
                                                                    participant.participant_type,
                                                                    participantTypes,
                                                                ),
                                                            )}
                                                        >
                                                            {getOptionLabel(
                                                                participantTypes,
                                                                participant.participant_type,
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 text-muted-foreground">
                                                        {formatLabel(
                                                            participant.sex,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 leading-5 whitespace-normal">
                                                        <span className="line-clamp-2">
                                                            {getOptionLabel(
                                                                events,
                                                                participant.event_name,
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2">
                                                        <div className="grid min-w-0 gap-1">
                                                            {participant.created_by ? (
                                                                <>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="w-fit px-2 py-0 text-[11px]"
                                                                    >
                                                                        Admin
                                                                    </Badge>
                                                                    <p className="truncate text-muted-foreground">
                                                                        {getAddedByLabel(
                                                                            participant,
                                                                        )}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <p className="truncate text-muted-foreground">
                                                                    System
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 text-muted-foreground">
                                                        {formatDate(
                                                            participant.created_at,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-2 py-2 text-right">
                                                        <ParticipantActions
                                                            participant={
                                                                participant
                                                            }
                                                            onEdit={
                                                                openEditDialog
                                                            }
                                                            onDelete={
                                                                setDeletingParticipant
                                                            }
                                                            onStatus={
                                                                submitStatus
                                                            }
                                                            onResetPassword={
                                                                setResettingPasswordParticipant
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length + 2}
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                No participants found.
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
                open={addDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeAddDialog();
                    } else {
                        openAddDialog();
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-2xl"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <Plus className="size-4 text-muted-foreground" />
                            Add participant
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Enter the participant details and registration
                            information.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitAdd} className="grid gap-4">
                        <div className="grid grid-cols-2 gap-1">
                            {addParticipantSteps.map((step, index) => (
                                <button
                                    key={step}
                                    type="button"
                                    onClick={() => setAddStep(index)}
                                    className={cn(
                                        'min-w-0 rounded-md border px-2 py-2 text-center text-[11px] font-medium',
                                        addStep === index
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-muted/35 text-muted-foreground',
                                    )}
                                >
                                    <span className="block sm:hidden">
                                        {index + 1}
                                    </span>
                                    <span className="hidden truncate sm:block">
                                        {step}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-3">
                            {addStep === 0 && (
                                <div className="grid gap-3">
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="add_given_name">
                                                Given name
                                            </Label>
                                            <Input
                                                id="add_given_name"
                                                value={addData.given_name}
                                                onChange={(event) =>
                                                    setAddData(
                                                        'given_name',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="given-name"
                                                aria-invalid={
                                                    !!addErrors.given_name
                                                }
                                            />
                                            <InputError
                                                message={addErrors.given_name}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="add_middle_name">
                                                Middle name
                                            </Label>
                                            <Input
                                                id="add_middle_name"
                                                value={addData.middle_name}
                                                onChange={(event) =>
                                                    setAddData(
                                                        'middle_name',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="additional-name"
                                                aria-invalid={
                                                    !!addErrors.middle_name
                                                }
                                            />
                                            <InputError
                                                message={addErrors.middle_name}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="add_surname">
                                                Surname
                                            </Label>
                                            <Input
                                                id="add_surname"
                                                value={addData.surname}
                                                onChange={(event) =>
                                                    setAddData(
                                                        'surname',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="family-name"
                                                aria-invalid={
                                                    !!addErrors.surname
                                                }
                                            />
                                            <InputError
                                                message={addErrors.surname}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {addStep === 0 && (
                                <div className="grid gap-3">
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="add_email">
                                                Email address
                                            </Label>
                                            <Input
                                                id="add_email"
                                                type="email"
                                                value={addData.email}
                                                onChange={(event) =>
                                                    setAddData(
                                                        'email',
                                                        event.target.value,
                                                    )
                                                }
                                                autoComplete="email"
                                                aria-invalid={!!addErrors.email}
                                            />
                                            <InputError
                                                message={addErrors.email}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="add_phone">
                                                Contact number
                                            </Label>
                                            <Input
                                                id="add_phone"
                                                type="tel"
                                                value={addData.phone}
                                                onChange={(event) =>
                                                    setAddData(
                                                        'phone',
                                                        normalizeContactNumber(
                                                            event.target.value,
                                                        ),
                                                    )
                                                }
                                                autoComplete="tel"
                                                inputMode="numeric"
                                                maxLength={11}
                                                pattern="09[0-9]{9}"
                                                placeholder="09XXXXXXXXX"
                                                aria-invalid={!!addErrors.phone}
                                            />
                                            <InputError
                                                message={addErrors.phone}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SearchableOptionField
                                            id="add_province"
                                            label="Province"
                                            value={addData.province}
                                            options={provinces}
                                            placeholder="Search and select province"
                                            searchPlaceholder="Search province..."
                                            emptyMessage="No province found."
                                            error={addErrors.province}
                                            onValueChange={(value) => {
                                                setAddMunicipalityOptions([]);
                                                setAddData('province', value);
                                                setAddData('municipality', '');
                                            }}
                                        />

                                        <SearchableOptionField
                                            id="add_municipality"
                                            label="Municipality or city"
                                            value={addData.municipality}
                                            options={addMunicipalityOptions}
                                            placeholder={
                                                addData.province
                                                    ? 'Search and select municipality or city'
                                                    : 'Select province first'
                                            }
                                            searchPlaceholder="Search municipality or city..."
                                            emptyMessage={
                                                addMunicipalitiesLoading
                                                    ? 'Loading municipalities...'
                                                    : 'No municipality or city found.'
                                            }
                                            error={addErrors.municipality}
                                            disabled={!addData.province}
                                            onValueChange={(value) =>
                                                setAddData(
                                                    'municipality',
                                                    value,
                                                )
                                            }
                                        />
                                    </div>

                                    <SearchableOptionField
                                        id="add_organization"
                                        label="School or organization"
                                        value={addData.organization}
                                        options={organizations}
                                        grouped
                                        organizationOptions={
                                            organizationOptions
                                        }
                                        schoolOptions={schoolOptions}
                                        placeholder="Search and select school or organization"
                                        searchPlaceholder="Search school or organization..."
                                        emptyMessage="No school or organization found."
                                        error={addErrors.organization}
                                        onValueChange={(value) =>
                                            setAddData('organization', value)
                                        }
                                    />
                                </div>
                            )}

                            {addStep === 0 && (
                                <div className="flex flex-col gap-3 rounded-md border border-dashed bg-muted/20 p-3 sm:flex-row sm:items-center">
                                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background">
                                        {addAvatarPreview ? (
                                            <img
                                                src={addAvatarPreview}
                                                alt="Profile preview"
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <ImagePlus className="size-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="grid min-w-0 flex-1 gap-2">
                                        <Label>Profile image</Label>
                                        <div className="flex flex-wrap gap-2">
                                            <Label
                                                htmlFor="add_avatar"
                                                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
                                            >
                                                <ImagePlus className="size-4" />
                                                Choose image
                                            </Label>
                                            <input
                                                id="add_avatar"
                                                type="file"
                                                accept="image/png,image/jpeg"
                                                className="sr-only"
                                                onChange={handleAddAvatarSelect}
                                            />
                                            {addAvatarPreview && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={removeAddAvatar}
                                                >
                                                    <X className="size-4" />
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                        <InputError
                                            message={
                                                addErrors.avatar ||
                                                addAvatarError
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {addStep === 1 && (
                                <div className="grid gap-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SearchableOptionField
                                            id="add_participant_type"
                                            label="Participant type"
                                            value={addData.participant_type}
                                            options={participantTypes}
                                            participantTypeGrouped
                                            fourPsOptions={
                                                fourPsParticipantTypes
                                            }
                                            generalOptions={
                                                generalParticipantTypes
                                            }
                                            placeholder="Search and select type"
                                            searchPlaceholder="Search participant type..."
                                            emptyMessage="No type found."
                                            error={addErrors.participant_type}
                                            onValueChange={(value) =>
                                                setAddData(
                                                    'participant_type',
                                                    value,
                                                )
                                            }
                                        />

                                        <div className="space-y-2">
                                            <Label>Sex</Label>
                                            <Select
                                                value={addData.sex}
                                                onValueChange={(value) =>
                                                    setAddData('sex', value)
                                                }
                                            >
                                                <SelectTrigger
                                                    className="w-full"
                                                    aria-invalid={
                                                        !!addErrors.sex
                                                    }
                                                >
                                                    <SelectValue placeholder="Select sex" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sexOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={addErrors.sex}
                                            />
                                        </div>
                                    </div>

                                    <SearchableOptionField
                                        id="add_event_name"
                                        label="Event"
                                        value={addData.event_name}
                                        options={events}
                                        placeholder="Search and select event"
                                        searchPlaceholder="Search event..."
                                        emptyMessage="No event found."
                                        error={addErrors.event_name}
                                        onValueChange={(value) =>
                                            setAddData('event_name', value)
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={closeAddDialog}
                                disabled={addingParticipant}
                            >
                                <X className="size-4" />
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setAddStep((step) => Math.max(0, step - 1))
                                }
                                disabled={addingParticipant || addStep === 0}
                            >
                                <ChevronLeft className="size-4" />
                                Back
                            </Button>
                            {addStep < addParticipantSteps.length - 1 ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                        setAddStep((step) =>
                                            Math.min(
                                                addParticipantSteps.length - 1,
                                                step + 1,
                                            ),
                                        )
                                    }
                                    disabled={addingParticipant}
                                    className="col-span-2 sm:col-span-1"
                                >
                                    Next
                                    <ChevronRight className="size-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={addingParticipant}
                                    className="col-span-2 sm:col-span-1"
                                >
                                    <Save className="size-4" />
                                    Add participant
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={addCropDialogOpen}
                onOpenChange={setAddCropDialogOpen}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-xl"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <ImagePlus className="size-4 text-muted-foreground" />
                            Crop profile image
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Position the square crop for the participant image.
                        </DialogDescription>
                    </DialogHeader>

                    {addCropImageSrc && (
                        <div className="max-h-[55dvh] overflow-auto rounded-md border bg-muted/20 p-2">
                            <ReactCrop
                                crop={addCrop}
                                onChange={(_, percentCrop) =>
                                    setAddCrop(percentCrop)
                                }
                                onComplete={(pixelCrop) =>
                                    setAddCompletedCrop(pixelCrop)
                                }
                                aspect={1}
                                circularCrop
                                keepSelection
                            >
                                <img
                                    ref={addCropImageRef}
                                    src={addCropImageSrc}
                                    alt="Crop profile"
                                    className="max-h-[48dvh] w-full object-contain"
                                    onLoad={(event) => {
                                        const image = event.currentTarget;

                                        setAddCrop(
                                            getCenteredCircleCrop(
                                                image.width,
                                                image.height,
                                            ),
                                        );
                                    }}
                                />
                            </ReactCrop>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAddCropDialogOpen(false)}
                        >
                            <X className="size-4" />
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleUseCroppedAddAvatar}
                        >
                            <Save className="size-4" />
                            Use image
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={editingParticipant !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditDialog();
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-xl"
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
                                    type="tel"
                                    value={data.phone}
                                    onChange={(event) =>
                                        setData(
                                            'phone',
                                            normalizeContactNumber(
                                                event.target.value,
                                            ),
                                        )
                                    }
                                    autoComplete="tel"
                                    inputMode="numeric"
                                    maxLength={11}
                                    pattern="09[0-9]{9}"
                                    placeholder="09XXXXXXXXX"
                                    aria-invalid={!!errors.phone}
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <SearchableOptionField
                                id="province"
                                label="Province"
                                value={data.province}
                                options={provinces}
                                placeholder="Search and select province"
                                searchPlaceholder="Search province..."
                                emptyMessage="No province found."
                                error={errors.province}
                                onValueChange={(value) => {
                                    setEditMunicipalityOptions([]);
                                    setData('province', value);
                                    setData('municipality', '');
                                }}
                            />

                            <SearchableOptionField
                                id="municipality"
                                label="Municipality or city"
                                value={data.municipality}
                                options={editMunicipalityOptions}
                                placeholder={
                                    data.province
                                        ? 'Search and select municipality or city'
                                        : 'Select province first'
                                }
                                searchPlaceholder="Search municipality or city..."
                                emptyMessage={
                                    editMunicipalitiesLoading
                                        ? 'Loading municipalities...'
                                        : 'No municipality or city found.'
                                }
                                error={errors.municipality}
                                disabled={!data.province}
                                onValueChange={(value) =>
                                    setData('municipality', value)
                                }
                            />

                            <SearchableOptionField
                                id="organization"
                                label="School or organization"
                                value={data.organization}
                                options={organizations}
                                grouped
                                organizationOptions={organizationOptions}
                                schoolOptions={schoolOptions}
                                placeholder="Search and select school or organization"
                                searchPlaceholder="Search school or organization..."
                                emptyMessage="No school or organization found."
                                error={errors.organization}
                                onValueChange={(value) =>
                                    setData('organization', value)
                                }
                            />

                            <SearchableOptionField
                                id="participant_type"
                                label="Participant type"
                                value={data.participant_type}
                                options={participantTypes}
                                participantTypeGrouped
                                fourPsOptions={fourPsParticipantTypes}
                                generalOptions={generalParticipantTypes}
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
                            options={events}
                            placeholder="Search and select event"
                            searchPlaceholder="Search event..."
                            emptyMessage="No event found."
                            error={errors.event_name}
                            onValueChange={(value) =>
                                setData('event_name', value)
                            }
                        />

                        <DialogFooter className="gap-2 sm:gap-2">
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
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-sm"
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

                    <DialogFooter className="gap-2 sm:gap-2">
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
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-sm"
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

                    <DialogFooter className="gap-2 sm:gap-2">
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
                    className="grid max-h-[min(calc(100dvh-1rem),34rem)] gap-3 overflow-hidden p-4 sm:max-w-xl"
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

                    <div className="max-h-[min(24rem,calc(100dvh-8rem))] space-y-2 overflow-y-auto pr-1">
                        {deletedParticipants.length > 0 ? (
                            deletedParticipants.map((participant) => (
                                <div
                                    key={participant.id}
                                    className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <ParticipantAvatarThumbnail
                                            participant={participant}
                                            getInitials={getInitials}
                                            sizeClassName="size-8"
                                            fallbackClassName="bg-[#eef5ff] text-[11px] font-semibold text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300"
                                            onViewImage={
                                                setViewingImageParticipant
                                            }
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-foreground">
                                                {participant.name}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {participant.email ?? '-'}
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
            <Dialog
                open={viewingIdParticipant !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingIdParticipant(null);
                    }
                }}
            >
                <DialogContent
                    className="max-h-[calc(100dvh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-lg"
                    onPointerDownOutside={preventDialogOutsideClose}
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <QrCode className="size-4 text-muted-foreground" />
                            Participant virtual ID
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            Virtual identification card for scanner
                            verification.
                        </DialogDescription>
                    </DialogHeader>

                    {viewingIdParticipant && (
                        <VirtualIdCard participant={viewingIdParticipant} />
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={viewingImageParticipant !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingImageParticipant(null);
                    }
                }}
            >
                <DialogContent className="h-dvh max-h-none w-dvw max-w-none rounded-none border-0 bg-black p-0 sm:max-w-none [&>button]:top-4 [&>button]:right-4 [&>button]:bg-white/15 [&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/25 [&>button]:focus:ring-white/60">
                    <DialogHeader className="sr-only">
                        <DialogTitle>
                            {viewingImageParticipant?.name
                                ? `${viewingImageParticipant.name} profile image`
                                : 'Participant profile image'}
                        </DialogTitle>
                        <DialogDescription>
                            Full screen participant profile image.
                        </DialogDescription>
                    </DialogHeader>

                    {viewingImageParticipant?.avatar && (
                        <div className="flex h-full w-full items-center justify-center p-4 sm:p-8">
                            <img
                                src={viewingImageParticipant.avatar}
                                alt={`${viewingImageParticipant.name} profile`}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    )}
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
