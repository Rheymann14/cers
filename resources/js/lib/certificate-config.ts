export type PaperSize = 'short' | 'a4' | 'long';

export type CertificateType = 'appearance' | 'participation';

export type CertificateContent = {
    title: string;
    intro: string;
    body: string;
    footer: string;
    vertical_offset: number;
};

export type CertificateSignatory = {
    name: string;
    position: string;
    signature_url: string | null;
};

export type CertificateTemplate = {
    logo_url: string | null;
    appearance_background_url: string | null;
    participation_background_url: string | null;
    appearance: CertificateContent;
    participation: CertificateContent;
    signatories: CertificateSignatory[];
};

export type CertificateEvent = {
    name: string;
    venue_name: string | null;
    venue_address: string | null;
    starts_at: string | null;
    ends_at: string | null;
};

export type CertificateRecipient = {
    name: string;
    participant_id: string | null;
    organization: string | null;
    position: string | null;
};

export type GeneratedCertificates = {
    bytes: Uint8Array;
    pageCount: number;
    missingAssets: string[];
};

// Page sizes in PDF points (1 in = 72 pt). "Long" is the 8.5 x 13 in folio bond paper.
export const paperSizes: Record<
    PaperSize,
    { label: string; description: string; width: number; height: number }
> = {
    short: {
        label: 'Short',
        description: '8.5 × 11 in',
        width: 612,
        height: 792,
    },
    a4: {
        label: 'A4',
        description: '210 × 297 mm',
        width: 595.28,
        height: 841.89,
    },
    long: {
        label: 'Long',
        description: '8.5 × 13 in',
        width: 612,
        height: 936,
    },
};

export const certificatePlaceholders = [
    { token: '{name}', description: 'Participant name' },
    { token: '{event}', description: 'Event name' },
    { token: '{date}', description: 'Event date(s)' },
    { token: '{given_date}', description: 'e.g. 10th Day of June 2026' },
    { token: '{venue}', description: 'Venue name and address' },
    { token: '{organization}', description: 'Participant organization' },
    { token: '{position}', description: 'Participant position' },
    { token: '{participant_id}', description: 'Participant ID' },
] as const;
