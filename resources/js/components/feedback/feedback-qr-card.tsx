import { toPng } from 'html-to-image';
import { Check, Copy, Download, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    className,
}: {
    url: string;
    eventName: string;
    dateLabel: string | null;
    venueName?: string | null;
    closed?: boolean;
    showActions?: boolean;
    className?: string;
}) {
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
                className="relative mx-auto w-full max-w-[19rem] overflow-hidden rounded-2xl border border-[#d9e5f5] bg-white text-center text-slate-900 shadow-sm"
            >
                <div className="h-1.5 bg-[#0038A8]" />
                <div className="grid gap-3 px-5 pt-4 pb-5">
                    <div className="flex items-center justify-center gap-2">
                        <img
                            src="/ched_logo-128.png"
                            alt=""
                            className="size-8 object-contain"
                        />
                        <span className="text-[11px] font-semibold tracking-[0.18em] text-[#0038A8] uppercase">
                            Event Feedback
                        </span>
                    </div>
                    <div className="grid gap-1">
                        <p className="text-base leading-snug font-bold break-words">
                            {eventName}
                        </p>
                        {dateLabel && (
                            <p className="text-xs font-medium text-slate-600">
                                {dateLabel}
                            </p>
                        )}
                        {venueName && (
                            <p className="text-[11px] text-slate-500">
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
                            size={196}
                            level="H"
                            marginSize={0}
                            fgColor="#0f172a"
                            imageSettings={{
                                src: '/ched_logo-128.png',
                                height: 40,
                                width: 40,
                                excavate: true,
                            }}
                        />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                        {closed
                            ? 'Responses are closed'
                            : 'Scan to share your feedback'}
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
