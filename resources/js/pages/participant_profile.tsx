import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { normalizeContactNumber } from '@/lib/phone';

type Option = {
    value: string;
    label: string;
};

type Props = {
    participantTypes: Option[];
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
    position: string;
    sex: string;
    event_name: string;
};

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

const sexOptions: Option[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
];

function optionLabel(options: Option[], value?: string | null) {
    return (
        options.find((option) => option.value === value)?.label ?? value ?? ''
    );
}

export default function ParticipantProfile({ participantTypes }: Props) {
    const { auth } = usePage().props;
    const user = auth.user;
    const [avatarPreview, setAvatarPreview] = useState(user.avatar ?? '');
    const participantTypeLabel = useMemo(
        () => optionLabel(participantTypes, user.participant_type),
        [participantTypes, user.participant_type],
    );

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
            position: user.position ?? '',
            sex: user.sex ?? '',
            event_name: user.event_name ?? '',
        });

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
            toast.error('Upload a PNG, JPG, or JPEG image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const value = String(reader.result);
            setAvatarPreview(value);
            setData('avatar', value);
            setData('remove_avatar', false);
            clearErrors('avatar', 'remove_avatar');
        };
        reader.onerror = () =>
            toast.error('Could not read the selected image.');
        reader.readAsDataURL(file);
    }

    function removeAvatar() {
        setAvatarPreview('');
        setData('avatar', '');
        setData('remove_avatar', true);
    }

    return (
        <>
            <Head title="Participant profile" />

            <div className="mx-auto w-full max-w-5xl px-4 py-6">
                <div className="mb-6">
                    <Heading
                        title="Participant Profile"
                        description="View and update the registration details linked to your account."
                    />
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <section className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border bg-muted">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Profile preview"
                                    className="size-full object-cover"
                                />
                            ) : (
                                <ImagePlus className="size-8 text-muted-foreground" />
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label>Profile image</Label>
                            <div className="flex flex-wrap gap-2">
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
                                message={errors.avatar ?? errors.remove_avatar}
                            />
                        </div>
                    </section>

                    <section className="grid gap-4 rounded-lg border bg-card p-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="grid gap-2">
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
                                    required
                                />
                                <InputError message={errors.given_name} />
                            </div>
                            <div className="grid gap-2">
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
                                />
                                <InputError message={errors.middle_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="surname">Surname</Label>
                                <Input
                                    id="surname"
                                    value={data.surname}
                                    onChange={(event) =>
                                        setData('surname', event.target.value)
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
                            <div className="grid gap-2">
                                <Label htmlFor="organization">
                                    School or organization
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
                                    required
                                />
                                <InputError message={errors.organization} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="position">Position</Label>
                                <Input
                                    id="position"
                                    value={data.position}
                                    onChange={(event) =>
                                        setData('position', event.target.value)
                                    }
                                />
                                <InputError message={errors.position} />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="participant_type">
                                    Participant type
                                </Label>
                                <Input
                                    id="participant_type"
                                    value={participantTypeLabel}
                                    readOnly
                                />
                            </div>
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

                        <div className="grid gap-2">
                            <Label htmlFor="event_name">Event name</Label>
                            <Select
                                value={data.event_name}
                                onValueChange={(value) =>
                                    setData('event_name', value)
                                }
                            >
                                <SelectTrigger id="event_name">
                                    <SelectValue placeholder="Select event" />
                                </SelectTrigger>
                                <SelectContent>
                                    {eventOptions.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.event_name} />
                        </div>
                    </section>

                    <div className="flex justify-end">
                        <Button disabled={processing}>
                            <Save className="size-4" />
                            Save changes
                        </Button>
                    </div>
                </form>
            </div>
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
