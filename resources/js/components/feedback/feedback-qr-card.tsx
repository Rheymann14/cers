import { toPng } from 'html-to-image';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The link without its protocol, e.g. "cers.example.gov.ph/feedback/k7m2qx", for people to type.
 */
export function displayUrl(url: string): string {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function sanitizeFilePart(value: string): string {
    return (
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'event'
    );
}

/**
 * The printable feedback QR: event name, schedule and the code that opens the public form.
 * The card itself always renders light so it scans and prints reliably in dark mode.
 */
export function FeedbackQrCard({
    url,
    eventName,
    dateLabel,
    venueName,
    closed = false,
    showActions = true,
    size = 'default',
    className,
}: {
    url: string;
    eventName: string;
    dateLabel: string | null;
    venueName?: string | null;
    closed?: boolean;
    showActions?: boolean;
    size?: 'default' | 'large';
    className?: string;
}) {
    const large = size === 'large';
    const cardRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);

    async function download() {
        if (!cardRef.current) {
            return;
        }

        setDownloading(true);

        try {
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: '#ffffff',
            });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${sanitizeFilePart(eventName)}-feedback-qr.png`;
            link.click();
        } catch {
            toast.error('Unable to download the QR code.');
        } finally {
            setDownloading(false);
        }
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Unable to copy the link.');
        }
    }

    return (
        <div className={cn('grid gap-3', className)}>
            <div
                ref={cardRef}
                className={cn(
                    'relative mx-auto w-full overflow-hidden rounded-2xl border border-[#d9e5f5] bg-white text-center text-slate-900 shadow-sm',
                    large ? 'max-w-[26rem]' : 'max-w-[19rem]',
                )}
            >
                <div className="h-1.5 bg-[#0038A8]" />
                <div
                    className={cn(
                        'grid gap-3 pt-4 pb-5',
                        large ? 'px-6 sm:px-8' : 'px-5',
                    )}
                >
                    <div className="flex items-center justify-center gap-2">
                        <img
                            src="/ched_logo-128.png"
                            alt=""
                            className={cn(
                                'object-contain',
                                large ? 'size-10' : 'size-8',
                            )}
                        />
                        <span className="text-[11px] font-semibold tracking-[0.18em] text-[#0038A8] uppercase">
                            Event Feedback
                        </span>
                    </div>
                    <div className="grid gap-1">
                        <p
                            className={cn(
                                'leading-snug font-bold break-words',
                                large ? 'text-lg sm:text-xl' : 'text-base',
                            )}
                        >
                            {eventName}
                        </p>
                        {dateLabel && (
                            <p
                                className={cn(
                                    'font-medium text-slate-600',
                                    large ? 'text-sm' : 'text-xs',
                                )}
                            >
                                {dateLabel}
                            </p>
                        )}
                        {venueName && (
                            <p
                                className={cn(
                                    'text-slate-500',
                                    large ? 'text-xs' : 'text-[11px]',
                                )}
                            >
                                {venueName}
                            </p>
                        )}
                    </div>
                    <div
                        className={cn(
                            'mx-auto rounded-xl border border-[#d9e5f5] bg-white p-3',
                            closed && 'opacity-40',
                        )}
                    >
                        <QRCodeSVG
                            value={url}
                            size={large ? 248 : 196}
                            level="H"
                            marginSize={0}
                            fgColor="#0f172a"
                            imageSettings={{
                                src: '/ched_logo-128.png',
                                height: large ? 50 : 40,
                                width: large ? 50 : 40,
                                excavate: true,
                            }}
                        />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                        {closed
                            ? 'Responses are closed'
                            : 'Scan the QR code or type this link'}
                    </p>
                    <p
                        className={cn(
                            'rounded-lg border border-dashed border-[#0038A8]/40 bg-[#eef5ff] px-3 py-2 font-mono font-semibold break-all text-[#0038A8]',
                            large ? 'text-sm sm:text-base' : 'text-xs',
                        )}
                    >
                        {displayUrl(url)}
                    </p>
                </div>
            </div>

            {showActions && (
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={download}
                        disabled={downloading}
                        className="h-8 px-2 text-xs"
                    >
                        <Download className="size-3.5" />
                        PNG
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyLink}
                        className="h-8 px-2 text-xs"
                    >
                        {copied ? (
                            <Check className="size-3.5" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                        {copied ? 'Copied' : 'Copy link'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8 px-2 text-xs"
                    >
                        <a href={url} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5" />
                            Open
                        </a>
                    </Button>
                </div>
            )}
        </div>
    );
}
