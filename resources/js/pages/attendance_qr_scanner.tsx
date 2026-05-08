import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    Camera,
    Check,
    CheckCircle2,
    ChevronsUpDown,
    Keyboard,
    LoaderCircle,
    QrCode,
    RotateCcw,
} from 'lucide-react';
import jsQR from 'jsqr';
import { QRCodeSVG } from 'qrcode.react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { cn } from '@/lib/utils';

type BarcodeDetectorResult = {
    rawValue: string;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
    detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};

declare global {
    interface Window {
        BarcodeDetector?: BarcodeDetectorConstructor;
    }
}

type ScannerEvent = {
    id: number;
    name: string;
    slug: string;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
    users_count: number;
};

type CheckInParticipant = {
    id: number;
    participant_id: string | null;
    name: string;
    email: string;
    avatar: string | null;
    organization: string | null;
    qr_token: string;
};

type CheckInResult = {
    message: string;
    already_checked_in: boolean;
    checked_in_at: string | null;
    participant: CheckInParticipant;
    event: {
        id: number;
        name: string;
    };
};

type Props = {
    events: ScannerEvent[];
};

type EventStatus = 'ongoing' | 'upcoming' | 'closed';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

function toDate(value: string | null) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: string | null) {
    const date = toDate(value);

    return date ? dateTimeFormatter.format(date) : '-';
}

function getEventStatus(event: ScannerEvent): EventStatus {
    const now = new Date();
    const startsAt = toDate(event.starts_at);
    const endsAt = toDate(event.ends_at);

    if (!event.is_active || (endsAt && now > endsAt)) {
        return 'closed';
    }

    if (startsAt && now < startsAt) {
        return 'upcoming';
    }

    return 'ongoing';
}

