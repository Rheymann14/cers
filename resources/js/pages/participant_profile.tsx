import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Check,
    ChevronsUpDown,
    ImagePlus,
    QrCode,
    Save,
    Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { normalizeContactNumber } from '@/lib/phone';
import { cn } from '@/lib/utils';

type Option = {
    value: string;
    label: string;
};

type Props = {
    participantTypes: Option[];
    organizations: Option[];
};

type ParticipantProfileForm = {
    given_name: string;
    middle_name: string;
    surname: string;
    email: string;
    avatar: string;
    remove_avatar: boolean;
    phone: string;
    organization: string;
    sex: string;
    event_name: string;
};

const sexOptions: Option[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
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

function optionLabel(options: Option[], value?: string | null) {
    return (
        options.find((option) => option.value === value)?.label ?? value ?? ''
    );
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
    participantId,
}: {
    email: string;
    fullName: string;
    organization: string;
    participantId: string;
}) {
    const fingerprint = hashString(
        ['CERS-VIRTUAL-ID', participantId, fullName, email]
            .map((value) => value.trim().toLowerCase())
            .join('|'),
    );

    return `CERS:VID:2:${fingerprint}`;
}

function VirtualIdCard({
    avatar,
    email,
    fullName,
    organization,
    participantId,
}: {
    avatar: string;
    email: string;
    fullName: string;
    organization: string;
    participantId: string;
}) {
    const displayName = fullName || 'Participant';
    const displayId = participantId || 'Not assigned';
    const qrValue = createQrToken({
        email,
        fullName: displayName,
        organization,
        participantId,
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
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                getInitials(displayName)
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

function ReadOnlyField({
    id,
    label,
    value,
}: {
    id: string;
    label: string;
    value: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div
                id={id}
                className="flex min-h-10 w-full items-center rounded-md border border-input bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
            >
                <span className="truncate">{value || 'Not assigned'}</span>
            </div>
        </div>
    );
}

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
        <div className="grid gap-2">
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
                            'min-h-10 w-full justify-between font-normal',
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

export default function ParticipantProfile({
    participantTypes,
    organizations,
}: Props) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [avatarPreview, setAvatarPreview] = useState(user.avatar ?? '');
    const [avatarError, setAvatarError] = useState('');
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
    const participantTypeLabel = useMemo(
        () => optionLabel(participantTypes, user.participant_type),
        [participantTypes, user.participant_type],
    );
    const participantId = String(user.participant_id ?? '');

    const { data, setData, patch, processing, errors, clearErrors } =
        useForm<ParticipantProfileForm>({
            given_name: user.given_name ?? '',
            middle_name: user.middle_name ?? '',
            surname: user.surname ?? '',
            email: user.email ?? '',
            avatar: '',
            remove_avatar: false,
            phone: normalizeContactNumber(user.phone ?? ''),
            organization: user.organization ?? '',
            sex: user.sex ?? '',
            event_name: user.event_name ?? '',
        });
    const fullName = useMemo(
        () =>
            [data.given_name, data.middle_name, data.surname]
                .filter(Boolean)
                .join(' '),
        [data.given_name, data.middle_name, data.surname],
    );

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        patch('/participant-profile', {
            preserveScroll: true,
            onSuccess: () => {
                setData('avatar', '');
                setData('remove_avatar', false);
                toast.success('Participant profile updated.');
                router.flushAll();
            },
            onError: () => toast.error('Unable to update participant profile.'),
        });
    }

    function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            setAvatarError('Upload a PNG, JPG, or JPEG image.');
            toast.error('Upload a PNG, JPG, or JPEG image.');

            return;
        }

        setAvatarError('');
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
        reader.onerror = () => {
            setAvatarError('Could not read the selected image.');
            toast.error('Could not read the selected image.');
        };
        reader.readAsDataURL(file);
    }

    function useCroppedAvatar() {
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
            setAvatarError('Could not crop the selected image.');
            toast.error('Could not crop the selected image.');

            return;
        }

        setAvatarPreview(croppedDataUrl);
        setData('avatar', croppedDataUrl);
        setData('remove_avatar', false);
        setCropDialogOpen(false);
        setAvatarError('');
        clearErrors('avatar', 'remove_avatar');
    }

    function removeAvatar() {
        setAvatarPreview('');
        setData('avatar', '');
        setData('remove_avatar', true);
        setAvatarError('');
        setCropImageSrc('');
        setCompletedCrop(undefined);
        clearErrors('avatar', 'remove_avatar');
    }

    return (
        <>
            <Head title="Participant profile" />

            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
                <div className="mb-6">
                    <Heading
                        title="Participant Profile"
                        description="View and update the registration details linked to your account."
                    />
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <input
                        type="hidden"
                        name="event_name"
                        value={data.event_name}
                        readOnly
                    />

                    <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
                        <section className="grid gap-5 rounded-lg border bg-card p-5 shadow-xs">
                            <div className="grid justify-items-center gap-4 text-center">
                                <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border bg-muted shadow-sm ring-4 ring-background sm:size-32">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Profile preview"
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <ImagePlus className="size-9 text-muted-foreground" />
                                    )}
                                </div>

                                <div className="grid gap-1">
                                    <h2 className="text-lg leading-tight font-semibold">
                                        {[
                                            data.given_name,
                                            data.middle_name,
                                            data.surname,
                                        ]
                                            .filter(Boolean)
                                            .join(' ') || 'Participant'}
                                    </h2>
                                    <p className="text-sm break-all text-muted-foreground">
                                        {data.email}
                                    </p>
                                </div>

                                <div className="flex w-full flex-wrap justify-center gap-2">
                                    <Label
                                        htmlFor="participant_avatar"
                                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                                    >
                                        <ImagePlus className="size-4" />
                                        Choose image
                                    </Label>
                                    <input
                                        id="participant_avatar"
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        className="sr-only"
                                        onChange={selectAvatar}
                                    />
                                    {avatarPreview && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            aria-label="Remove profile image"
                                            onClick={removeAvatar}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>

                                <InputError
                                    message={
                                        avatarError ||
                                        errors.avatar ||
                                        errors.remove_avatar
                                    }
                                />
                            </div>

                            <div className="grid gap-3 border-t pt-4">
                                <ReadOnlyField
                                    id="participant_id"
                                    label="Participant ID #"
                                    value={participantId}
                                />
                                <ReadOnlyField
                                    id="participant_type"
                                    label="Participant type"
                                    value={participantTypeLabel}
                                />
                            </div>
                        </section>

                        <section className="grid gap-5 rounded-lg border bg-card p-4 shadow-xs sm:p-5">
                            <div>
                                <h2 className="text-base font-semibold">
                                    Personal Information
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Keep your contact and organization details
                                    updated.
                                </p>
                            </div>

                            <VirtualIdCard
                                avatar={avatarPreview}
                                email={data.email}
                                fullName={fullName}
                                organization={data.organization}
                                participantId={participantId}
                            />

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="given_name">
                                        Given name
                                    </Label>
                                    <Input
                                        id="given_name"
                                        value={data.given_name}
                                        onChange={(event) =>
                                            setData(
                                                'given_name',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError message={errors.given_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="middle_name">
                                        Middle name
                                    </Label>
                                    <Input
                                        id="middle_name"
                                        value={data.middle_name}
                                        onChange={(event) =>
                                            setData(
                                                'middle_name',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={errors.middle_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="surname">Surname</Label>
                                    <Input
                                        id="surname"
                                        value={data.surname}
                                        onChange={(event) =>
                                            setData(
                                                'surname',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError message={errors.surname} />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(event) =>
                                            setData('email', event.target.value)
                                        }
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        inputMode="numeric"
                                        placeholder="09XXXXXXXXX"
                                        onChange={(event) =>
                                            setData(
                                                'phone',
                                                normalizeContactNumber(
                                                    event.target.value,
                                                ),
                                            )
                                        }
                                        required
                                    />
                                    <InputError message={errors.phone} />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <SearchableOptionField
                                    id="organization"
                                    label="School or organization"
                                    value={data.organization}
                                    options={organizations}
                                    placeholder="Search and select school or organization"
                                    searchPlaceholder="Search school or organization..."
                                    emptyMessage="No school or organization found."
                                    error={errors.organization}
                                    onValueChange={(value) =>
                                        setData('organization', value)
                                    }
                                />
                                <div className="grid gap-2">
                                    <Label htmlFor="sex">Sex</Label>
                                    <Select
                                        value={data.sex}
                                        onValueChange={(value) =>
                                            setData('sex', value)
                                        }
                                    >
                                        <SelectTrigger id="sex">
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

                            <InputError message={errors.event_name} />

                            <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                                <Button
                                    className="w-full sm:w-auto"
                                    disabled={processing}
                                >
                                    <Save className="size-4" />
                                    Save changes
                                </Button>
                            </div>
                        </section>
                    </div>
                </form>
            </div>

            <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Crop profile image</DialogTitle>
                        <DialogDescription>
                            Adjust the image to fit your profile preview.
                        </DialogDescription>
                    </DialogHeader>

                    {cropImageSrc && (
                        <div className="overflow-hidden rounded-lg border bg-muted/30 p-3">
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
                        <Button type="button" onClick={useCroppedAvatar}>
                            Use image
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ParticipantProfile.layout = {
    breadcrumbs: [
        {
            title: 'Participant profile',
            href: '/participant-profile',
        },
    ],
};
