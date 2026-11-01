import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import { paperSizes } from '@/lib/certificate-config';
import type {
    CertificateEvent,
    CertificateRecipient,
    CertificateTemplate,
    CertificateType,
    GeneratedCertificates,
    PaperSize,
} from '@/lib/certificate-config';

const PAGE_MARGIN_X = 36;
const PAGE_MARGIN_Y = 30;
const CERTIFICATE_GAP = 36;
// Font sizes below are tuned for an A4 half-page certificate this tall.
const BASE_CERTIFICATE_HEIGHT = 373;
const TEXT_COLOR = rgb(0.07, 0.07, 0.09);

type Region = { left: number; top: number; width: number; height: number };

type LoadedImage = { bytes: Uint8Array; type: 'png' | 'jpg' };

type EmbeddedAssets = {
    logo: PDFImage | null;
    backgrounds: Record<CertificateType, PDFImage | null>;
    signatures: Array<PDFImage | null>;
};

type Fonts = { regular: PDFFont; bold: PDFFont };

const imageCache = new Map<string, Promise<LoadedImage>>();

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
    return prefix.every((byte, index) => bytes[index] === byte);
}

async function convertToPng(blob: Blob): Promise<Uint8Array> {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close();

    const png = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
    );

    if (!png) {
        throw new Error('Unable to convert image.');
    }

    return new Uint8Array(await png.arrayBuffer());
}

async function fetchImage(url: string): Promise<LoadedImage> {
    const response = await fetch(url, { credentials: 'same-origin' });

    if (!response.ok) {
        throw new Error(`Unable to load ${url}`);
    }

    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());

    if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47])) {
        return { bytes, type: 'png' };
    }

    if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
        return { bytes, type: 'jpg' };
    }

    // pdf-lib only embeds PNG and JPEG, so re-encode anything else (e.g. WebP).
    return { bytes: await convertToPng(blob), type: 'png' };
}

function loadImage(url: string): Promise<LoadedImage> {
    const cached = imageCache.get(url);

    if (cached) {
        return cached;
    }

    const request = fetchImage(url).catch((error) => {
        imageCache.delete(url);

        throw error;
    });
    imageCache.set(url, request);

    return request;
}

async function embedImage(
    document: PDFDocument,
    url: string | null,
    label: string,
    missingAssets: string[],
): Promise<PDFImage | null> {
    if (!url) {
        return null;
    }

    try {
        const image = await loadImage(url);

        return image.type === 'png'
            ? await document.embedPng(image.bytes)
            : await document.embedJpg(image.bytes);
    } catch {
        missingAssets.push(label);

        return null;
    }
}

const characterSets = new WeakMap<PDFFont, Set<number>>();

// Standard PDF fonts only cover WinAnsi; drop accents or characters they can't encode.
function sanitize(font: PDFFont, text: string): string {
    let supported = characterSets.get(font);

    if (!supported) {
        supported = new Set(font.getCharacterSet());
        characterSets.set(font, supported);
    }

    const isSupported = (value: string) =>
        Array.from(value).every((character) =>
            supported.has(character.codePointAt(0) ?? 0),
        );

    return Array.from(text.normalize('NFC'))
        .map((character) => {
            if (isSupported(character)) {
                return character;
            }

            const stripped = character.normalize('NFD').replace(/[̀-ͯ]/g, '');

            return stripped && isSupported(stripped) ? stripped : '';
        })
        .join('');
}

function wrapText(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number,
): string[] {
    return text.split(/\r?\n/).flatMap((paragraph) => {
        const words = sanitize(font, paragraph).split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let line = '';

        for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;

            if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
                lines.push(line);
                line = word;
            } else {
                line = candidate;
            }
        }

        if (line) {
            lines.push(line);
        }

        return lines;
    });
}

function fitFontSize(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number,
): number {
    const width = font.widthOfTextAtSize(text, size);

    return width > maxWidth ? Math.max(6, (size * maxWidth) / width) : size;
}

function getDateParts(value: string, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? '';

    return {
        year: part('year'),
        month: part('month'),
        day: Number(part('day')),
    };
}

function ordinal(day: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const remainder = day % 100;

    return `${day}${suffixes[(remainder - 20) % 10] ?? suffixes[remainder] ?? suffixes[0]}`;
}

export function formatEventDateRange(
    startsAt: string | null,
    endsAt: string | null,
    timeZone: string,
): string {
    const startValue = startsAt ?? endsAt;
    const endValue = endsAt ?? startsAt;

    if (!startValue || !endValue) {
        return '';
    }

    const start = getDateParts(startValue, timeZone);
    const end = getDateParts(endValue, timeZone);

    if (start.year !== end.year) {
        return `${start.month} ${start.day}, ${start.year} – ${end.month} ${end.day}, ${end.year}`;
    }

    if (start.month !== end.month) {
        return `${start.month} ${start.day} – ${end.month} ${end.day}, ${end.year}`;
    }

    if (start.day !== end.day) {
        return `${start.month} ${start.day}–${end.day}, ${end.year}`;
    }

    return `${start.month} ${start.day}, ${start.year}`;
}

