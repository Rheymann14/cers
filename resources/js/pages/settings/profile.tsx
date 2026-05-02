import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { toast } from 'sonner';

import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';

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

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;
    const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState('');
    const [profilePhotoPreview, setProfilePhotoPreview] = useState(
        auth.user.avatar ?? '',
    );
    const [removeAvatar, setRemoveAvatar] = useState(false);
    const [avatarProcessing, setAvatarProcessing] = useState(false);
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
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const emailInputRef = useRef<HTMLInputElement | null>(null);

    function updateProfilePhoto(
        avatar: string | null,
        shouldRemoveAvatar: boolean,
        previousPreview: string,
    ) {
        setAvatarProcessing(true);

        router.patch(
            ProfileController.update.url(),
            {
                name: nameInputRef.current?.value ?? auth.user.name,
                email: emailInputRef.current?.value ?? auth.user.email,
                avatar,
                remove_avatar: shouldRemoveAvatar,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.flushAll();
                    setProfilePhotoDataUrl('');
                    setRemoveAvatar(false);
                    setProfilePhotoError('');
                },
                onError: (errors) => {
                    const message =
                        errors.avatar ??
                        errors.remove_avatar ??
                        'Unable to update profile image.';

                    setProfilePhotoPreview(previousPreview);
                    setProfilePhotoDataUrl('');
                    setRemoveAvatar(false);
                    setProfilePhotoError(message);
                    toast.error(message);
                },
                onFinish: () => setAvatarProcessing(false),
            },
        );
    }

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
            toast.error('Upload a PNG, JPG, or JPEG image.');

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
        reader.onerror = () => {
            setProfilePhotoError('Could not read the selected image.');
            toast.error('Could not read the selected image.');
        };
        reader.readAsDataURL(file);
    }

    function removeProfilePhoto() {
        const previousPreview = profilePhotoPreview;

        setProfilePhotoDataUrl('');
        setProfilePhotoPreview('');
        setRemoveAvatar(true);
        setProfilePhotoError('');
        setCropImageSrc('');
        setCompletedCrop(undefined);
        updateProfilePhoto(null, true, previousPreview);
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
            toast.error('Could not crop the selected image.');

            return;
        }

        const previousPreview = profilePhotoPreview;

        setProfilePhotoDataUrl(croppedDataUrl);
        setProfilePhotoPreview(croppedDataUrl);
        setRemoveAvatar(false);
        setCropDialogOpen(false);
        updateProfilePhoto(croppedDataUrl, false, previousPreview);
    }

    return (
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile information"
                    description="Update your name and email address"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    onError={() =>
                        toast.error('Unable to update profile information.')
                    }
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
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
                                <input
                                    type="hidden"
                                    name="remove_avatar"
                                    value={removeAvatar ? '1' : '0'}
                                    readOnly
                                />
                                <div className="flex flex-col gap-4 rounded-lg border border-dashed bg-muted/30 p-4 sm:flex-row sm:items-center">
                                    <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background">
                                        {profilePhotoPreview ? (
                                            <img
                                                src={profilePhotoPreview}
                                                alt="Profile preview"
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <ImagePlus className="size-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="grid flex-1 gap-2">
                                        <p className="text-sm text-muted-foreground">
                                            Upload a square profile image for
                                            your account.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Label
                                                htmlFor="profile_photo_upload"
                                                className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50"
                                                aria-disabled={avatarProcessing}
                                            >
                                                <ImagePlus className="size-4" />
                                                {avatarProcessing
                                                    ? 'Saving...'
                                                    : 'Choose image'}
                                            </Label>
                                            <input
                                                id="profile_photo_upload"
                                                type="file"
                                                accept="image/png,image/jpeg"
                                                className="sr-only"
                                                disabled={avatarProcessing}
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
                                                    className="text-destructive hover:text-destructive"
                                                    disabled={avatarProcessing}
                                                    onClick={removeProfilePhoto}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <InputError
                                    message={
                                        profilePhotoError ||
                                        errors.avatar ||
                                        errors.remove_avatar
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>

                                <Input
                                    ref={nameInputRef}
                                    id="name"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder="Full name"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>

                                <Input
                                    ref={emailInputRef}
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />

                                <InputError
                                    className="mt-2"
                                    message={errors.email}
                                />
                            </div>

                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-4 text-sm text-muted-foreground">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                            >
                                                Click here to resend the
                                                verification email.
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                A new verification link has been
                                                sent to your email address.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
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
                        <Button
                            type="button"
                            onClick={handleUseCroppedProfilePhoto}
                            disabled={avatarProcessing}
                        >
                            {avatarProcessing ? 'Saving...' : 'Use image'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
