import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type VirtualIdParticipant = {
    participant_id: string | null;
    name: string;
    given_name: string | null;
    surname: string | null;
    email: string | null;
    avatar: string | null;
    organization: string | null;
};

function initials(participant: VirtualIdParticipant): string {
    return (
        [participant.given_name, participant.surname]
            .map((value) => value?.trim()[0])
            .filter(Boolean)
            .join('')
            .toUpperCase() ||
        participant.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() ||
        'C'
    );
}

function hashString(value: string): string {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36).toUpperCase();
}

export default function VirtualIdCard({
    participant,
}: {
    participant: VirtualIdParticipant;
}) {
    const displayName = participant.name || 'Participant';
    const displayId = participant.participant_id || 'Not assigned';
    const organization = participant.organization ?? '';
    const fingerprint = hashString(
        [
            'CERS-VIRTUAL-ID',
            participant.participant_id ?? '',
            displayName,
            participant.email ?? '',
        ]
            .map((value) => value.trim().toLowerCase())
            .join('|'),
    );

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
                                initials(participant)
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
                    <div>
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
                        <QrCode className="size-3" /> QR Code
                    </div>
                    <div className="rounded-md bg-white p-1.5 shadow-inner">
                        <QRCodeSVG
                            value={`CERS:VID:2:${fingerprint}`}
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
