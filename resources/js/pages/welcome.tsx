import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    CalendarPlus,
    Check,
    CheckCircle2,
    ChevronsUpDown,
    ClipboardCheck,
    ClipboardList,
    FileText,
    ImagePlus,
    QrCode,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import ReactCrop, {
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
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';

const navigationLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Features', href: '#features' },
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
    'h-11 rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 focus-visible:border-[#0038A8] focus-visible:ring-[#0038A8]/15';

function getCroppedImageDataUrl(
    image: HTMLImageElement,
    crop: PixelCrop,
    mimeType: 'image/png' | 'image/jpeg',
) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = Math.max(1, Math.floor(crop.width * scaleX));
    canvas.height = Math.max(1, Math.floor(crop.height * scaleY));

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
        canvas.width,
        canvas.height,
    );

    return canvas.toDataURL(mimeType, 0.92);
}

export default function Welcome() {
    const { auth } = usePage().props;
    const accessHref = auth.user ? dashboard() : login();
    const currentYear = new Date().getFullYear();
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
    const [cropMimeType, setCropMimeType] = useState<'image/png' | 'image/jpeg'>(
        'image/jpeg',
    );
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
    });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const cropImageRef = useRef<HTMLImageElement | null>(null);
    const selectedEventLabel =
        eventOptions.find((event) => event.value === selectedEvent)?.label ??
        '';
    const selectedParticipantTypeLabel =
        participantTypeOptions.find(
            (type) => type.value === selectedParticipantType,
        )?.label ?? '';

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

    function useCroppedProfilePhoto() {
        const image = cropImageRef.current;

        if (!image) {
            return;
        }

        const fallbackCrop: PixelCrop = {
            unit: 'px',
            x: Math.round(image.width * 0.1),
            y: Math.round(image.height * 0.1),
            width: Math.round(image.width * 0.8),
            height: Math.round(image.height * 0.8),
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

            <div className="relative isolate min-h-screen overflow-hidden bg-[#f5f9ff] text-slate-900">
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(125deg,rgba(0,56,168,0.12)_0%,rgba(255,255,255,0)_35%,rgba(0,90,180,0.08)_62%,rgba(255,255,255,0)_100%)]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(22deg,rgba(255,255,255,0.94)_0%,rgba(248,251,255,0.68)_42%,rgba(229,240,255,0.82)_100%),linear-gradient(155deg,rgba(0,56,168,0.09)_8%,rgba(255,255,255,0)_36%,rgba(0,56,168,0.06)_78%,rgba(255,255,255,0)_100%)]"
                />
                <header className="sticky top-0 z-50 border-b border-[#d9e5f5] bg-white/95 backdrop-blur">
                    <nav
                        className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
                        aria-label="Main navigation"
                    >
                        <a href="#home" className="flex items-center gap-3">
                            <img
                                src="/ched_logo.png"
                                alt="Commission on Higher Education logo"
                                className="h-12 w-12 object-contain"
                            />
                            <span>
                                <span className="block text-sm font-semibold tracking-wide text-slate-950">
                                    CERS
                                </span>
                                <span className="block text-xs text-slate-600 sm:text-sm">
                                    CHED Event Registration System
                                </span>
                            </span>
                        </a>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:gap-8">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
                                {navigationLinks.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        className="transition hover:text-[#0038A8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                                    >
                                        {link.label}

                                    </a>
                                ))}
                            </div>

                            <Link
                                href={accessHref}
                                className="inline-flex items-center justify-center rounded-xl border border-[#0038A8] bg-[#0038A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#002f8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8]"
                            >
                                {auth.user ? 'Dashboard' : 'Login'}
                            </Link>
                        </div>
                    </nav>
                </header>

                <main id="home">
                    <section className="relative overflow-hidden">
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(252,209,22,0.20),transparent_32%),radial-gradient(circle_at_top_right,rgba(0,56,168,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.82)_100%)]" />
                        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
                            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
                                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9e5f5] bg-white px-4 py-2 text-sm font-medium text-[#0038A8] shadow-sm">
                                    <ShieldCheck className="h-4 w-4 text-[#CE1126]" />
                                    Government event registration platform
                                </div>

                                <h1 className="max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                                    CHED Event Registration System
                                </h1>

                                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                                    A centralized platform for managing event
                                    registration, participant attendance, and
                                    event-related records for CHED activities.
                                </p>

                                <div className="mt-8 flex">
                                    <a
                                        href="#registration"
                                        className="inline-flex w-full items-center justify-center rounded-xl bg-[#0038A8] px-8 py-4 text-base font-bold text-white shadow-md shadow-[#0038A8]/15 transition hover:bg-[#002f8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0038A8] sm:w-auto"
                                    >
                                        Register Now
                                    </a>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#d9e5f5] bg-white p-5 shadow-md shadow-slate-200/70 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
                                <div className="rounded-2xl border border-[#d9e5f5] bg-[#f8fbff] p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-[#0038A8]">
                                                Event Operations
                                            </p>
                                            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
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
                                                    className="rounded-2xl border border-[#d9e5f5] bg-white p-4 shadow-sm transition hover:border-[#0038A8]/25 hover:shadow-md"
                                                >
                                                    <Icon className="h-6 w-6 text-[#0038A8]" />
                                                    <p className="mt-4 text-sm font-semibold text-slate-800">
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
                                                className="flex items-center gap-2 rounded-xl border border-[#d9e5f5] bg-white px-3 py-3 text-sm font-medium text-slate-700"
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
                        className="border-y border-[#d9e5f5] bg-white/85 py-16 backdrop-blur-[2px] sm:py-20"
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
                                className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-md shadow-slate-200/70 sm:p-8"
                            >
                                {({ processing, errors }) => (
                                    <div className="grid gap-8">
                                        <div className="border-b border-[#d9e5f5] pb-6">
                                            <p className="text-sm font-semibold uppercase tracking-wide text-[#CE1126]">
                                                Event Registration
                                            </p>
                                            <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                                                Participant Registration Form
                                            </h2>
                                        </div>

                                        <section className="grid gap-5">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-950">
                                                    Participant details
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-600">
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
                                                <div className="grid gap-2 md:col-span-2">
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

                                                <div className="grid gap-2">
                                                    <Label htmlFor="position">
                                                        Position or role
                                                    </Label>
                                                    <Input
                                                        id="position"
                                                        type="text"
                                                        name="position"
                                                        placeholder="Student, faculty, staff"
                                                        className={fieldClass}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.position
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="participant_type">
                                                        Participant type
                                                    </Label>
                                                    <input
                                                        id="participant_type"
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
                                                                aria-expanded={
                                                                    participantTypePopoverOpen
                                                                }
                                                                className="h-11 w-full justify-between rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 font-normal text-slate-700 hover:bg-[#f8fbff]"
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
                                                    <Label>Sex</Label>
                                                    <RadioGroup
                                                        name="sex"
                                                        required
                                                        className="grid grid-cols-2 gap-3"
                                                    >
                                                        <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d9e5f5] bg-[#f8fbff] px-4 text-sm font-medium text-slate-700 has-[[data-state=checked]]:border-[#0038A8] has-[[data-state=checked]]:bg-[#eef5ff]">
                                                            <RadioGroupItem
                                                                value="male"
                                                                className="border-[#d9e5f5] text-[#0038A8] focus-visible:ring-[#0038A8]/15"
                                                            />
                                                            Male
                                                        </label>
                                                        <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#d9e5f5] bg-[#f8fbff] px-4 text-sm font-medium text-slate-700 has-[[data-state=checked]]:border-[#0038A8] has-[[data-state=checked]]:bg-[#eef5ff]">
                                                            <RadioGroupItem
                                                                value="female"
                                                                className="border-[#d9e5f5] text-[#0038A8] focus-visible:ring-[#0038A8]/15"
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

                                        <section className="grid gap-4 border-t border-[#d9e5f5] pt-6">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-950">
                                                    Event information
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    Choose the event you want to
                                                    attend.
                                                </p>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="event_name">
                                                    Event
                                                </Label>
                                                <input
                                                    id="event_name"
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
                                                            aria-expanded={
                                                                eventPopoverOpen
                                                            }
                                                            className="h-11 w-full justify-between rounded-xl border-[#d9e5f5] bg-[#f8fbff] px-4 font-normal text-slate-700 hover:bg-[#f8fbff]"
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

                                        <section className="grid gap-4 border-t border-[#d9e5f5] pt-6">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-950">
                                                    Account access
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    Create a password so you
                                                    can view your registration
                                                    and attendance records.
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

                                            <label className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    name="consent"
                                                    value="yes"
                                                    required
                                                    className="mt-1 size-4 rounded border-[#d9e5f5] text-[#0038A8] focus:ring-[#0038A8]/20"
                                                />
                                                To promote networking between institutions with common interests, I give my consent to CHED to share my full name, designation, institution, and email address to other attendees of the event.
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
                        className="bg-white/85 py-16 backdrop-blur-[2px] sm:py-20"
                    >
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="max-w-2xl">
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#CE1126]">
                                    Features
                                </p>
                                <h2 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                                    Built for efficient CHED event operations
                                </h2>
                            </div>

                            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                {features.map((feature) => {
                                    const Icon = feature.icon;

                                    return (
                                        <article
                                            key={feature.title}
                                            className="rounded-2xl border border-[#d9e5f5] bg-white p-6 shadow-sm transition duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 hover:-translate-y-1 hover:border-[#0038A8]/30 hover:shadow-md"
                                        >
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#0038A8]">
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="mt-5 text-lg font-semibold text-slate-950">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                                {feature.description}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                </main>

                <footer className="border-t border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                        <p>
                            &copy; {currentYear} Commission on Higher Education.
                            All rights reserved.
                        </p>
                        <p className="font-medium text-slate-700">
                            CHED Event Registration System
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
