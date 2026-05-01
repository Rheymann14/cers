import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    CalendarPlus,
    Check,
    CheckCircle2,
    ChevronsUpDown,
    ClipboardCheck,
    ClipboardList,
    ArrowDown,
    FileText,
    ImagePlus,
    Moon,
    QrCode,
    Trash2,
    ShieldCheck,
    Sun,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactCrop, {
    centerCrop,
    makeAspectCrop,
    type Crop,
    type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';

const navigationLinks = [
    { label: 'Home', href: '/home', sectionId: 'home' },
    { label: 'Features', href: '/features', sectionId: 'features' },
];

const features = [
    {
        title: 'Online Registration',
        description:
            'Allows participants to register for CHED events through a simple and guided form.',
        icon: CalendarPlus,
    },
    {
        title: 'QR-Based Attendance',
        description:
            'Supports faster attendance checking and participant verification during events.',
        icon: QrCode,
    },
    {
        title: 'Participant Management',
        description:
            'Helps organizers manage participant records, status, and event details in one place.',
        icon: Users,
    },
    {
        title: 'Event Reports',
        description:
            'Provides organized event data that can support documentation and reporting.',
        icon: FileText,
    },
];

const visualItems = [
    { label: 'Event Registration', icon: ClipboardList },
    { label: 'QR / Attendance', icon: QrCode },
    { label: 'Participant Records', icon: Users },
    { label: 'Reports', icon: BarChart3 },
];

const eventOptions = [
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

const participantTypeOptions = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'staff', label: 'Staff' },
    { value: 'guest', label: 'Guest' },
];

const fieldClass =
    'h-11 rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 focus-visible:border-[#0038A8] focus-visible:ring-[#0038A8]/15 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';

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

