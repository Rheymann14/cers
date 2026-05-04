import { Form, Head, Link, usePage } from '@inertiajs/react';
import { toPng } from 'html-to-image';
import {
    Check,
    CheckCircle2,
    ChevronsUpDown,
    ClipboardCheck,
    ArrowDown,
    Download,
    ImagePlus,
    Moon,
    QrCode,
    Trash2,
    Sun,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { RefObject } from 'react';
import Confetti from 'react-confetti';
import { createPortal } from 'react-dom';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'sonner';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { useAppearance } from '@/hooks/use-appearance';
import { normalizeContactNumber } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { login, participants } from '@/routes';

const navigationLinks = [{ label: 'Home', href: '/home', sectionId: 'home' }];

const defaultActiveSection = 'home';

type LookupOption = {
    value: string;
    label: string;
};

type EventOption = LookupOption & {
    starts_at: string | null;
    ends_at: string | null;
};

type WelcomeProps = {
    organizations: LookupOption[];
    provinces: LookupOption[];
    participantTypes: LookupOption[];
    events: EventOption[];
};

type RegistrationSuccess = {
    participant_id: string | null;
    name: string;
    email: string;
    organization: string | null;
    avatar: string | null;
};

type WelcomePageProps = {
    auth: {
        user: unknown | null;
    };
    errors?: Record<string, string>;
    registrationSuccess?: RegistrationSuccess | null;
};

const otherOrganizationValue = '__other__';
const otherParticipantTypeValue = '__other__';

const fieldClass =
    'h-11 rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 focus-visible:border-[#0038A8] focus-visible:ring-[#0038A8]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';

const comboboxButtonClass =
    'min-h-11 h-auto w-full justify-between rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 py-2 font-normal text-slate-700 hover:bg-[#f8fbff] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-950';

const comboboxValueClass =
    'min-w-0 flex-1 whitespace-normal break-words text-left leading-snug';

const commandItemClass =
    'items-start py-2 whitespace-normal data-[selected=true]:bg-[#eef5ff] dark:data-[selected=true]:bg-blue-950/40';

const commandItemTextClass =
    'min-w-0 flex-1 whitespace-normal break-words leading-snug';

const sampleVirtualId = {
    email: 'juan.delacruz@example.com',
    fullName: 'Juan Delacruz',
    organization: 'Agency',
    participantId: 'CERS-VKTO-2026',
};

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

function RequiredMark() {
    return (
        <span aria-hidden="true" className="text-[#CE1126]">
            *
        </span>
    );
}

function WelcomeVirtualIdPreview() {
    const qrValue = createQrToken(sampleVirtualId);

    return (
        <div className="rounded-2xl border border-[#d9e5f5] bg-white p-3 shadow-md shadow-slate-200/70 motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:slide-in-from-bottom-4 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30">
            <div className="rounded-2xl border border-[#d9e5f5] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0038A8] shadow-sm dark:bg-neutral-900 dark:text-blue-300">
                        <QrCode className="size-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl leading-tight font-bold text-slate-950 dark:text-white">
                            Virtual ID
                        </p>
                        <p className="text-sm font-medium text-slate-600 dark:text-neutral-300">
                            QR-based attendance verification
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl border border-white/80 bg-[radial-gradient(circle_at_9%_8%,rgba(252,209,22,0.22),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(0,56,168,0.14),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f1f8ff_52%,#fff8e7_100%)] p-3 shadow-sm sm:grid-cols-[1fr_36%] dark:border-neutral-800 dark:bg-[radial-gradient(circle_at_9%_8%,rgba(252,209,22,0.13),transparent_30%),radial-gradient(circle_at_88%_8%,rgba(59,130,246,0.22),transparent_32%),linear-gradient(135deg,#0a0a0a_0%,#111827_58%,#1f2937_100%)]">
                    <div className="grid min-w-0 content-between gap-4">
                        <div className="flex items-center gap-2">
                            <img
                                src="/ched_logo-128.png"
                                alt="CHED"
                                className="size-8 rounded-full bg-white object-contain p-1 shadow-sm"
                                loading="lazy"
                                decoding="async"
                            />
                            <div>
                                <p className="text-base leading-tight font-bold text-slate-950 dark:text-white">
                                    CERS
                                </p>
                                <p className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                                    Participant Identification
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-[56px_1fr] items-center gap-3">
                            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-white bg-white text-base font-bold text-[#0038A8] shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-blue-300">
                                JD
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base leading-tight font-bold text-slate-950 dark:text-white">
                                    {sampleVirtualId.fullName}
                                </h2>
                                <p className="text-xs font-medium text-slate-600 dark:text-neutral-300">
                                    {sampleVirtualId.organization}
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-medium tracking-wide text-slate-500 uppercase dark:text-neutral-400">
                                Participant ID
                            </p>
                            <div className="mt-1 inline-flex max-w-full rounded-full bg-white px-3 py-1 text-xs font-bold tracking-wide text-slate-950 shadow-sm dark:bg-neutral-900 dark:text-white">
                                <span className="truncate">
                                    {sampleVirtualId.participantId}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid min-w-0 content-center justify-items-center gap-2 rounded-2xl border border-white/80 bg-white/95 p-3 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0038A8] dark:text-blue-300">
                            <QrCode className="size-3.5" />
                            QR Code
                        </div>
                        <div className="rounded-lg bg-white p-1.5 shadow-inner">
                            <QRCodeSVG
                                value={qrValue}
                                size={144}
                                level="M"
                                marginSize={1}
                                className="size-24 sm:size-28"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold break-words text-slate-950 dark:text-white">
                                {sampleVirtualId.participantId}
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-neutral-400">
                                CERS scanner verification only.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {['Fast Check-In', 'QR Attendance', 'Secure Access'].map(
                        (item) => (
                            <div
                                key={item}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/80 bg-white/80 px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                            >
                                <CheckCircle2 className="size-3.5 text-[#0038A8]" />
                                <span>{item}</span>
                            </div>
                        ),
                    )}
                </div>
            </div>
        </div>
    );
}

function getRegistrationInitials(registration: RegistrationSuccess) {
    return (
        registration.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'ID'
    );
}

function RegistrationConfetti({
    width,
    height,
}: {
    width: number;
    height: number;
}) {
    if (typeof document === 'undefined') {
        return null;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return null;
    }

    return createPortal(
        <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={180}
            gravity={0.24}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2147483647,
                pointerEvents: 'none',
            }}
        />,
        document.body,
    );
}

function RegistrationSuccessVirtualId({
    registration,
    cardRef,
}: {
    registration: RegistrationSuccess;
    cardRef: RefObject<HTMLDivElement | null>;
}) {
    const displayId = registration.participant_id || 'Not assigned';
    const organization = registration.organization ?? '';
    const qrValue = createQrToken({
        email: registration.email,
        fullName: registration.name,
        organization,
        participantId: registration.participant_id ?? '',
    });

    return (
        <section className="grid justify-items-center gap-4">
            <div
                ref={cardRef}
                className="grid aspect-[85.6/54] w-full max-w-[430px] grid-cols-[1fr_36%] gap-2 overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_12%_15%,rgba(251,191,36,0.28),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(14,165,233,0.2),transparent_26%),linear-gradient(135deg,#f8fbff_0%,#e8f6ff_48%,#fff7ed_100%)] p-3 shadow-sm"
            >
                <div className="grid min-w-0 content-between gap-2">
                    <div className="flex items-center gap-3">
                        <img
                            src="/ched_logo-128.png"
                            alt="CHED"
                            className="size-7 rounded-full bg-white object-contain p-1 shadow-sm"
                            loading="lazy"
                            decoding="async"
                        />
                        <div>
                            <p className="text-xs leading-tight font-semibold text-slate-900">
                                CERS
                            </p>
                            <p className="text-[9px] text-slate-600">
                                Participant Identification
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-[60px_1fr] items-center gap-2">
                        <div className="flex size-14 items-center justify-center overflow-hidden rounded-md border border-white/80 bg-white text-base font-semibold text-sky-900 shadow-sm">
                            {registration.avatar ? (
                                <img
                                    src={registration.avatar}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                getRegistrationInitials(registration)
                            )}
                        </div>

                        <div className="min-w-0">
                            <h2 className="line-clamp-2 text-[11px] leading-[1.1] font-semibold text-slate-950 sm:text-xs">
                                {registration.name}
                            </h2>
                            <p className="mt-0.5 line-clamp-2 text-[8px] leading-tight font-medium break-words text-slate-700 sm:text-[9px]">
                                {organization || 'Organization not assigned'}
                            </p>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[8px] font-medium tracking-wide text-slate-500 uppercase sm:text-[9px]">
                            Participant ID
                        </p>
                        <div className="mt-1 inline-flex max-w-full rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold tracking-wide text-slate-950 shadow-sm sm:text-[10px]">
                            <span className="truncate">{displayId}</span>
                        </div>
                    </div>
                </div>

                <div className="grid min-w-0 content-center justify-items-center gap-1.5 rounded-lg border border-white/80 bg-white/90 p-2 text-center shadow-sm">
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-800 sm:text-[10px]">
                        <QrCode className="size-2.5" />
                        QR Code
                    </div>
                    <div className="rounded-md bg-white p-1 shadow-inner">
                        <QRCodeSVG
                            value={qrValue}
                            size={176}
                            level="M"
                            marginSize={1}
                            className="size-14 sm:size-20"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="line-clamp-2 text-[8px] font-semibold break-words text-slate-900 sm:text-[9px]">
                            {displayId}
                        </p>
                        <p className="mt-0.5 text-[7px] text-slate-500 sm:text-[8px]">
                            CERS scanner verification only.
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-[430px] rounded-xl border border-[#d9e5f5] bg-[#f8fbff] px-4 py-3 text-center text-sm font-semibold text-[#0038A8] dark:border-neutral-800 dark:bg-neutral-900 dark:text-blue-300">
                Download your virtual ID and present it for attendance scanning.
            </div>

            <div className="text-center">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-neutral-400">
                    Participant ID #
                </p>
                <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                    {displayId}
                </p>
            </div>
        </section>
    );
}

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

function getInitialActiveSection() {
    if (typeof window === 'undefined') {
        return defaultActiveSection;
    }

    if (
        window.location.pathname === '/registration' ||
        window.location.hash === '#registration'
    ) {
        return 'registration';
    }

    return defaultActiveSection;
}

function toDateOnly(value: string | null) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

function getEventStatus(event: EventOption) {
    const today = new Date();
    const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
    );
    const startsAt = toDateOnly(event.starts_at);
    const endsAt = toDateTime(event.ends_at);

    if (endsAt && today > endsAt) {
        return 'closed';
    }

    if (startsAt && todayDate < startsAt) {
        return 'upcoming';
    }

    return 'ongoing';
}

function EventStatusBadge({ event }: { event: EventOption }) {
    const status = getEventStatus(event);

    return (
        <Badge
            className={cn(
                'shrink-0 border-transparent text-[11px] capitalize',
                status === 'ongoing' &&
                    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
                status === 'closed' &&
                    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                status === 'upcoming' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
            )}
            variant="secondary"
        >
            {status}
        </Badge>
    );
}

function getSectionPath(sectionId: string) {
    if (sectionId === 'registration') {
        return '/registration';
    }

    return '/home';
}

function normalizeLookupLabel(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function scrollToFirstRegistrationError(errors: Record<string, unknown>) {
    const firstField = Object.keys(errors)[0];

    if (!firstField) {
        return;
    }

    window.requestAnimationFrame(() => {
        const field =
            document.querySelector<HTMLElement>(
                `[data-registration-field="${firstField}"]`,
            ) ??
            document.querySelector<HTMLElement>(
                `[name="${CSS.escape(firstField)}"]:not([type="hidden"])`,
            );

        if (!field) {
            return;
        }

        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field.focus({ preventScroll: true });
    });
}

export default function Welcome() {
    const {
        auth,
        errors: pageErrors = {},
        registrationSuccess,
    } = usePage().props as WelcomePageProps;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const accessHref = auth.user ? participants() : login();
    const nextAppearance = resolvedAppearance === 'dark' ? 'light' : 'dark';
    const AppearanceIcon = resolvedAppearance === 'dark' ? Sun : Moon;
    const currentYear = new Date().getFullYear();
    const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState(getInitialActiveSection);
    const [eventPopoverOpen, setEventPopoverOpen] = useState(false);
    const [lookupsLoading, setLookupsLoading] = useState(true);
    const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);
    const [organizations, setOrganizations] = useState<LookupOption[]>([]);
    const [provinces, setProvinces] = useState<LookupOption[]>([]);
    const [participantTypes, setParticipantTypes] = useState<LookupOption[]>(
        [],
    );
    const [events, setEvents] = useState<EventOption[]>([]);
    const [municipalityOptions, setMunicipalityOptions] = useState<
        LookupOption[]
    >([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [organizationPopoverOpen, setOrganizationPopoverOpen] =
        useState(false);
    const [selectedOrganization, setSelectedOrganization] = useState('');
    const [provincePopoverOpen, setProvincePopoverOpen] = useState(false);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [municipalityPopoverOpen, setMunicipalityPopoverOpen] =
        useState(false);
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [participantTypePopoverOpen, setParticipantTypePopoverOpen] =
        useState(false);
    const [selectedParticipantType, setSelectedParticipantType] = useState('');
    const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState('');
    const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
    const [profilePhotoError, setProfilePhotoError] = useState('');
    const [cropImageSrc, setCropImageSrc] = useState('');
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [registrationSuccessDialogOpen, setRegistrationSuccessDialogOpen] =
        useState(Boolean(registrationSuccess));
    const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
    const [cropMimeType, setCropMimeType] = useState<
        'image/png' | 'image/jpeg'
    >('image/jpeg');
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const cropImageRef = useRef<HTMLImageElement | null>(null);
    const registrationVirtualIdRef = useRef<HTMLDivElement | null>(null);
    const activeScrollTargetRef = useRef<string | null>(null);
    const activeScrollTimeoutRef = useRef<number | null>(null);
    const previousEmailErrorRef = useRef<string | null>(null);
    const activeSectionRef = useRef(activeSection);
    const isNavbarScrolledRef = useRef(isNavbarScrolled);
    const organizationLabels = useMemo(
        () =>
            organizations.map((organization) =>
                normalizeLookupLabel(organization.label),
            ),
        [organizations],
    );
    const participantTypeLabels = useMemo(
        () =>
            participantTypes.flatMap((type) => [
                normalizeLookupLabel(type.label),
                normalizeLookupLabel(type.value),
            ]),
        [participantTypes],
    );
    const selectedEventOption = useMemo(
        () => events.find((event) => event.value === selectedEvent) ?? null,
        [events, selectedEvent],
    );
    const selectedEventLabel = selectedEventOption?.label ?? '';
    const selectedOrganizationLabel = useMemo(
        () =>
            selectedOrganization === otherOrganizationValue
                ? 'Others'
                : (organizations.find(
                      (organization) =>
                          organization.value === selectedOrganization,
                  )?.label ?? ''),
        [organizations, selectedOrganization],
    );
    const selectedProvinceOption = useMemo(
        () =>
            provinces.find((province) => province.value === selectedProvince) ??
            null,
        [provinces, selectedProvince],
    );
    const selectedProvinceLabel = selectedProvinceOption?.label ?? '';
    const selectedMunicipalityLabel = useMemo(
        () =>
            municipalityOptions.find(
                (municipality) => municipality.value === selectedMunicipality,
            )?.label ?? '',
        [municipalityOptions, selectedMunicipality],
    );
    const selectedParticipantTypeLabel = useMemo(
        () =>
            selectedParticipantType === otherParticipantTypeValue
                ? 'Others'
                : (participantTypes.find(
                      (type) => type.value === selectedParticipantType,
                  )?.label ?? ''),
        [participantTypes, selectedParticipantType],
    );

    const setActiveSectionIfChanged = useCallback((nextSection: string) => {
        if (activeSectionRef.current === nextSection) {
            return;
        }

        activeSectionRef.current = nextSection;
        setActiveSection(nextSection);
    }, []);

    const setNavbarScrolledIfChanged = useCallback((nextScrolled: boolean) => {
        if (isNavbarScrolledRef.current === nextScrolled) {
            return;
        }

        isNavbarScrolledRef.current = nextScrolled;
        setIsNavbarScrolled(nextScrolled);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        async function loadLookups() {
            try {
                const response = await fetch('/welcome-lookups', {
                    headers: {
                        Accept: 'application/json',
                    },
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error('Unable to load registration options.');
                }

                const data = (await response.json()) as WelcomeProps;

                setOrganizations(data.organizations);
                setProvinces(data.provinces);
                setParticipantTypes(data.participantTypes);
                setEvents(data.events);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                toast.error(
                    'Registration options could not be loaded. Please refresh the page.',
                    {
                        duration: 7000,
                        closeButton: true,
                    },
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLookupsLoading(false);
                }
            }
        }

        loadLookups();

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!selectedProvince) {
            setMunicipalityOptions([]);
            setSelectedMunicipality('');

            return;
        }

        const controller = new AbortController();

        async function loadMunicipalities() {
            setMunicipalitiesLoading(true);

            try {
                const searchParams = new URLSearchParams({
                    province: selectedProvince,
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

                const data = (await response.json()) as LookupOption[];

                setMunicipalityOptions(data);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                setMunicipalityOptions([]);
                toast.error(
                    'Municipalities could not be loaded. Please select the province again.',
                    {
                        duration: 7000,
                        closeButton: true,
                    },
                );
            } finally {
                if (!controller.signal.aborted) {
                    setMunicipalitiesLoading(false);
                }
            }
        }

        loadMunicipalities();

        return () => controller.abort();
    }, [selectedProvince]);

    function scrollToSection(
        event: React.MouseEvent<HTMLAnchorElement>,
        sectionId: string,
        path?: string,
    ) {
        event.preventDefault();
        setActiveSectionIfChanged(sectionId);

        if (path && window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }

        activeScrollTargetRef.current = sectionId;

        if (activeScrollTimeoutRef.current) {
            window.clearTimeout(activeScrollTimeoutRef.current);
        }

        activeScrollTimeoutRef.current = window.setTimeout(() => {
            activeScrollTargetRef.current = null;
        }, 1000);

        document
            .getElementById(sectionId)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    useEffect(() => {
        let scrollAnimationFrame = 0;

        const updateScrollState = () => {
            scrollAnimationFrame = 0;

            setNavbarScrolledIfChanged(window.scrollY > 12);

            if (activeScrollTargetRef.current) {
                setActiveSectionIfChanged(activeScrollTargetRef.current);

                return;
            }

            const registrationSection = document.getElementById('registration');
            let nextSection = 'home';

            if (
                registrationSection &&
                registrationSection.getBoundingClientRect().top <= 160
            ) {
                nextSection = 'registration';
            }

            setActiveSectionIfChanged(nextSection);

            const nextPath = getSectionPath(nextSection);

            if (window.location.pathname !== nextPath) {
                window.history.replaceState({}, '', nextPath);
            }
        };

        const handleScroll = () => {
            if (scrollAnimationFrame) {
                return;
            }

            scrollAnimationFrame =
                window.requestAnimationFrame(updateScrollState);
        };

        updateScrollState();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);

            if (scrollAnimationFrame) {
                window.cancelAnimationFrame(scrollAnimationFrame);
            }

            if (activeScrollTimeoutRef.current) {
                window.clearTimeout(activeScrollTimeoutRef.current);
            }
        };
    }, [setActiveSectionIfChanged, setNavbarScrolledIfChanged]);

    useEffect(() => {
        if (registrationSuccess) {
            const animationFrame = window.requestAnimationFrame(() => {
                setRegistrationSuccessDialogOpen(true);
            });

            return () => window.cancelAnimationFrame(animationFrame);
        }
    }, [registrationSuccess]);

    useEffect(() => {
        const emailError = pageErrors.email ?? null;

        if (
            emailError &&
            emailError !== previousEmailErrorRef.current &&
            /registered|taken|already/i.test(emailError)
        ) {
            toast.error('Account is already registered', {
                duration: 7000,
                closeButton: true,
            });
        }

        previousEmailErrorRef.current = emailError;
    }, [pageErrors.email]);

    useEffect(() => {
        if (!registrationSuccess || !registrationSuccessDialogOpen) {
            return;
        }

        let resizeAnimationFrame = 0;

        function updateConfettiSize() {
            resizeAnimationFrame = 0;

            setConfettiSize((currentSize) => {
                const nextSize = {
                    width: window.innerWidth,
                    height: window.innerHeight,
                };

                if (
                    currentSize.width === nextSize.width &&
                    currentSize.height === nextSize.height
                ) {
                    return currentSize;
                }

                return nextSize;
            });
        }

        function handleResize() {
            if (resizeAnimationFrame) {
                return;
            }

            resizeAnimationFrame =
                window.requestAnimationFrame(updateConfettiSize);
        }

        updateConfettiSize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);

            if (resizeAnimationFrame) {
                window.cancelAnimationFrame(resizeAnimationFrame);
            }
        };
    }, [registrationSuccess, registrationSuccessDialogOpen]);

    useLayoutEffect(() => {
        const initialSection = getInitialActiveSection();
        let animationFrame = 0;

        function revealWelcomePage() {
            animationFrame = window.requestAnimationFrame(() => {
                delete document.documentElement.dataset.welcomeHydrating;
            });
        }

        if (initialSection === 'home') {
            window.scrollTo(0, 0);
            revealWelcomePage();

            return () => window.cancelAnimationFrame(animationFrame);
        }

        document
            .getElementById(initialSection)
            ?.scrollIntoView({ block: 'start' });
        revealWelcomePage();

        return () => window.cancelAnimationFrame(animationFrame);
    }, []);

    function handleProfilePhotoSelect(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            setProfilePhotoError('Upload a PNG, JPG, or JPEG image.');

            return;
        }

        setProfilePhotoError('');
        setCropMimeType(file.type === 'image/png' ? 'image/png' : 'image/jpeg');
        setCrop({
            unit: '%',
            x: 10,
            y: 10,
            width: 80,
            height: 80,
        });
        setCompletedCrop(undefined);

        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(String(reader.result));
            setCropDialogOpen(true);
        };
        reader.readAsDataURL(file);
    }

    function removeProfilePhoto() {
        setProfilePhotoDataUrl('');
        setProfilePhotoPreview('');
        setProfilePhotoError('');
        setCropImageSrc('');
        setCompletedCrop(undefined);
    }

    function scrollToRegistration(event: React.MouseEvent<HTMLAnchorElement>) {
        scrollToSection(event, 'registration', '/registration');
    }

    function handleUseCroppedProfilePhoto() {
        const image = cropImageRef.current;

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
            completedCrop ?? fallbackCrop,
            cropMimeType,
        );

        if (!croppedDataUrl) {
            setProfilePhotoError('Could not crop the selected image.');

            return;
        }

        setProfilePhotoDataUrl(croppedDataUrl);
        setProfilePhotoPreview(croppedDataUrl);
        setCropDialogOpen(false);
    }

    async function handleDownloadRegistrationVirtualId() {
        if (!registrationVirtualIdRef.current || !registrationSuccess) {
            return;
        }

        try {
            const dataUrl = await toPng(registrationVirtualIdRef.current, {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: '#f8fbff',
            });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${registrationSuccess.participant_id ?? 'cers-virtual-id'}.png`;
            link.click();
        } catch {
            toast.error('Unable to download virtual ID', {
                duration: 5000,
                closeButton: true,
            });
        }
    }

    function handleOtherOrganizationBlur(
        event: React.FocusEvent<HTMLInputElement>,
    ) {
        if (
            organizationLabels.includes(
                normalizeLookupLabel(event.currentTarget.value),
            )
        ) {
            toast.error(
                'This school or organization already exists. Please search for it in the dropdown.',
                {
                    duration: 7000,
                    closeButton: true,
                },
            );
        }
    }

    function handleOtherParticipantTypeBlur(
        event: React.FocusEvent<HTMLInputElement>,
    ) {
        if (
            participantTypeLabels.includes(
                normalizeLookupLabel(event.currentTarget.value),
            )
        ) {
            toast.error(
                'This participant type already exists. Please search for it in the dropdown.',
                {
                    duration: 7000,
                    closeButton: true,
                },
            );
        }
    }

    return (
        <>
            <Head title="CHED Events Registration System">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    rel="preload"
                    as="image"
                    href="/ched_logo-128.png"
                    type="image/png"
                />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="relative isolate min-h-screen overflow-x-clip scroll-smooth bg-[#f5f9ff] text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(125deg,rgba(0,56,168,0.12)_0%,rgba(255,255,255,0)_35%,rgba(0,90,180,0.08)_62%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(125deg,rgba(37,99,235,0.18)_0%,rgba(10,10,10,0)_35%,rgba(14,165,233,0.10)_62%,rgba(10,10,10,0)_100%)]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(22deg,rgba(255,255,255,0.94)_0%,rgba(248,251,255,0.68)_42%,rgba(229,240,255,0.82)_100%),linear-gradient(155deg,rgba(0,56,168,0.09)_8%,rgba(255,255,255,0)_36%,rgba(0,56,168,0.06)_78%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(22deg,rgba(10,10,10,0.96)_0%,rgba(15,23,42,0.88)_42%,rgba(17,24,39,0.94)_100%),linear-gradient(155deg,rgba(37,99,235,0.14)_8%,rgba(10,10,10,0)_36%,rgba(14,165,233,0.10)_78%,rgba(10,10,10,0)_100%)]"
                />
                <header
                    className={cn(
                        'sticky top-0 z-50 border-b transition-all duration-300',
                        isNavbarScrolled
                            ? 'border-white/40 bg-white/75 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/70 dark:shadow-black/30'
                            : 'border-[#d9e5f5] bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90',
                    )}
                >
                    <nav
                        className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
                        aria-label="Main navigation"
                    >
                        <a
                            href="/home"
                            onClick={(event) =>
                                scrollToSection(event, 'home', '/home')
                            }
                            className="flex items-center gap-3"
                        >
                            <img
                                src="/ched_logo-128.png"
                                alt="Commission on Higher Education logo"
                                className="h-12 w-12 object-contain"
                                decoding="async"
                                fetchPriority="high"
                            />
                            <span>
                                <span className="block text-sm font-semibold tracking-wide text-slate-950 dark:text-white">
                                    CERS
                                </span>
                                <span className="block text-xs text-slate-600 sm:text-sm dark:text-neutral-400">
                                    CHED Events Registration System
                                </span>
                            </span>
                        </a>

                        <div className="flex items-center justify-between gap-4 lg:gap-8">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 dark:text-neutral-300">
                                {navigationLinks.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        onClick={(event) =>
                                            scrollToSection(
                                                event,
                                                link.sectionId,
                                                link.href,
                                            )
                                        }
                                        className={cn(
                                            'relative py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]',
                                            activeSection === link.sectionId
                                                ? 'font-semibold text-[#0038A8] after:absolute after:right-0 after:-bottom-1 after:left-0 after:h-0.5 after:rounded-full after:bg-[#0038A8] dark:text-blue-300 dark:after:bg-blue-300'
                                                : 'hover:text-[#0038A8] dark:hover:text-blue-300',
                                        )}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                                <button
                                    type="button"
                                    aria-label={`Switch to ${nextAppearance} mode`}
                                    onClick={() =>
                                        updateAppearance(nextAppearance)
                                    }
                                    className="inline-flex size-11 items-center justify-center rounded-xl border border-[#d9e5f5] bg-white text-slate-700 shadow-sm transition hover:border-[#0038A8]/30 hover:text-[#0038A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:text-white"
                                >
                                    <AppearanceIcon className="size-5" />
                                </button>

                                <Link
                                    href={accessHref}
                                    className="inline-flex items-center justify-center rounded-xl border border-[#0038A8] bg-[#0038A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#002f8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                                >
                                    {auth.user ? 'Participants' : 'Login'}
                                </Link>
                            </div>
                        </div>
                    </nav>
                </header>

                <main id="home">
                    <section className="relative overflow-hidden">
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(252,209,22,0.20),transparent_32%),radial-gradient(circle_at_top_right,rgba(0,56,168,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.82)_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(252,209,22,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_30%),linear-gradient(180deg,rgba(10,10,10,0)_0%,rgba(10,10,10,0.72)_100%)]" />
                        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
                            <div>
                                <div className="mb-6 inline-flex items-center gap-4">
                                    <img
                                        src="/ched_logo-128.png"
                                        alt="CHED logo"
                                        className="size-16 object-contain"
                                        decoding="async"
                                        fetchPriority="high"
                                    />
                                    <img
                                        src="/unifast.webp"
                                        alt="UniFAST logo"
                                        className="size-16 object-contain"
                                        decoding="async"
                                    />
                                    <img
                                        src="/achieve-160.png"
                                        alt="ACHIEVE logo"
                                        className="-m-2 size-20 object-contain"
                                        decoding="async"
                                    />
                                </div>

                                <h1 className="max-w-4xl text-4xl leading-tight font-bold text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                                    CHED Events Registration System
                                </h1>

                                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-neutral-300">
                                    A centralized platform for managing event
                                    registration, participant attendance, and
                                    event-related records for CHED activities.
                                </p>

                                <div className="mt-8 flex">
                                    <a
                                        href="#registration"
                                        onClick={scrollToRegistration}
                                        className="group inline-flex w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-[#0038A8] px-10 py-5 text-base font-bold text-white shadow-xl shadow-[#0038A8]/25 transition hover:-translate-y-0.5 hover:bg-[#002f8f] hover:shadow-2xl hover:shadow-[#0038A8]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] sm:text-lg"
                                    >
                                        Register Now
                                        <span className="flex size-8 items-center justify-center rounded-full bg-white/15 transition group-hover:translate-y-1 group-hover:bg-white/20">
                                            <ArrowDown className="size-4" />
                                        </span>
                                    </a>
                                </div>
                            </div>

                            <WelcomeVirtualIdPreview />
                        </div>
                    </section>

                    <section
                        id="registration"
                        className="scroll-mt-24 border-y border-[#d9e5f5] bg-white/85 py-16 backdrop-blur-[2px] sm:py-20 dark:border-neutral-800 dark:bg-neutral-950/80"
                    >
                        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                            <Form
                                action="/event-registration"
                                method="post"
                                resetOnSuccess={[
                                    'password',
                                    'password_confirmation',
                                ]}
                                options={{ preserveScroll: true }}
                                onError={(errors) =>
                                    scrollToFirstRegistrationError(errors)
                                }
                                disableWhileProcessing
                                className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-md shadow-slate-200/70 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30"
                            >
                                {({ processing, errors }) => (
                                    <div className="grid gap-8">
                                        <input
                                            type="text"
                                            name="website"
                                            tabIndex={-1}
                                            autoComplete="off"
                                            aria-hidden="true"
                                            className="hidden"
                                        />

                                        <div className="border-b border-[#d9e5f5] pb-6 dark:border-neutral-800">
                                            <p className="text-sm font-semibold tracking-wide text-[#CE1126] uppercase">
                                                Event Registration
                                            </p>
                                            <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
                                                Participant Registration Form
                                            </h2>
                                        </div>

                                        <section className="grid gap-5">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                                                    Participant details
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                                                    Tell us who will attend the
                                                    event.
                                                </p>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="given_name">
                                                        Given Name{' '}
                                                        <RequiredMark />
                                                    </Label>
                                                    <Input
                                                        id="given_name"
                                                        type="text"
                                                        required
                                                        autoFocus
                                                        autoComplete="given-name"
                                                        name="given_name"
                                                        placeholder="Juan"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.given_name
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="middle_name">
                                                        Middle Name
                                                    </Label>
                                                    <Input
                                                        id="middle_name"
                                                        type="text"
                                                        autoComplete="additional-name"
                                                        name="middle_name"
                                                        placeholder="Santos"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.middle_name
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="surname">
                                                        Surname <RequiredMark />
                                                    </Label>
                                                    <Input
                                                        id="surname"
                                                        type="text"
                                                        required
                                                        autoComplete="family-name"
                                                        name="surname"
                                                        placeholder="Dela Cruz"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={errors.surname}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div className="grid gap-2 md:col-span-2">
                                                    <Label htmlFor="email">
                                                        Email address{' '}
                                                        <RequiredMark />
                                                    </Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        required
                                                        autoComplete="email"
                                                        name="email"
                                                        placeholder="juan@example.com"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={errors.email}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="phone">
                                                        Contact number{' '}
                                                        <RequiredMark />
                                                    </Label>
                                                    <Input
                                                        id="phone"
                                                        type="tel"
                                                        required
                                                        autoComplete="tel"
                                                        inputMode="numeric"
                                                        maxLength={11}
                                                        name="phone"
                                                        onChange={(event) => {
                                                            event.target.value =
                                                                normalizeContactNumber(
                                                                    event.target
                                                                        .value,
                                                                );
                                                        }}
                                                        pattern="09[0-9]{9}"
                                                        placeholder="09XX XXX XXXX"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={errors.phone}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <p
                                                        id="province_label"
                                                        className="text-sm font-medium"
                                                    >
                                                        Province{' '}
                                                        <RequiredMark />
                                                    </p>
                                                    <input
                                                        type="hidden"
                                                        name="province"
                                                        value={selectedProvince}
                                                        readOnly
                                                    />
                                                    <Popover
                                                        open={
                                                            provincePopoverOpen
                                                        }
                                                        onOpenChange={
                                                            setProvincePopoverOpen
                                                        }
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                role="combobox"
                                                                data-registration-field="province"
                                                                aria-labelledby="province_label"
                                                                aria-expanded={
                                                                    provincePopoverOpen
                                                                }
                                                                className={
                                                                    comboboxButtonClass
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        comboboxValueClass
                                                                    }
                                                                >
                                                                    {selectedProvinceLabel ||
                                                                        'Search and select province'}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            align="start"
                                                            className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                                                        >
                                                            <Command>
                                                                <CommandInput placeholder="Search province..." />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        {lookupsLoading
                                                                            ? 'Loading provinces...'
                                                                            : 'No province found.'}
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        {provinces.map(
                                                                            (
                                                                                province,
                                                                            ) => (
                                                                                <CommandItem
                                                                                    key={
                                                                                        province.value
                                                                                    }
                                                                                    className={
                                                                                        commandItemClass
                                                                                    }
                                                                                    value={
                                                                                        province.label
                                                                                    }
                                                                                    onSelect={() => {
                                                                                        setSelectedProvince(
                                                                                            province.value,
                                                                                        );
                                                                                        setSelectedMunicipality(
                                                                                            '',
                                                                                        );
                                                                                        setProvincePopoverOpen(
                                                                                            false,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            'mt-0.5 mr-2 size-4',
                                                                                            selectedProvince ===
                                                                                                province.value
                                                                                                ? 'opacity-100'
                                                                                                : 'opacity-0',
                                                                                        )}
                                                                                    />
                                                                                    <span
                                                                                        className={
                                                                                            commandItemTextClass
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            province.label
                                                                                        }
                                                                                    </span>
                                                                                </CommandItem>
                                                                            ),
                                                                        )}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <InputError
                                                        message={
                                                            errors.province
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <p
                                                        id="municipality_label"
                                                        className="text-sm font-medium"
                                                    >
                                                        Municipality or city{' '}
                                                        <RequiredMark />
                                                    </p>
                                                    <input
                                                        type="hidden"
                                                        name="municipality"
                                                        value={
                                                            selectedMunicipality
                                                        }
                                                        readOnly
                                                    />
                                                    <Popover
                                                        open={
                                                            municipalityPopoverOpen
                                                        }
                                                        onOpenChange={
                                                            setMunicipalityPopoverOpen
                                                        }
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                role="combobox"
                                                                data-registration-field="municipality"
                                                                aria-labelledby="municipality_label"
                                                                aria-expanded={
                                                                    municipalityPopoverOpen
                                                                }
                                                                disabled={
                                                                    !selectedProvince
                                                                }
                                                                className={cn(
                                                                    comboboxButtonClass,
                                                                    'disabled:cursor-not-allowed disabled:opacity-70',
                                                                )}
                                                            >
                                                                <span
                                                                    className={
                                                                        comboboxValueClass
                                                                    }
                                                                >
                                                                    {selectedMunicipalityLabel ||
                                                                        (selectedProvince
                                                                            ? 'Search and select municipality or city'
                                                                            : 'Select province first')}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            align="start"
                                                            className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                                                        >
                                                            <Command>
                                                                <CommandInput placeholder="Search municipality or city..." />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        {municipalitiesLoading
                                                                            ? 'Loading municipalities...'
                                                                            : 'No municipality or city found.'}
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        {municipalityOptions.map(
                                                                            (
                                                                                municipality,
                                                                            ) => (
                                                                                <CommandItem
                                                                                    key={
                                                                                        municipality.value
                                                                                    }
                                                                                    className={
                                                                                        commandItemClass
                                                                                    }
                                                                                    value={
                                                                                        municipality.label
                                                                                    }
                                                                                    onSelect={() => {
                                                                                        setSelectedMunicipality(
                                                                                            municipality.value,
                                                                                        );
                                                                                        setMunicipalityPopoverOpen(
                                                                                            false,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            'mt-0.5 mr-2 size-4',
                                                                                            selectedMunicipality ===
                                                                                                municipality.value
                                                                                                ? 'opacity-100'
                                                                                                : 'opacity-0',
                                                                                        )}
                                                                                    />
                                                                                    <span
                                                                                        className={
                                                                                            commandItemTextClass
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            municipality.label
                                                                                        }
                                                                                    </span>
                                                                                </CommandItem>
                                                                            ),
                                                                        )}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <InputError
                                                        message={
                                                            errors.municipality
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div className="grid gap-2 md:col-span-3">
                                                    <p
                                                        id="organization_label"
                                                        className="text-sm font-medium"
                                                    >
                                                        School or organization{' '}
                                                        <RequiredMark />
                                                    </p>
                                                    {selectedOrganization !==
                                                        otherOrganizationValue && (
                                                        <input
                                                            type="hidden"
                                                            name="organization"
                                                            value={
                                                                selectedOrganization
                                                            }
                                                            readOnly
                                                        />
                                                    )}
                                                    <Popover
                                                        open={
                                                            organizationPopoverOpen
                                                        }
                                                        onOpenChange={
                                                            setOrganizationPopoverOpen
                                                        }
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                role="combobox"
                                                                data-registration-field="organization"
                                                                aria-labelledby="organization_label"
                                                                aria-expanded={
                                                                    organizationPopoverOpen
                                                                }
                                                                className={
                                                                    comboboxButtonClass
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        comboboxValueClass
                                                                    }
                                                                >
                                                                    {selectedOrganizationLabel ||
                                                                        'Search and select school or organization'}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            align="start"
                                                            className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                                                        >
                                                            <Command>
                                                                <CommandInput placeholder="Search school or organization..." />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        {lookupsLoading
                                                                            ? 'Loading organizations...'
                                                                            : 'No school or organization found.'}
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        <CommandItem
                                                                            value="Others"
                                                                            className={
                                                                                commandItemClass
                                                                            }
                                                                            onSelect={() => {
                                                                                setSelectedOrganization(
                                                                                    otherOrganizationValue,
                                                                                );
                                                                                setOrganizationPopoverOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    'mt-0.5 mr-2 size-4',
                                                                                    selectedOrganization ===
                                                                                        otherOrganizationValue
                                                                                        ? 'opacity-100'
                                                                                        : 'opacity-0',
                                                                                )}
                                                                            />
                                                                            <span
                                                                                className={
                                                                                    commandItemTextClass
                                                                                }
                                                                            >
                                                                                Others
                                                                            </span>
                                                                        </CommandItem>
                                                                        {organizations.map(
                                                                            (
                                                                                organization,
                                                                            ) => (
                                                                                <CommandItem
                                                                                    key={
                                                                                        organization.value
                                                                                    }
                                                                                    className={
                                                                                        commandItemClass
                                                                                    }
                                                                                    value={
                                                                                        organization.label
                                                                                    }
                                                                                    onSelect={() => {
                                                                                        setSelectedOrganization(
                                                                                            organization.value,
                                                                                        );
                                                                                        setOrganizationPopoverOpen(
                                                                                            false,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            'mt-0.5 mr-2 size-4',
                                                                                            selectedOrganization ===
                                                                                                organization.value
                                                                                                ? 'opacity-100'
                                                                                                : 'opacity-0',
                                                                                        )}
                                                                                    />
                                                                                    <span
                                                                                        className={
                                                                                            commandItemTextClass
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            organization.label
                                                                                        }
                                                                                    </span>
                                                                                </CommandItem>
                                                                            ),
                                                                        )}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    {selectedOrganization ===
                                                        otherOrganizationValue && (
                                                        <Input
                                                            type="text"
                                                            required
                                                            autoComplete="organization"
                                                            name="organization"
                                                            placeholder="Enter school or organization"
                                                            onBlur={
                                                                handleOtherOrganizationBlur
                                                            }
                                                            className={
                                                                fieldClass
                                                            }
                                                        />
                                                    )}
                                                    <InputError
                                                        message={
                                                            errors.organization
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-3">
                                                <p className="text-sm font-medium">
                                                    Profile image
                                                </p>
                                                <input
                                                    type="hidden"
                                                    name="avatar"
                                                    value={profilePhotoDataUrl}
                                                    readOnly
                                                />
                                                <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-[#d9e5f5] bg-[#f8fbff] p-4 sm:flex-row sm:items-center dark:border-neutral-700 dark:bg-neutral-950">
                                                    <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d9e5f5] bg-white dark:border-neutral-700 dark:bg-neutral-900">
                                                        {profilePhotoPreview ? (
                                                            <img
                                                                src={
                                                                    profilePhotoPreview
                                                                }
                                                                alt="Profile preview"
                                                                className="size-full object-cover"
                                                            />
                                                        ) : (
                                                            <ImagePlus className="size-8 text-slate-400 dark:text-neutral-500" />
                                                        )}
                                                    </div>
                                                    <div className="grid flex-1 gap-2">
                                                        <p className="text-sm text-slate-600 dark:text-neutral-400">
                                                            Upload a square
                                                            profile image for
                                                            your account.
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Label
                                                                htmlFor="profile_photo_upload"
                                                                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#0038A8] bg-[#0038A8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[#0038A8] hover:bg-[#002f8f]"
                                                            >
                                                                <ImagePlus className="mr-2 size-4" />
                                                                Choose image
                                                            </Label>
                                                            <input
                                                                id="profile_photo_upload"
                                                                type="file"
                                                                data-registration-field="avatar"
                                                                accept="image/png,image/jpeg"
                                                                className="sr-only"
                                                                onChange={
                                                                    handleProfilePhotoSelect
                                                                }
                                                            />
                                                            {profilePhotoPreview && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    aria-label="Remove profile image"
                                                                    className="rounded-xl border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-900/70 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                                                                    onClick={
                                                                        removeProfilePhoto
                                                                    }
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <InputError
                                                    message={
                                                        errors.avatar ||
                                                        profilePhotoError
                                                    }
                                                />
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <p
                                                        id="participant_type_label"
                                                        className="text-sm font-medium"
                                                    >
                                                        Participant type{' '}
                                                        <RequiredMark />
                                                    </p>
                                                    {selectedParticipantType !==
                                                        otherParticipantTypeValue && (
                                                        <input
                                                            type="hidden"
                                                            name="participant_type"
                                                            value={
                                                                selectedParticipantType
                                                            }
                                                            readOnly
                                                        />
                                                    )}
                                                    <Popover
                                                        open={
                                                            participantTypePopoverOpen
                                                        }
                                                        onOpenChange={
                                                            setParticipantTypePopoverOpen
                                                        }
                                                    >
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                role="combobox"
                                                                data-registration-field="participant_type"
                                                                aria-labelledby="participant_type_label"
                                                                aria-expanded={
                                                                    participantTypePopoverOpen
                                                                }
                                                                className={
                                                                    comboboxButtonClass
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        comboboxValueClass
                                                                    }
                                                                >
                                                                    {selectedParticipantTypeLabel ||
                                                                        'Search and select type'}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            align="start"
                                                            className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                                                        >
                                                            <Command>
                                                                <CommandInput placeholder="Search participant type..." />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        {lookupsLoading
                                                                            ? 'Loading participant types...'
                                                                            : 'No type found.'}
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        <CommandItem
                                                                            value="Others"
                                                                            className={
                                                                                commandItemClass
                                                                            }
                                                                            onSelect={() => {
                                                                                setSelectedParticipantType(
                                                                                    otherParticipantTypeValue,
                                                                                );
                                                                                setParticipantTypePopoverOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    'mt-0.5 mr-2 size-4',
                                                                                    selectedParticipantType ===
                                                                                        otherParticipantTypeValue
                                                                                        ? 'opacity-100'
                                                                                        : 'opacity-0',
                                                                                )}
                                                                            />
                                                                            <span
                                                                                className={
                                                                                    commandItemTextClass
                                                                                }
                                                                            >
                                                                                Others
                                                                            </span>
                                                                        </CommandItem>
                                                                        {participantTypes.map(
                                                                            (
                                                                                type,
                                                                            ) => (
                                                                                <CommandItem
                                                                                    key={
                                                                                        type.value
                                                                                    }
                                                                                    className={
                                                                                        commandItemClass
                                                                                    }
                                                                                    value={
                                                                                        type.label
                                                                                    }
                                                                                    onSelect={() => {
                                                                                        setSelectedParticipantType(
                                                                                            type.value,
                                                                                        );
                                                                                        setParticipantTypePopoverOpen(
                                                                                            false,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            'mt-0.5 mr-2 size-4',
                                                                                            selectedParticipantType ===
                                                                                                type.value
                                                                                                ? 'opacity-100'
                                                                                                : 'opacity-0',
                                                                                        )}
                                                                                    />
                                                                                    <span
                                                                                        className={
                                                                                            commandItemTextClass
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            type.label
                                                                                        }
                                                                                    </span>
                                                                                </CommandItem>
                                                                            ),
                                                                        )}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    {selectedParticipantType ===
                                                        otherParticipantTypeValue && (
                                                        <Input
                                                            type="text"
                                                            required
                                                            name="participant_type"
                                                            placeholder="Enter participant type"
                                                            onBlur={
                                                                handleOtherParticipantTypeBlur
                                                            }
                                                            className={
                                                                fieldClass
                                                            }
                                                        />
                                                    )}
                                                    <InputError
                                                        message={
                                                            errors.participant_type
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-3">
                                                    <p className="text-sm font-medium">
                                                        Sex <RequiredMark />
                                                    </p>
                                                    <RadioGroup
                                                        name="sex"
                                                        data-registration-field="sex"
                                                        required
                                                        className="grid grid-cols-2 gap-3"
                                                    >
                                                        <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d9e5f5] bg-[#f8fbff] px-4 text-sm font-medium text-slate-700 has-[[data-state=checked]]:border-[#0038A8] has-[[data-state=checked]]:bg-[#eef5ff] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:has-[[data-state=checked]]:border-blue-400 dark:has-[[data-state=checked]]:bg-blue-950/40">
                                                            <RadioGroupItem
                                                                value="male"
                                                                className="border-[#d9e5f5] text-[#0038A8] focus-visible:ring-[#0038A8]/15 dark:border-neutral-700"
                                                            />
                                                            Male
                                                        </label>
                                                        <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d9e5f5] bg-[#f8fbff] px-4 text-sm font-medium text-slate-700 has-[[data-state=checked]]:border-[#0038A8] has-[[data-state=checked]]:bg-[#eef5ff] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:has-[[data-state=checked]]:border-blue-400 dark:has-[[data-state=checked]]:bg-blue-950/40">
                                                            <RadioGroupItem
                                                                value="female"
                                                                className="border-[#d9e5f5] text-[#0038A8] focus-visible:ring-[#0038A8]/15 dark:border-neutral-700"
                                                            />
                                                            Female
                                                        </label>
                                                    </RadioGroup>
                                                    <InputError
                                                        message={errors.sex}
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        <section className="grid gap-4 border-t border-[#d9e5f5] pt-6 dark:border-neutral-800">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                                                    Event information
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                                                    Choose the event you want to
                                                    attend.
                                                </p>
                                            </div>

                                            <div className="grid gap-2">
                                                <p
                                                    id="event_name_label"
                                                    className="text-sm font-medium"
                                                >
                                                    Event <RequiredMark />
                                                </p>
                                                <input
                                                    type="hidden"
                                                    name="event_name"
                                                    value={selectedEvent}
                                                    readOnly
                                                />
                                                <Popover
                                                    open={eventPopoverOpen}
                                                    onOpenChange={
                                                        setEventPopoverOpen
                                                    }
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            role="combobox"
                                                            data-registration-field="event_name"
                                                            aria-labelledby="event_name_label"
                                                            aria-expanded={
                                                                eventPopoverOpen
                                                            }
                                                            className={
                                                                comboboxButtonClass
                                                            }
                                                        >
                                                            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
                                                                <span
                                                                    className={
                                                                        comboboxValueClass
                                                                    }
                                                                >
                                                                    {selectedEventLabel ||
                                                                        'Search and select event'}
                                                                </span>
                                                                {selectedEventOption ? (
                                                                    <EventStatusBadge
                                                                        event={
                                                                            selectedEventOption
                                                                        }
                                                                    />
                                                                ) : null}
                                                            </span>
                                                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        align="start"
                                                        className="w-[min(calc(100vw-2rem),var(--radix-popover-trigger-width))] p-0"
                                                    >
                                                        <Command>
                                                            <CommandInput placeholder="Search event..." />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    {lookupsLoading
                                                                        ? 'Loading events...'
                                                                        : 'No event found.'}
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {events.map(
                                                                        (
                                                                            event,
                                                                        ) => (
                                                                            <CommandItem
                                                                                key={
                                                                                    event.value
                                                                                }
                                                                                className={
                                                                                    commandItemClass
                                                                                }
                                                                                value={
                                                                                    event.label
                                                                                }
                                                                                onSelect={() => {
                                                                                    setSelectedEvent(
                                                                                        event.value,
                                                                                    );
                                                                                    setEventPopoverOpen(
                                                                                        false,
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        'mt-0.5 mr-2 size-4',
                                                                                        selectedEvent ===
                                                                                            event.value
                                                                                            ? 'opacity-100'
                                                                                            : 'opacity-0',
                                                                                    )}
                                                                                />
                                                                                <span
                                                                                    className={
                                                                                        commandItemTextClass
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        event.label
                                                                                    }
                                                                                </span>
                                                                                <EventStatusBadge
                                                                                    event={
                                                                                        event
                                                                                    }
                                                                                />
                                                                            </CommandItem>
                                                                        ),
                                                                    )}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <InputError
                                                    message={errors.event_name}
                                                />
                                            </div>
                                        </section>

                                        <section className="grid gap-4 border-t border-[#d9e5f5] pt-6 dark:border-neutral-800">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                                                    Account access
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                                                    Create a password so you can
                                                    view your registration and
                                                    attendance records.
                                                </p>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="password">
                                                        Password{' '}
                                                        <RequiredMark />
                                                    </Label>
                                                    <PasswordInput
                                                        id="password"
                                                        required
                                                        autoComplete="new-password"
                                                        name="password"
                                                        placeholder="Password"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.password
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-2">
                                                    <Label htmlFor="password_confirmation">
                                                        Confirm password{' '}
                                                        <RequiredMark />
                                                    </Label>
                                                    <PasswordInput
                                                        id="password_confirmation"
                                                        required
                                                        autoComplete="new-password"
                                                        name="password_confirmation"
                                                        placeholder="Confirm password"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.password_confirmation
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <label className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                                                <input
                                                    type="checkbox"
                                                    name="consent"
                                                    value="yes"
                                                    required
                                                    className="mt-0.5 size-5 rounded border-[#d9e5f5] text-[#0038A8] focus:ring-[#0038A8]/20 dark:border-neutral-700 dark:bg-neutral-950"
                                                />
                                                I consent to CERS sharing my
                                                full name, designation,
                                                institution, and email address
                                                with other event attendees to
                                                support networking among
                                                institutions with shared
                                                interests. <RequiredMark />
                                            </label>
                                            <InputError
                                                message={errors.consent}
                                            />
                                        </section>

                                        <Button
                                            type="submit"
                                            className="h-11 w-full rounded-xl bg-[#0038A8] font-semibold text-white shadow-sm shadow-[#0038A8]/15 hover:bg-[#002f8f] focus-visible:ring-[#0038A8]/20"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <ClipboardCheck className="size-4" />
                                            )}
                                            Submit registration
                                        </Button>
                                    </div>
                                )}
                            </Form>
                        </div>
                    </section>

                    <section className="relative overflow-hidden bg-[#0038A8] py-16 text-white sm:py-20">
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(252,209,22,0.26),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(135deg,#0038A8_0%,#0649bd_52%,#001f60_100%)]"
                        />
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-0 top-0 h-px bg-white/25"
                        />

                        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
                            <div className="max-w-3xl">
                                <h2 className="text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
                                    Secure your spot
                                </h2>
                                <p className="mt-4 max-w-2xl text-base leading-8 text-blue-50 sm:text-lg">
                                    Complete your participant profile, generate
                                    your virtual ID.
                                </p>
                            </div>

                            <div className="w-full sm:max-w-md lg:max-w-lg">
                                <a
                                    href="#registration"
                                    onClick={scrollToRegistration}
                                    className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-[#CE1126] px-8 text-base font-bold text-white shadow-xl shadow-black/20 transition hover:bg-[#b90f22] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                                >
                                    Register Now
                                </a>
                            </div>
                        </div>
                    </section>
                </main>

                <Dialog
                    open={Boolean(
                        registrationSuccess && registrationSuccessDialogOpen,
                    )}
                    onOpenChange={setRegistrationSuccessDialogOpen}
                >
                    <DialogContent
                        className="overflow-hidden sm:max-w-xl"
                        onInteractOutside={(event) => event.preventDefault()}
                    >
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#0038A8,#FCD116,#CE1126)]"
                        />
                        <DialogHeader className="pt-2 text-center sm:text-center">
                            <DialogTitle className="text-2xl font-bold text-slate-950 dark:text-white">
                                Successful registration
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                Your virtual ID has been generated by the
                                system.
                            </DialogDescription>
                        </DialogHeader>

                        {registrationSuccess ? (
                            <RegistrationSuccessVirtualId
                                registration={registrationSuccess}
                                cardRef={registrationVirtualIdRef}
                            />
                        ) : null}

                        <DialogFooter className="grid gap-2 sm:grid-cols-2 sm:justify-stretch">
                            <Button
                                type="button"
                                className="w-full rounded-xl bg-[#0038A8] font-semibold text-white shadow-sm shadow-[#0038A8]/20 hover:bg-[#002f8f]"
                                onClick={handleDownloadRegistrationVirtualId}
                            >
                                <Download className="size-4" />
                                Download your virtual ID
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-xl"
                                onClick={() =>
                                    setRegistrationSuccessDialogOpen(false)
                                }
                            >
                                Done
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {registrationSuccess && registrationSuccessDialogOpen ? (
                    <RegistrationConfetti
                        width={confettiSize.width}
                        height={confettiSize.height}
                    />
                ) : null}

                <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Crop profile image</DialogTitle>
                            <DialogDescription>
                                Adjust the image to fit your profile preview.
                            </DialogDescription>
                        </DialogHeader>

                        {cropImageSrc && (
                            <div className="overflow-hidden rounded-xl border border-[#d9e5f5] bg-[#f8fbff] p-3 dark:border-neutral-800 dark:bg-neutral-950">
                                <ReactCrop
                                    crop={crop}
                                    aspect={1}
                                    circularCrop
                                    minWidth={120}
                                    onChange={(_, percentCrop) =>
                                        setCrop(percentCrop)
                                    }
                                    onComplete={(pixelCrop) =>
                                        setCompletedCrop(pixelCrop)
                                    }
                                    className="max-h-[60vh]"
                                >
                                    <img
                                        ref={cropImageRef}
                                        src={cropImageSrc}
                                        alt="Selected profile"
                                        className="max-h-[56vh] w-full object-contain"
                                        onLoad={(event) => {
                                            const { width, height } =
                                                event.currentTarget;

                                            setCrop(
                                                getCenteredCircleCrop(
                                                    width,
                                                    height,
                                                ),
                                            );
                                            setCompletedCrop(undefined);
                                        }}
                                    />
                                </ReactCrop>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCropDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleUseCroppedProfilePhoto}
                            >
                                Use image
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <footer className="border-t border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 dark:text-neutral-400">
                        <p>
                            &copy; {currentYear} Commission on Higher Education.
                            All rights reserved.
                        </p>
                        <p className="font-medium text-slate-700 dark:text-neutral-300">
                            CHED Events Registration System
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