export function formatGivenDate(
    value: string | null,
    timeZone: string,
): string {
    if (!value) {
        return '';
    }

    const { year, month, day } = getDateParts(value, timeZone);

    return `${ordinal(day)} Day of ${month} ${year}`;
}

function fillPlaceholders(
    text: string,
    values: Record<string, string>,
): string {
    return text.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in values ? values[key] : match,
    );
}

function drawCenteredText(
    page: PDFPage,
    text: string,
    options: {
        font: PDFFont;
        size: number;
        centerX: number;
        baseline: number;
        underline?: boolean;
    },
) {
    const { font, size, centerX, baseline } = options;
    const width = font.widthOfTextAtSize(text, size);
    const x = centerX - width / 2;
    const y = page.getHeight() - baseline;

    page.drawText(text, { x, y, size, font, color: TEXT_COLOR });

    if (options.underline) {
        page.drawLine({
            start: { x: x - 4, y: y - size * 0.22 },
            end: { x: x + width + 4, y: y - size * 0.22 },
            thickness: Math.max(0.6, size * 0.07),
            color: TEXT_COLOR,
        });
    }
}

function drawImageContained(
    page: PDFPage,
    image: PDFImage,
    box: {
        centerX: number;
        top?: number;
        bottom?: number;
        maxWidth: number;
        maxHeight: number;
    },
) {
    const scale = Math.min(
        box.maxWidth / image.width,
        box.maxHeight / image.height,
    );
    const width = image.width * scale;
    const height = image.height * scale;
    const top = box.top !== undefined ? box.top : (box.bottom ?? 0) - height;

    page.drawImage(image, {
        x: box.centerX - width / 2,
        y: page.getHeight() - top - height,
        width,
        height,
    });
}

function drawCertificate(
    page: PDFPage,
    region: Region,
    type: CertificateType,
    template: CertificateTemplate,
    placeholders: Record<string, string>,
    assets: EmbeddedAssets,
    fonts: Fonts,
) {
    const content = template[type];
    const scale = region.height / BASE_CERTIFICATE_HEIGHT;
    const centerX = region.left + region.width / 2;
    const offset = ((content.vertical_offset || 0) / 100) * region.height;
    const at = (fraction: number) =>
        region.top + region.height * fraction + offset;
    const background = assets.backgrounds[type];

    if (background) {
        page.drawImage(background, {
            x: region.left,
            y: page.getHeight() - region.top - region.height,
            width: region.width,
            height: region.height,
        });
    } else {
        page.drawRectangle({
            x: region.left + 6,
            y: page.getHeight() - region.top - region.height + 6,
            width: region.width - 12,
            height: region.height - 12,
            borderColor: rgb(0.6, 0.62, 0.68),
            borderWidth: 0.75,
        });
    }

    if (assets.logo) {
        drawImageContained(page, assets.logo, {
            centerX,
            top: at(0.215),
            maxWidth: region.width * 0.5,
            maxHeight: region.height * 0.11,
        });
    }

    const titleSize = fitFontSize(
        sanitize(fonts.bold, content.title),
        fonts.bold,
        17 * scale,
        region.width * 0.86,
    );
    let cursor = at(0.38);
    drawCenteredText(page, sanitize(fonts.bold, content.title), {
        font: fonts.bold,
        size: titleSize,
        centerX,
        baseline: cursor,
    });

    if (content.intro.trim()) {
        cursor += 20 * scale;

        for (const line of wrapText(
            fillPlaceholders(content.intro, placeholders),
            fonts.regular,
            9.5 * scale,
            region.width * 0.8,
        )) {
            drawCenteredText(page, line, {
                font: fonts.regular,
                size: 9.5 * scale,
                centerX,
                baseline: cursor,
            });
            cursor += 11.5 * scale;
        }

        cursor -= 11.5 * scale;
    }

    const name = sanitize(fonts.bold, placeholders.name.toUpperCase());
    cursor += 20 * scale;
    drawCenteredText(page, name, {
        font: fonts.bold,
        size: fitFontSize(name, fonts.bold, 14 * scale, region.width * 0.86),
        centerX,
        baseline: cursor,
    });
    cursor += 4 * scale;
    // The first paragraph sits close to the name; later ones get a blank-line gap.
    let paragraphGap = 14 * scale;

    for (const text of [content.body, content.footer]) {
        if (!text.trim()) {
            continue;
        }

        cursor += paragraphGap;
        paragraphGap = 22 * scale;

        for (const line of wrapText(
            fillPlaceholders(text, placeholders),
            fonts.regular,
            9 * scale,
            region.width * 0.8,
        )) {
            drawCenteredText(page, line, {
                font: fonts.regular,
                size: 9 * scale,
                centerX,
                baseline: cursor,
            });
            cursor += 11.5 * scale;
        }

        cursor -= 11.5 * scale;
    }

    const signatories = template.signatories.filter((signatory) =>
        signatory.name.trim(),
    );

    if (signatories.length === 0) {
        return;
    }

    const signatureBaseline = Math.max(at(0.79), cursor + 44 * scale);
    const columnsWidth = region.width * (signatories.length > 1 ? 0.84 : 0.6);
    const columnWidth = columnsWidth / signatories.length;
    const columnsLeft = centerX - columnsWidth / 2;

    signatories.forEach((signatory, index) => {
        const columnCenter = columnsLeft + columnWidth * (index + 0.5);
        const signature =
            assets.signatures[template.signatories.indexOf(signatory)];
        const signatoryName = sanitize(fonts.bold, signatory.name);
        const nameSize = fitFontSize(
            signatoryName,
            fonts.bold,
            10 * scale,
            columnWidth * 0.92,
        );

        if (signature) {
            drawImageContained(page, signature, {
                centerX: columnCenter,
                bottom: signatureBaseline - 3 * scale,
                maxWidth: columnWidth * 0.7,
                maxHeight: 34 * scale,
            });
        }

        drawCenteredText(page, signatoryName, {
            font: fonts.bold,
            size: nameSize,
            centerX: columnCenter,
            baseline: signatureBaseline,
            underline: true,
        });

        if (signatory.position.trim()) {
            const position = sanitize(fonts.regular, signatory.position);

            drawCenteredText(page, position, {
                font: fonts.regular,
                size: fitFontSize(
                    position,
                    fonts.regular,
                    9 * scale,
                    columnWidth * 0.92,
                ),
                centerX: columnCenter,
                baseline: signatureBaseline + 12 * scale,
            });
        }
    });
}

