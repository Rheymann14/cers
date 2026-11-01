import { useForm } from '@inertiajs/react';
import {
    Award,
    ImagePlus,
    Info,
    PenLine,
    Plus,
    Save,
    Trash2,
    Undo2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCertificatePdf } from '@/hooks/use-certificate-pdf';
import { certificatePlaceholders, paperSizes } from '@/lib/certificate-config';
import type {
    CertificateContent,
    CertificateEvent,
    CertificateRecipient,
    CertificateTemplate,
    CertificateType,
    PaperSize,
} from '@/lib/certificate-config';
import { cn } from '@/lib/utils';

const CertificatePdfViewer = lazy(
    () => import('@/components/certificates/certificate-pdf-viewer'),
);

const MAX_SIGNATORIES = 3;

export type CertificateSettings = Omit<CertificateTemplate, 'signatories'> & {
    is_configured: boolean;
    signatories: Array<
        CertificateTemplate['signatories'][number] & {
            signature_path: string | null;
        }
    >;
    updated_at: string | null;
};

type SignatoryForm = {
    key: string;
    name: string;
    position: string;
    signature: File | null;
    signature_path: string | null;
    signature_url: string | null;
};

type CertificateSettingsForm = {
    logo: File | null;
    remove_logo: boolean;
    appearance_background: File | null;
    remove_appearance_background: boolean;
    participation_background: File | null;
    remove_participation_background: boolean;
    appearance: CertificateContent;
    participation: CertificateContent;
    signatories: SignatoryForm[];
};

type ImageField = 'logo' | 'appearance_background' | 'participation_background';

type SettingsTab = 'branding' | CertificateType;

const tabs: { value: SettingsTab; label: string }[] = [
    { value: 'branding', label: 'Logo & signatories' },
    { value: 'appearance', label: 'Appearance' },
    { value: 'participation', label: 'Participation' },
];

const textareaClassName =
    'min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

let signatoryKeySeed = 0;

function nextSignatoryKey(): string {
    signatoryKeySeed += 1;

    return `signatory-${signatoryKeySeed}`;
}

function ImageUploadField({
    id,
    label,
    hint,
    previewUrl,
    fileName,
    hasStoredImage,
    removed,
    error,
    className,
    previewClassName,
    onSelect,
    onToggleRemove,
}: {
    id: string;
    label: string;
    hint: string;
    previewUrl: string | null;
    fileName: string | null;
    hasStoredImage: boolean;
    removed: boolean;
    error?: string;
    className?: string;
    previewClassName?: string;
    onSelect: (file: File | null) => void;
    onToggleRemove?: () => void;
}) {
    return (
        <div className={cn('space-y-2', className)}>
            <Label htmlFor={id}>{label}</Label>
            <label
                htmlFor={id}
                className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground hover:bg-muted/50"
            >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt=""
                        className={cn(
                            'h-16 max-w-full rounded-md border bg-white object-contain',
                            previewClassName,
                        )}
                    />
                ) : (
                    <ImagePlus className="size-5" />
                )}
                <span className="w-full max-w-64 truncate">
                    {fileName ?? (previewUrl ? 'Replace image' : hint)}
                </span>
            </label>
            <input
                id={id}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                    onSelect(event.target.files?.[0] ?? null);
                    event.target.value = '';
                }}
            />
            {(fileName || hasStoredImage) && (
                <div className="flex flex-wrap items-center gap-2">
                    {fileName && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => onSelect(null)}
                        >
                            <Undo2 className="size-3.5" />
                            Undo upload
                        </Button>
                    )}
                    {hasStoredImage && !fileName && onToggleRemove && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={onToggleRemove}
                        >
                            {removed ? (
                                <Undo2 className="size-3.5" />
                            ) : (
                                <Trash2 className="size-3.5" />
                            )}
                            {removed ? 'Keep image' : 'Remove image'}
                        </Button>
                    )}
                </div>
            )}
            <InputError message={error} />
        </div>
    );
}