export default function Welcome() {
    const { auth } = usePage().props;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const accessHref = auth.user ? dashboard() : login();
    const nextAppearance = resolvedAppearance === 'dark' ? 'light' : 'dark';
    const AppearanceIcon = resolvedAppearance === 'dark' ? Sun : Moon;
    const currentYear = new Date().getFullYear();
    const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('home');
    const [eventPopoverOpen, setEventPopoverOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [participantTypePopoverOpen, setParticipantTypePopoverOpen] =
        useState(false);
    const [selectedParticipantType, setSelectedParticipantType] = useState('');
    const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState('');
    const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
    const [profilePhotoError, setProfilePhotoError] = useState('');
    const [cropImageSrc, setCropImageSrc] = useState('');
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
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
    const activeScrollTargetRef = useRef<string | null>(null);
    const activeScrollTimeoutRef = useRef<number | null>(null);
    const selectedEventLabel =
        eventOptions.find((event) => event.value === selectedEvent)?.label ??
        '';
    const selectedParticipantTypeLabel =
        participantTypeOptions.find(
            (type) => type.value === selectedParticipantType,
        )?.label ?? '';

    function scrollToSection(
        event: React.MouseEvent<HTMLAnchorElement>,
        sectionId: string,
        path?: string,
    ) {
        event.preventDefault();
        setActiveSection(sectionId);

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
        const handleScroll = () => {
            setIsNavbarScrolled(window.scrollY > 12);

            if (activeScrollTargetRef.current) {
                setActiveSection(activeScrollTargetRef.current);
                return;
            }

            const featureSection = document.getElementById('features');
            const nextSection =
                featureSection &&
                featureSection.getBoundingClientRect().top <= 160
                    ? 'features'
                    : 'home';

            setActiveSection(nextSection);

            const nextPath = nextSection === 'features' ? '/features' : '/home';

            if (window.location.pathname !== nextPath) {
                window.history.replaceState({}, '', nextPath);
            }
        };

        if (window.location.pathname === '/features') {
            setActiveSection('features');
            requestAnimationFrame(() => {
                document
                    .getElementById('features')
                    ?.scrollIntoView({ block: 'start' });
            });
        }

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);

            if (activeScrollTimeoutRef.current) {
                window.clearTimeout(activeScrollTimeoutRef.current);
            }
        };
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
        scrollToSection(event, 'registration');
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

    return (
        <>
            <Head title="CHED Event Registration System">
                <link rel="preconnect" href="https://fonts.bunny.net" />
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
                                src="/ched_logo.png"
                                alt="Commission on Higher Education logo"
                                className="h-12 w-12 object-contain"
                            />
                            <span>
                                <span className="block text-sm font-semibold tracking-wide text-slate-950 dark:text-white">
                                    CERS
                                </span>
                                <span className="block text-xs text-slate-600 sm:text-sm dark:text-neutral-400">
                                    CHED Event Registration System
                                </span>
                            </span>
                        </a>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-8">
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

                            <div className="flex items-center gap-3">
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
                                    {auth.user ? 'Dashboard' : 'Login'}
                                </Link>
                            </div>
                        </div>
                    </nav>
                </header>

                <main id="home">
                    <section className="relative overflow-hidden">
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(252,209,22,0.20),transparent_32%),radial-gradient(circle_at_top_right,rgba(0,56,168,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.82)_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(252,209,22,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_30%),linear-gradient(180deg,rgba(10,10,10,0)_0%,rgba(10,10,10,0.72)_100%)]" />
                        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
                            <div className="motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in motion-safe:slide-in-from-bottom-3">
                                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9e5f5] bg-white px-4 py-2 text-sm font-medium text-[#0038A8] shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-blue-300">
                                    <ShieldCheck className="h-4 w-4 text-[#CE1126]" />
                                    Government event registration platform
                                </div>

                                <h1 className="max-w-4xl text-4xl leading-tight font-bold text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                                    CHED Event Registration System
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

                            <div className="rounded-2xl border border-[#d9e5f5] bg-white p-5 shadow-md shadow-slate-200/70 motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:slide-in-from-bottom-4 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30">
                                <div className="rounded-2xl border border-[#d9e5f5] bg-[#f8fbff] p-5 dark:border-neutral-800 dark:bg-neutral-950">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-[#0038A8] dark:text-blue-300">
                                                Event Operations
                                            </p>
                                            <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                                                CERS Workflow
                                            </h2>
                                        </div>
                                        <span className="rounded-full bg-[#FCD116] px-3 py-1 text-xs font-bold text-[#1f2937]">
                                            CHED
                                        </span>
                                    </div>

                                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                        {visualItems.map((item) => {
                                            const Icon = item.icon;

                                            return (
                                                <div
                                                    key={item.label}
                                                    className="rounded-2xl border border-[#d9e5f5] bg-white p-4 shadow-sm transition hover:border-[#0038A8]/25 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-400/30"
                                                >
                                                    <Icon className="h-6 w-6 text-[#0038A8]" />
                                                    <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-neutral-100">
                                                        {item.label}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                    {['Secure', 'Organized', 'Accessible'].map(
                                        (item) => (
                                            <div
                                                key={item}
                                                className="flex items-center gap-2 rounded-xl border border-[#d9e5f5] bg-white px-3 py-3 text-sm font-medium text-slate-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                                            >
                                                <CheckCircle2 className="h-4 w-4 text-[#CE1126]" />
                                                {item}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
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
                                disableWhileProcessing
                                className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-md shadow-slate-200/70 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30"
                            >
                                {({ processing, errors }) => (
                                    <div className="grid gap-8">
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
                                                        Given Name
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
                                                        Surname
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
                                                        Email address
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
                                                        Contact number
                                                    </Label>
                                                    <Input
                                                        id="phone"
                                                        type="tel"
                                                        required
                                                        autoComplete="tel"
                                                        name="phone"
                                                        placeholder="09XX XXX XXXX"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={errors.phone}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div className="grid gap-2 md:col-span-3">
                                                    <Label htmlFor="organization">
                                                        School or organization
                                                    </Label>
                                                    <Input
                                                        id="organization"
                                                        type="text"
                                                        required
                                                        autoComplete="organization"
                                                        name="organization"
                                                        placeholder="Institution name"
                                                        className={fieldClass}
                                                    />
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
                                                        Participant type
                                                    </p>
                                                    <input
                                                        type="hidden"
                                                        name="participant_type"
                                                        value={
                                                            selectedParticipantType
                                                        }
                                                        readOnly
                                                    />
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
                                                                aria-labelledby="participant_type_label"
                                                                aria-expanded={
                                                                    participantTypePopoverOpen
                                                                }
                                                                className="h-11 w-full justify-between rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 font-normal text-slate-700 hover:bg-[#f8fbff] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-950"
                                                            >
                                                                {selectedParticipantTypeLabel ||
                                                                    'Search and select type'}
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
                                                                        No type
                                                                        found.
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        {participantTypeOptions.map(
                                                                            (
                                                                                type,
                                                                            ) => (
                                                                                <CommandItem
                                                                                    key={
                                                                                        type.value
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
                                                                                            'mr-2 size-4',
                                                                                            selectedParticipantType ===
                                                                                                type.value
                                                                                                ? 'opacity-100'
                                                                                                : 'opacity-0',
                                                                                        )}
                                                                                    />
                                                                                    {
                                                                                        type.label
                                                                                    }
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
                                                            errors.participant_type
                                                        }
                                                    />
                                                </div>

                                                <div className="grid gap-3">
                                                    <p className="text-sm font-medium">
                                                        Sex
                                                    </p>
                                                    <RadioGroup
                                                        name="sex"
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
                                                    Event
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
                                                            aria-labelledby="event_name_label"
                                                            aria-expanded={
                                                                eventPopoverOpen
                                                            }
                                                            className="h-11 w-full justify-between rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 font-normal text-slate-700 hover:bg-[#f8fbff] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-950"
                                                        >
                                                            {selectedEventLabel ||
                                                                'Search and select event'}
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
                                                                    No event
                                                                    found.
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {eventOptions.map(
                                                                        (
                                                                            event,
                                                                        ) => (
                                                                            <CommandItem
                                                                                key={
                                                                                    event.value
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
                                                                                        'mr-2 size-4',
                                                                                        selectedEvent ===
                                                                                            event.value
                                                                                            ? 'opacity-100'
                                                                                            : 'opacity-0',
                                                                                    )}
                                                                                />
                                                                                {
                                                                                    event.label
                                                                                }
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
                                                        Password
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
                                                        Confirm password
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
                                                    className="mt-1 size-4 rounded border-[#d9e5f5] text-[#0038A8] focus:ring-[#0038A8]/20 dark:border-neutral-700 dark:bg-neutral-950"
                                                />
                                                To promote networking between
                                                institutions with common
                                                interests, I give my consent to
                                                CHED to share my full name,
                                                designation, institution, and
                                                email address to other attendees
                                                of the event.
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

                    <section
                        id="features"
                        className="bg-white/85 py-16 backdrop-blur-[2px] sm:py-20 dark:bg-neutral-950/80"
                    >
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="max-w-2xl">
                                <p className="text-sm font-semibold tracking-wide text-[#CE1126] uppercase">
                                    Features
                                </p>
                                <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl dark:text-white">
                                    CHED Event Registration System
                                </h2>
                            </div>

                            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                {features.map((feature) => {
                                    const Icon = feature.icon;

                                    return (
                                        <article
                                            key={feature.title}
                                            className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#0038A8]/30 hover:shadow-md motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in motion-safe:slide-in-from-bottom-2 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/20 dark:hover:border-blue-400/30"
                                        >
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#0038A8] dark:bg-blue-950/50 dark:text-blue-300">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                                                {feature.description}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </main>

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
                            CHED Event Registration System
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