/**
 * Build one page per recipient with the Certificate of Appearance on the top
 * half and the Certificate of Participation on the bottom half.
 */
export async function generateCertificatesPdf({
    template,
    event,
    recipients,
    paperSize,
    timeZone,
}: {
    template: CertificateTemplate;
    event: CertificateEvent;
    recipients: CertificateRecipient[];
    paperSize: PaperSize;
    timeZone: string;
}): Promise<GeneratedCertificates> {
    const document = await PDFDocument.create();
    const missingAssets: string[] = [];
    const fonts: Fonts = {
        regular: await document.embedFont(StandardFonts.TimesRoman),
        bold: await document.embedFont(StandardFonts.TimesRomanBold),
    };
    const [logo, appearance, participation, ...signatures] = await Promise.all([
        embedImage(document, template.logo_url, 'logo', missingAssets),
        embedImage(
            document,
            template.appearance_background_url,
            'Certificate of Appearance background',
            missingAssets,
        ),
        embedImage(
            document,
            template.participation_background_url,
            'Certificate of Participation background',
            missingAssets,
        ),
        ...template.signatories.map((signatory) =>
            embedImage(
                document,
                signatory.signature_url,
                `${signatory.name || 'signatory'} signature`,
                missingAssets,
            ),
        ),
    ]);
    const assets: EmbeddedAssets = {
        logo,
        backgrounds: { appearance, participation },
        signatures,
    };
    const paper = paperSizes[paperSize];
    const certificateHeight =
        (paper.height - PAGE_MARGIN_Y * 2 - CERTIFICATE_GAP) / 2;
    const regions: Record<CertificateType, Region> = {
        appearance: {
            left: PAGE_MARGIN_X,
            top: PAGE_MARGIN_Y,
            width: paper.width - PAGE_MARGIN_X * 2,
            height: certificateHeight,
        },
        participation: {
            left: PAGE_MARGIN_X,
            top: PAGE_MARGIN_Y + certificateHeight + CERTIFICATE_GAP,
            width: paper.width - PAGE_MARGIN_X * 2,
            height: certificateHeight,
        },
    };
    const sharedPlaceholders = {
        event: event.name,
        date: formatEventDateRange(event.starts_at, event.ends_at, timeZone),
        given_date: formatGivenDate(event.ends_at ?? event.starts_at, timeZone),
        venue: [event.venue_name, event.venue_address]
            .map((value) => value?.trim())
            .filter(Boolean)
            .join(', '),
    };

    document.setTitle(`${event.name} Certificates`);
    document.setCreator('CERS');
    document.setProducer('CERS');

    for (const recipient of recipients) {
        const page = document.addPage([paper.width, paper.height]);
        const placeholders = {
            ...sharedPlaceholders,
            name: recipient.name,
            organization: recipient.organization ?? '',
            position: recipient.position ?? '',
            participant_id: recipient.participant_id ?? '',
        };

        drawCertificate(
            page,
            regions.appearance,
            'appearance',
            template,
            placeholders,
            assets,
            fonts,
        );
        drawCertificate(
            page,
            regions.participation,
            'participation',
            template,
            placeholders,
            assets,
            fonts,
        );

        // Light dashed guide for cutting the sheet into two certificates.
        const cutY =
            paper.height -
            (PAGE_MARGIN_Y + certificateHeight + CERTIFICATE_GAP / 2);
        page.drawLine({
            start: { x: PAGE_MARGIN_X / 2, y: cutY },
            end: { x: paper.width - PAGE_MARGIN_X / 2, y: cutY },
            thickness: 0.4,
            color: rgb(0.75, 0.75, 0.78),
            dashArray: [3, 3],
        });
    }

    return {
        bytes: await document.save(),
        pageCount: recipients.length,
        missingAssets: [...new Set(missingAssets)],
    };
}