function EventStatusBadge({ status }: { status: EventStatus }) {
    return (
        <Badge
            className={cn(
                'border-transparent capitalize',
                status === 'ongoing' &&
                    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
                status === 'upcoming' &&
                    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                status === 'closed' &&
                    'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
            )}
        >
            {status}
        </Badge>
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

function VirtualIdCard({ participant }: { participant: CheckInParticipant }) {
    const displayName = participant.name || 'Participant';
    const displayId = participant.participant_id || 'Not assigned';

    return (
        <section className="flex justify-center">
            <div className="grid aspect-[27/17] w-full max-w-[420px] grid-cols-[1fr_38%] gap-2 overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_12%_15%,rgba(251,191,36,0.28),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(14,165,233,0.2),transparent_26%),linear-gradient(135deg,#f8fbff_0%,#e8f6ff_48%,#fff7ed_100%)] p-3 shadow-xs">
                <div className="grid min-w-0 content-between gap-2">
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

                    <div className="grid grid-cols-[52px_1fr] items-center gap-2 sm:grid-cols-[60px_1fr]">
                        <div className="flex size-13 items-center justify-center overflow-hidden rounded-md border border-white/80 bg-white text-base font-semibold text-sky-900 shadow-sm sm:size-15">
                            {participant.avatar ? (
                                <img
                                    src={participant.avatar}
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
                                {participant.organization ||
                                    'Organization not assigned'}
                            </p>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[9px] font-medium tracking-wide text-slate-500 uppercase sm:text-[10px]">
                            Participant ID
                        </p>
                        <div className="mt-1 inline-flex max-w-full rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold tracking-wide text-slate-950 shadow-sm sm:text-xs">
                            <span className="truncate">{displayId}</span>
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
                            value={participant.qr_token}
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

function extractJsonMessage(value: unknown) {
    if (
        value &&
        typeof value === 'object' &&
        'message' in value &&
        typeof value.message === 'string'
    ) {
        return value.message;
    }

    return 'Unable to record attendance check-in.';
}

function getCameraErrorMessage(error: unknown) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        return 'Camera scanning requires HTTPS or localhost. Open this page from a secure URL, or use Participant ID entry.';
    }

    if (error instanceof DOMException) {
        if (
            error.name === 'NotAllowedError' ||
            error.name === 'SecurityError'
        ) {
            return 'Camera access is blocked by browser permission or site policy. Allow camera access for this site, then start the scanner again, or use Participant ID entry.';
        }

        if (
            error.name === 'NotFoundError' ||
            error.name === 'OverconstrainedError'
        ) {
            return 'No usable camera was found on this device. Connect a camera or use Participant ID entry.';
        }

        if (error.name === 'NotReadableError' || error.name === 'AbortError') {
            return 'The camera is already in use or could not be started. Close other apps using the camera, then try again.';
        }
    }

    return 'Camera access failed. Allow camera permission or use Participant ID entry.';
}

function isCersVirtualIdQr(value: string) {
    return value.trim().startsWith('CERS:VID:1:');
}

export default function AttendanceQrScanner({ events }: Props) {
    const [eventOpen, setEventOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(
        events[0]?.id ? String(events[0].id) : '',
    );
    const [cameraState, setCameraState] = useState<
        'idle' | 'starting' | 'scanning' | 'error'
    >('idle');
    const [scanError, setScanError] = useState('');
    const [scanErrorTitle, setScanErrorTitle] = useState(
        'Scan Validation Failed',
    );
    const [scanErrorDialogOpen, setScanErrorDialogOpen] = useState(false);
    const [scanPaused, setScanPaused] = useState(false);
    const [manualParticipantId, setManualParticipantId] = useState('');
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(
        null,
    );
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastDetectedRef = useRef('');
    const checkingInRef = useRef(false);

    const selectedEvent = useMemo(
        () => events.find((event) => String(event.id) === selectedEventId),
        [events, selectedEventId],
    );
    const selectedEventStatus = selectedEvent
        ? getEventStatus(selectedEvent)
        : null;
    const scannerEnabled = Boolean(
        selectedEvent && selectedEventStatus !== 'closed' && !scanPaused,
    );

    const csrfToken = useMemo(
        () =>
            document
                .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '',
        [],
    );

    const playScanSound = useCallback((type: 'success' | 'error') => {
        const AudioContextConstructor = window.AudioContext;

        if (!AudioContextConstructor) {
            return;
        }

        const context =
            audioContextRef.current ?? new AudioContextConstructor();
        audioContextRef.current = context;

        void context
            .resume()
            .then(() => {
                const now = context.currentTime;
                const tones =
                    type === 'success'
                        ? [
                              { frequency: 660, start: 0, duration: 0.08 },
                              { frequency: 880, start: 0.09, duration: 0.12 },
                          ]
                        : [
                              { frequency: 220, start: 0, duration: 0.12 },
                              { frequency: 165, start: 0.13, duration: 0.16 },
                          ];

                tones.forEach(({ duration, frequency, start }) => {
                    const oscillator = context.createOscillator();
                    const gain = context.createGain();
                    const startAt = now + start;
                    const stopAt = startAt + duration;

                    oscillator.type = type === 'success' ? 'sine' : 'square';
                    oscillator.frequency.setValueAtTime(frequency, startAt);
                    gain.gain.setValueAtTime(0.0001, startAt);
                    gain.gain.exponentialRampToValueAtTime(
                        0.12,
                        startAt + 0.01,
                    );
                    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

                    oscillator.connect(gain);
                    gain.connect(context.destination);
                    oscillator.start(startAt);
                    oscillator.stop(stopAt + 0.01);
                });
            })
            .catch(() => {
                // Browsers may block audio until a user gesture has occurred.
            });
    }, []);

    const pauseScannerWithError = useCallback(
        (message: string, title = 'Scan Validation Failed') => {
            lastDetectedRef.current = '';
            setScanError(message);
            setScanErrorTitle(title);
            setScanPaused(true);
            setScanErrorDialogOpen(true);
            playScanSound('error');
        },
        [playScanSound],
    );

    const restartScanner = useCallback(() => {
        lastDetectedRef.current = '';
        setScanError('');
        setScanErrorTitle('Scan Validation Failed');
        setScanErrorDialogOpen(false);
        setScanPaused(false);
    }, []);

    const closeSuccessDialog = useCallback(() => {
        setCheckInResult(null);
        setManualParticipantId('');
        restartScanner();
    }, [restartScanner]);

    const submitCheckIn = useCallback(
        async (mode: 'qr' | 'manual', value: string) => {
            if (!selectedEventId) {
                pauseScannerWithError(
                    'Select an event before checking attendance.',
                    'Scanner Not Ready',
                );

                return false;
            }

            if (selectedEventStatus === 'closed') {
                pauseScannerWithError(
                    'Selected event is closed and cannot accept attendance check-ins.',
                    'Event Closed',
                );

                return false;
            }

            checkingInRef.current = true;
            setCheckingIn(true);
            setScanError('');

            try {
                const response = await fetch(
                    '/attendance-qr-scanner/check-in',
                    {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                        },
                        body: JSON.stringify({
                            event_id: Number(selectedEventId),
                            mode,
                            value: value.trim(),
                        }),
                    },
                );
                const payload = (await response.json().catch(() => null)) as
                    | CheckInResult
                    | { message?: string }
                    | null;

                if (!response.ok) {
                    const message = extractJsonMessage(payload);

                    pauseScannerWithError(message);

                    return false;
                }

                const result = payload as CheckInResult;

                lastDetectedRef.current = '';
                setScanPaused(true);
                setScanError('');
                setScanErrorDialogOpen(false);
                setCheckInResult(result);
                playScanSound('success');

                return true;
            } finally {
                checkingInRef.current = false;
                setCheckingIn(false);
            }
        },
        [
            csrfToken,
            pauseScannerWithError,
            playScanSound,
            selectedEventId,
            selectedEventStatus,
        ],
    );

    useEffect(() => {
        if (!selectedEventId) {
            setCameraState('idle');
            setScanError('Select an event before scanning attendance.');

            return;
        }

        if (selectedEventStatus === 'closed') {
            setCameraState('error');
            pauseScannerWithError(
                'Selected event is closed and cannot accept attendance check-ins.',
                'Event Closed',
            );

            return;
        }

        if (!scannerEnabled) {
            setCameraState('idle');

            return;
        }

        let stopped = false;
        let frame = 0;
        let stream: MediaStream | null = null;
        const detector = window.BarcodeDetector
            ? new window.BarcodeDetector({
                  formats: ['qr_code'],
              })
            : null;

        async function readQrValue(video: HTMLVideoElement) {
            if (detector) {
                const codes = await detector.detect(video);
                const rawValue = codes[0]?.rawValue?.trim();

                if (rawValue) {
                    return rawValue;
                }
            }

            const width = video.videoWidth;
            const height = video.videoHeight;

            if (!width || !height) {
                return '';
            }

            const canvas =
                canvasRef.current ?? document.createElement('canvas');
            const context = canvas.getContext('2d', {
                willReadFrequently: true,
            });

            canvasRef.current = canvas;

            if (!context) {
                return '';
            }

            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);

            const imageData = context.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, width, height, {
                inversionAttempts: 'attemptBoth',
            });

            return code?.data?.trim() ?? '';
        }

        async function scan() {
            if (stopped) {
                return;
            }

            const video = videoRef.current;

            if (video && video.readyState >= 2 && !checkingInRef.current) {
                try {
                    const rawValue = await readQrValue(video);

                    if (!rawValue) {
                        lastDetectedRef.current = '';
                    }

                    if (rawValue && rawValue !== lastDetectedRef.current) {
                        lastDetectedRef.current = rawValue;

                        if (!isCersVirtualIdQr(rawValue)) {
                            const message =
                                'Only CERS virtual ID QR codes can be scanned.';

                            pauseScannerWithError(message);
                        } else {
                            await submitCheckIn('qr', rawValue);
                        }
                    }
                } catch {
                    pauseScannerWithError(
                        'The camera image could not be scanned. Keep the QR code inside the frame or use Participant ID entry.',
                    );
                }
            }

            frame = window.requestAnimationFrame(scan);
        }

        async function startCamera() {
            setCameraState('starting');
            setScanError('');
            lastDetectedRef.current = '';

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                    },
                    audio: false,
                });

                const video = videoRef.current;

                if (!video || stopped) {
                    return;
                }

                video.srcObject = stream;
                await video.play();
                setCameraState('scanning');
                frame = window.requestAnimationFrame(scan);
            } catch (error) {
                setCameraState('error');
                pauseScannerWithError(
                    getCameraErrorMessage(error),
                    'Camera Access Failed',
                );
            }
        }

        void startCamera();

        return () => {
            stopped = true;
            window.cancelAnimationFrame(frame);
            stream?.getTracks().forEach((track) => track.stop());

            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [
        pauseScannerWithError,
        scannerEnabled,
        selectedEventId,
        selectedEventStatus,
        submitCheckIn,
    ]);

    function submitManualCheckIn(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const value = manualParticipantId.trim();

        if (!value) {
            pauseScannerWithError(
                'Enter a Participant ID.',
                'Participant ID Required',
            );

            return;
        }

        void submitCheckIn('manual', value);
    }

    return (
        <>
            <Head title="Attendance QR Scanner" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            Attendance QR Scanner
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Select an event, scan the participant virtual ID QR
                            code, or enter the Participant ID.
                        </p>
                    </div>
                    {selectedEvent && (
                        <div className="flex flex-wrap items-center gap-2">
                            <EventStatusBadge
                                status={selectedEventStatus ?? 'closed'}
                            />
                            <Badge variant="outline">
                                {selectedEvent.users_count.toLocaleString()}{' '}
                                participants
                            </Badge>
                        </div>
                    )}
                </div>

                <section className="grid gap-4 rounded-lg border bg-card p-4 shadow-xs">
                    <div className="grid gap-2">
                        <Label id="event_scanner_label">Event</Label>
                        <Popover open={eventOpen} onOpenChange={setEventOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    role="combobox"
                                    aria-labelledby="event_scanner_label"
                                    aria-expanded={eventOpen}
                                    className={cn(
                                        'h-auto min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left font-normal',
                                        !selectedEvent &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug sm:truncate">
                                        {selectedEvent?.name ??
                                            'Search and select event'}
                                    </span>
                                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="start"
                                collisionPadding={12}
                                className="w-[calc(100vw-1.5rem)] max-w-[var(--radix-popover-content-available-width)] p-0 sm:w-[var(--radix-popover-trigger-width)]"
                            >
                                <Command>
                                    <CommandInput placeholder="Search events..." />
                                    <CommandList className="max-h-[60vh]">
                                        <CommandEmpty>
                                            No event found.
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {events.map((event) => {
                                                const status =
                                                    getEventStatus(event);

                                                return (
                                                    <CommandItem
                                                        key={event.id}
                                                        value={`${event.name} ${event.slug} ${status}`}
                                                        onSelect={() => {
                                                            setSelectedEventId(
                                                                String(
                                                                    event.id,
                                                                ),
                                                            );
                                                            setEventOpen(false);
                                                            lastDetectedRef.current =
                                                                '';
                                                            setCheckInResult(
                                                                null,
                                                            );
                                                            restartScanner();
                                                        }}
                                                        className="items-start gap-2 py-2.5 sm:gap-3"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mt-1 size-4',
                                                                selectedEventId ===
                                                                    String(
                                                                        event.id,
                                                                    )
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="grid min-w-0 gap-1 sm:flex sm:items-center sm:gap-2">
                                                                <span className="min-w-0 whitespace-normal break-words leading-snug font-medium sm:truncate">
                                                                    {event.name}
                                                                </span>
                                                                <div className="shrink-0">
                                                                    <EventStatusBadge
                                                                        status={
                                                                            status
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                            <p className="mt-1 text-xs leading-snug break-words text-muted-foreground">
                                                                {formatDateTime(
                                                                    event.starts_at,
                                                                )}{' '}
                                                                to{' '}
                                                                {formatDateTime(
                                                                    event.ends_at,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
                    <section className="grid gap-4 rounded-lg border bg-card p-4 shadow-xs">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Camera className="size-4" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base font-semibold">
                                        QR scanner camera reader
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Place the participant virtual ID QR code
                                        inside the camera frame.
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline">
                                {selectedEventStatus === 'closed'
                                    ? 'Event closed'
                                    : scanPaused
                                      ? 'Scan paused'
                                      : cameraState === 'scanning'
                                        ? 'Auto scanning'
                                        : cameraState === 'starting'
                                          ? 'Starting'
                                          : 'Scanner ready'}
                            </Badge>
                        </div>

                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-black">
                            <video
                                ref={videoRef}
                                className={cn(
                                    'size-full object-cover',
                                    !scannerEnabled && 'opacity-30',
                                )}
                                muted
                                playsInline
                            />
                            <div className="pointer-events-none absolute inset-0 grid place-items-center p-8">
                                <div className="aspect-square w-full max-w-sm rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
                            </div>
                            <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between gap-3 rounded-md bg-black/70 px-3 py-2 text-xs text-white">
                                <span className="inline-flex items-center gap-2">
                                    {cameraState === 'starting' ||
                                    checkingIn ? (
                                        <LoaderCircle className="size-3.5 animate-spin" />
                                    ) : cameraState === 'scanning' ? (
                                        <QrCode className="size-3.5" />
                                    ) : (
                                        <AlertCircle className="size-3.5" />
                                    )}
                                    {cameraState === 'starting' &&
                                        'Starting camera'}
                                    {scanPaused && 'Scan paused'}
                                    {cameraState === 'scanning' &&
                                        !scanPaused &&
                                        'Scanning QR code'}
                                    {cameraState === 'error' &&
                                        (selectedEventStatus === 'closed'
                                            ? 'Event closed'
                                            : 'Camera unavailable')}
                                    {cameraState === 'idle' &&
                                        'Select an event'}
                                </span>
                                {checkingIn && <span>Checking in...</span>}
                            </div>
                        </div>

                        {scanError && !scanErrorDialogOpen && (
                            <Alert variant="destructive">
                                <AlertCircle className="size-4" />
                                <AlertTitle>{scanErrorTitle}</AlertTitle>
                                <AlertDescription>{scanError}</AlertDescription>
                            </Alert>
                        )}
                    </section>

                    <section className="grid content-start gap-4 rounded-lg border bg-card p-4 shadow-xs">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                <Keyboard className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold">
                                    Participant ID entry
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Use this when the QR scan does not read.
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={submitManualCheckIn}
                            className="grid gap-3"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="participant_id">
                                    Participant ID
                                </Label>
                                <Input
                                    id="participant_id"
                                    value={manualParticipantId}
                                    onChange={(event) =>
                                        setManualParticipantId(
                                            event.target.value.toUpperCase(),
                                        )
                                    }
                                    placeholder="CERS-XXXX-2026"
                                    autoComplete="off"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={
                                    checkingIn ||
                                    !selectedEventId ||
                                    selectedEventStatus === 'closed'
                                }
                            >
                                {checkingIn ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="size-4" />
                                )}
                                Check in attendance
                            </Button>
                        </form>

                        {checkInResult && (
                            <div className="rounded-md border bg-muted/40 p-3 text-sm">
                                <p className="font-medium">
                                    {checkInResult.already_checked_in
                                        ? 'Already checked in: '
                                        : 'Last check-in: '}
                                    {checkInResult.participant.name}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    {formatDateTime(
                                        checkInResult.checked_in_at,
                                    )}{' '}
                                    for {checkInResult.event.name}
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => {
                                        closeSuccessDialog();
                                    }}
                                >
                                    <RotateCcw className="size-3.5" />
                                    Reset
                                </Button>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <Dialog
                open={checkInResult !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        closeSuccessDialog();
                    }
                }}
            >
                <DialogContent className="max-h-[calc(100vh-1rem)] gap-3 overflow-y-auto p-4 sm:max-w-lg">
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <CheckCircle2 className="size-4 text-emerald-600" />
                            {checkInResult?.already_checked_in
                                ? 'Already Checked In'
                                : 'Participant Checked In'}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            {checkInResult?.message}{' '}
                            {checkInResult &&
                                `Checked in at ${formatDateTime(
                                    checkInResult.checked_in_at,
                                )} for ${checkInResult.event.name}.`}
                        </DialogDescription>
                    </DialogHeader>

                    {checkInResult && (
                        <>
                            <VirtualIdCard
                                participant={checkInResult.participant}
                            />

                            <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Participant ID #
                                    </p>
                                    <p className="font-semibold">
                                        {checkInResult.participant
                                            .participant_id || 'Not assigned'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Participant Name
                                    </p>
                                    <p className="font-semibold">
                                        {checkInResult.participant.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        School or Organization
                                    </p>
                                    <p className="font-semibold">
                                        {checkInResult.participant
                                            .organization ||
                                            'Organization not assigned'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Event Checked In
                                    </p>
                                    <p className="font-semibold">
                                        {checkInResult.event.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Checked-In Date and Time
                                    </p>
                                    <p className="font-semibold">
                                        {formatDateTime(
                                            checkInResult.checked_in_at,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={scanErrorDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        restartScanner();
                    }
                }}
            >
                <DialogContent className="gap-3 p-4 sm:max-w-md">
                    <DialogHeader className="gap-1">
                        <DialogTitle className="inline-flex items-center gap-2 text-base">
                            <AlertCircle className="size-4 text-destructive" />
                            {scanErrorTitle}
                        </DialogTitle>
                        <DialogDescription className="text-xs leading-5">
                            {scanError}
                        </DialogDescription>
                    </DialogHeader>

                    <Button type="button" onClick={restartScanner}>
                        Restart scan
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}

AttendanceQrScanner.layout = {
    breadcrumbs: [
        {
            title: 'Attendance QR Scanner',
            href: '/attendance-qr-scanner',
        },
    ],
};