function PlaceholderHelp() {
    return (
        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-2 inline-flex items-center gap-1.5 font-medium text-foreground">
                <Info className="size-3.5" />
                Placeholders
            </p>
            <div className="flex flex-wrap gap-1.5">
                {certificatePlaceholders.map((placeholder) => (
                    <Tooltip key={placeholder.token}>
                        <TooltipTrigger asChild>
                            <code className="cursor-default rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                                {placeholder.token}
                            </code>
                        </TooltipTrigger>
                        <TooltipContent>
                            {placeholder.description}
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </div>
    );
}

function CertificateSettingsForm({
    event,
    settings,
    sampleRecipient,
    timeZone,
    onClose,
}: {
    event: CertificateEvent & { id: number };
    settings: CertificateSettings;
    sampleRecipient: CertificateRecipient;
    timeZone: string;
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
    const [paperSize, setPaperSize] = useState<PaperSize>('a4');
    const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
    const fileUrlsRef = useRef<Record<string, string>>({});
    const { data, setData, transform, post, processing, errors } =
        useForm<CertificateSettingsForm>({
            logo: null,
            remove_logo: false,
            appearance_background: null,
            remove_appearance_background: false,
            participation_background: null,
            remove_participation_background: false,
            appearance: settings.appearance,
            participation: settings.participation,
            signatories: settings.signatories.map((signatory) => ({
                key: nextSignatoryKey(),
                name: signatory.name,
                position: signatory.position,
                signature: null,
                signature_path: signatory.signature_path,
                signature_url: signatory.signature_url,
            })),
        });
    const formErrors = errors as Record<string, string | undefined>;

    useEffect(
        () => () => {
            Object.values(fileUrlsRef.current).forEach((url) =>
                URL.revokeObjectURL(url),
            );
        },
        [],
    );

    function setFilePreview(key: string, file: File | null) {
        const next = { ...fileUrls };

        if (next[key]) {
            URL.revokeObjectURL(next[key]);
            delete next[key];
        }

        if (file) {
            next[key] = URL.createObjectURL(file);
        }

        fileUrlsRef.current = next;
        setFileUrls(next);
    }

    function selectImage(field: ImageField, file: File | null) {
        setFilePreview(field, file);
        setData((current) => ({
            ...current,
            [field]: file,
            [`remove_${field}`]: false,
        }));
    }

    function imageUrl(field: ImageField, storedUrl: string | null) {
        if (data[field]) {
            return fileUrls[field] ?? null;
        }

        return data[`remove_${field}`] ? null : storedUrl;
    }

    function updateContent(
        type: CertificateType,
        key: keyof CertificateContent,
        value: string | number,
    ) {
        setData(type, { ...data[type], [key]: value });
    }

    function updateSignatory(key: string, changes: Partial<SignatoryForm>) {
        setData(
            'signatories',
            data.signatories.map((signatory) =>
                signatory.key === key
                    ? { ...signatory, ...changes }
                    : signatory,
            ),
        );
    }

    function selectSignature(key: string, file: File | null) {
        setFilePreview(key, file);
        updateSignatory(key, { signature: file });
    }

    function addSignatory() {
        setData('signatories', [
            ...data.signatories,
            {
                key: nextSignatoryKey(),
                name: '',
                position: '',
                signature: null,
                signature_path: null,
                signature_url: null,
            },
        ]);
    }

    function removeSignatory(key: string) {
        setFilePreview(key, null);
        setData(
            'signatories',
            data.signatories.filter((signatory) => signatory.key !== key),
        );
    }

    const previewTemplate: CertificateTemplate = {
        logo_url: imageUrl('logo', settings.logo_url),
        appearance_background_url: imageUrl(
            'appearance_background',
            settings.appearance_background_url,
        ),
        participation_background_url: imageUrl(
            'participation_background',
            settings.participation_background_url,
        ),
        appearance: data.appearance,
        participation: data.participation,
        signatories: data.signatories.map((signatory) => ({
            name: signatory.name,
            position: signatory.position,
            signature_url: signatory.signature
                ? (fileUrls[signatory.key] ?? null)
                : signatory.signature_url,
        })),
    };
    const preview = useCertificatePdf(
        {
            template: previewTemplate,
            event,
            recipients: [sampleRecipient],
            paperSize,
            timeZone,
        },
        350,
    );

    function submit(formEvent: FormEvent<HTMLFormElement>) {
        formEvent.preventDefault();

        transform((current) => ({
            ...current,
            signatories: current.signatories.map((signatory) => ({
                name: signatory.name,
                position: signatory.position,
                signature: signatory.signature,
                signature_path: signatory.signature_path,
            })),
            _method: 'patch',
        }));
        post(`/certificates/${event.id}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    function contentFields(type: CertificateType) {
        const content = data[type];
        const fieldError = (key: string) => formErrors[`${type}.${key}`];
        const backgroundField: ImageField = `${type}_background`;

        return (
            <div className="grid gap-4">
                <ImageUploadField
                    id={`${type}-background`}
                    label="Background"
                    hint="Upload background (PNG or JPG)"
                    previewUrl={imageUrl(
                        backgroundField,
                        settings[`${type}_background_url`],
                    )}
                    previewClassName="h-24 object-cover"
                    fileName={data[backgroundField]?.name ?? null}
                    hasStoredImage={!!settings[`${type}_background_url`]}
                    removed={data[`remove_${backgroundField}`]}
                    error={formErrors[backgroundField]}
                    onSelect={(file) => selectImage(backgroundField, file)}
                    onToggleRemove={() =>
                        setData(
                            `remove_${backgroundField}`,
                            !data[`remove_${backgroundField}`],
                        )
                    }
                />
                <p className="-mt-2 text-xs text-muted-foreground">
                    The background is stretched to each half of the page. A
                    landscape image around 1.4 : 1 (e.g. 2100 × 1500 px) fits A4
                    best.
                </p>

                <div className="space-y-2">
                    <Label htmlFor={`${type}-title`}>Title</Label>
                    <Input
                        id={`${type}-title`}
                        value={content.title}
                        onChange={(inputEvent) =>
                            updateContent(
                                type,
                                'title',
                                inputEvent.target.value,
                            )
                        }
                        aria-invalid={!!fieldError('title')}
                    />
                    <InputError message={fieldError('title')} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`${type}-intro`}>
                        Text before the name
                    </Label>
                    <Input
                        id={`${type}-intro`}
                        value={content.intro}
                        onChange={(inputEvent) =>
                            updateContent(
                                type,
                                'intro',
                                inputEvent.target.value,
                            )
                        }
                        aria-invalid={!!fieldError('intro')}
                    />
                    <InputError message={fieldError('intro')} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`${type}-body`}>Text after the name</Label>
                    <textarea
                        id={`${type}-body`}
                        value={content.body}
                        onChange={(inputEvent) =>
                            updateContent(type, 'body', inputEvent.target.value)
                        }
                        className={textareaClassName}
                        aria-invalid={!!fieldError('body')}
                    />
                    <InputError message={fieldError('body')} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`${type}-footer`}>Closing line</Label>
                    <textarea
                        id={`${type}-footer`}
                        value={content.footer}
                        onChange={(inputEvent) =>
                            updateContent(
                                type,
                                'footer',
                                inputEvent.target.value,
                            )
                        }
                        className={cn(textareaClassName, 'min-h-16')}
                        aria-invalid={!!fieldError('footer')}
                    />
                    <InputError message={fieldError('footer')} />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`${type}-offset`}>
                            Content position
                        </Label>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {content.vertical_offset > 0 ? '+' : ''}
                            {content.vertical_offset}%
                        </span>
                    </div>
                    <input
                        id={`${type}-offset`}
                        type="range"
                        min={-20}
                        max={20}
                        step={1}
                        value={content.vertical_offset}
                        onChange={(inputEvent) =>
                            updateContent(
                                type,
                                'vertical_offset',
                                Number(inputEvent.target.value),
                            )
                        }
                        className="w-full accent-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                        Move the text up or down to fit the background design.
                    </p>
                    <InputError message={fieldError('vertical_offset')} />
                </div>

                <PlaceholderHelp />
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:overflow-hidden">
                <div className="flex min-h-0 flex-col gap-3 lg:overflow-hidden">
                    <div className="inline-flex shrink-0 gap-1 rounded-lg bg-muted p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => setActiveTab(tab.value)}
                                className={cn(
                                    'flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                                    activeTab === tab.value
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
                        {activeTab === 'branding' ? (
                            <div className="grid gap-4">
                                <ImageUploadField
                                    id="certificate-logo"
                                    label="Certificate logo"
                                    hint="Upload logo (PNG with transparency recommended)"
                                    previewUrl={imageUrl(
                                        'logo',
                                        settings.logo_url,
                                    )}
                                    fileName={data.logo?.name ?? null}
                                    hasStoredImage={!!settings.logo_url}
                                    removed={data.remove_logo}
                                    error={formErrors.logo}
                                    onSelect={(file) =>
                                        selectImage('logo', file)
                                    }
                                    onToggleRemove={() =>
                                        setData(
                                            'remove_logo',
                                            !data.remove_logo,
                                        )
                                    }
                                />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label>Signatories</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            disabled={
                                                data.signatories.length >=
                                                MAX_SIGNATORIES
                                            }
                                            onClick={addSignatory}
                                        >
                                            <Plus className="size-3.5" />
                                            Add signatory
                                        </Button>
                                    </div>
                                    {data.signatories.length === 0 && (
                                        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                                            No signatories yet. Add up to{' '}
                                            {MAX_SIGNATORIES} signatories shown
                                            on both certificates.
                                        </p>
                                    )}
                                    {data.signatories.map(
                                        (signatory, index) => (
                                            <div
                                                key={signatory.key}
                                                className="grid gap-3 rounded-lg border p-3"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                                        <PenLine className="size-3.5" />
                                                        Signatory {index + 1}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7 text-muted-foreground hover:text-destructive"
                                                        aria-label={`Remove signatory ${index + 1}`}
                                                        onClick={() =>
                                                            removeSignatory(
                                                                signatory.key,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label
                                                            htmlFor={`${signatory.key}-name`}
                                                            className="text-xs"
                                                        >
                                                            Name
                                                        </Label>
                                                        <Input
                                                            id={`${signatory.key}-name`}
                                                            value={
                                                                signatory.name
                                                            }
                                                            onChange={(
                                                                inputEvent,
                                                            ) =>
                                                                updateSignatory(
                                                                    signatory.key,
                                                                    {
                                                                        name: inputEvent
                                                                            .target
                                                                            .value,
                                                                    },
                                                                )
                                                            }
                                                            aria-invalid={
                                                                !!formErrors[
                                                                    `signatories.${index}.name`
                                                                ]
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                formErrors[
                                                                    `signatories.${index}.name`
                                                                ]
                                                            }
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label
                                                            htmlFor={`${signatory.key}-position`}
                                                            className="text-xs"
                                                        >
                                                            Position
                                                        </Label>
                                                        <Input
                                                            id={`${signatory.key}-position`}
                                                            value={
                                                                signatory.position
                                                            }
                                                            onChange={(
                                                                inputEvent,
                                                            ) =>
                                                                updateSignatory(
                                                                    signatory.key,
                                                                    {
                                                                        position:
                                                                            inputEvent
                                                                                .target
                                                                                .value,
                                                                    },
                                                                )
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                formErrors[
                                                                    `signatories.${index}.position`
                                                                ]
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <ImageUploadField
                                                    id={`${signatory.key}-signature`}
                                                    label="Signature"
                                                    hint="Upload e-signature (transparent PNG)"
                                                    previewUrl={
                                                        signatory.signature
                                                            ? (fileUrls[
                                                                  signatory.key
                                                              ] ?? null)
                                                            : signatory.signature_url
                                                    }
                                                    fileName={
                                                        signatory.signature
                                                            ?.name ?? null
                                                    }
                                                    hasStoredImage={
                                                        !!signatory.signature_url
                                                    }
                                                    removed={false}
                                                    error={
                                                        formErrors[
                                                            `signatories.${index}.signature`
                                                        ]
                                                    }
                                                    onSelect={(file) =>
                                                        selectSignature(
                                                            signatory.key,
                                                            file,
                                                        )
                                                    }
                                                    onToggleRemove={() =>
                                                        updateSignatory(
                                                            signatory.key,
                                                            {
                                                                signature_path:
                                                                    null,
                                                                signature_url:
                                                                    null,
                                                            },
                                                        )
                                                    }
                                                />
                                            </div>
                                        ),
                                    )}
                                    <InputError
                                        message={formErrors.signatories}
                                    />
                                </div>
                            </div>
                        ) : (
                            contentFields(activeTab)
                        )}
                    </div>
                </div>

                <div className="flex min-h-[28rem] flex-col gap-2 lg:min-h-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Live preview
                        </p>
                        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
                            {(Object.keys(paperSizes) as PaperSize[]).map(
                                (size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => setPaperSize(size)}
                                        className={cn(
                                            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                            paperSize === size
                                                ? 'bg-background text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {paperSizes[size].label}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                    <Suspense
                        fallback={
                            <Skeleton className="min-h-0 flex-1 rounded-xl" />
                        }
                    >
                        <CertificatePdfViewer
                            file={preview.blob}
                            url={preview.url}
                            generating={preview.generating}
                            statusLabel="Updating preview..."
                            error={preview.error}
                        />
                    </Suspense>
                    {preview.missingAssets.length > 0 && (
                        <p className="text-xs text-destructive">
                            Could not load: {preview.missingAssets.join(', ')}.
                        </p>
                    )}
                </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t pt-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={processing}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={processing}>
                    <Save className="size-4" />
                    {processing ? 'Saving...' : 'Save settings'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export default function CertificateSettingsDialog({
    open,
    onOpenChange,
    event,
    settings,
    sampleRecipient,
    timeZone,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event: CertificateEvent & { id: number };
    settings: CertificateSettings;
    sampleRecipient: CertificateRecipient;
    timeZone: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col gap-3 p-4 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[94vw] sm:max-w-[94vw] lg:max-w-6xl">
                <DialogHeader className="shrink-0 gap-1 text-left">
                    <DialogTitle className="inline-flex items-center gap-2 text-base">
                        <Award className="size-4 text-muted-foreground" />
                        Certificate settings
                    </DialogTitle>
                    <DialogDescription className="text-xs leading-5">
                        Backgrounds, logo, content and signatories for{' '}
                        <span className="font-medium text-foreground">
                            {event.name}
                        </span>
                        .
                    </DialogDescription>
                </DialogHeader>
                {open && (
                    <CertificateSettingsForm
                        event={event}
                        settings={settings}
                        sampleRecipient={sampleRecipient}
                        timeZone={timeZone}
                        onClose={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
