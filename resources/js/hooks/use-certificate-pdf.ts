import { useEffect, useState } from 'react';
import type {
    CertificateEvent,
    CertificateRecipient,
    CertificateTemplate,
    PaperSize,
} from '@/lib/certificate-config';

export type CertificatePdfRequest = {
    template: CertificateTemplate;
    event: CertificateEvent;
    recipients: CertificateRecipient[];
    paperSize: PaperSize;
    timeZone: string;
};

type CertificatePdfState = {
    url: string | null;
    generating: boolean;
    error: string | null;
    missingAssets: string[];
};

/**
 * Generate the certificates PDF in the browser whenever the request changes
 * and expose it as an object URL for the viewer, printing and downloading.
 */
export function useCertificatePdf(
    request: CertificatePdfRequest | null,
    delay = 0,
): CertificatePdfState {
    const requestKey =
        request && request.recipients.length > 0
            ? JSON.stringify(request)
            : null;
    const [state, setState] = useState<CertificatePdfState>({
        url: null,
        generating: false,
        error: null,
        missingAssets: [],
    });

    useEffect(() => {
        if (!requestKey) {
            return;
        }

        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            setState((current) => ({
                ...current,
                generating: true,
                error: null,
            }));

            try {
                const { generateCertificatesPdf } =
                    await import('@/lib/certificate-pdf');
                const result = await generateCertificatesPdf(
                    JSON.parse(requestKey) as CertificatePdfRequest,
                );

                if (cancelled) {
                    return;
                }

                setState({
                    url: URL.createObjectURL(
                        new Blob([result.bytes as BlobPart], {
                            type: 'application/pdf',
                        }),
                    ),
                    generating: false,
                    error: null,
                    missingAssets: result.missingAssets,
                });
            } catch {
                if (!cancelled) {
                    setState((current) => ({
                        ...current,
                        generating: false,
                        error: 'Unable to generate the certificates PDF. Please try again.',
                    }));
                }
            }
        }, delay);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [delay, requestKey]);

    useEffect(() => {
        const url = state.url;

        if (!url) {
            return;
        }

        return () => URL.revokeObjectURL(url);
    }, [state.url]);

    return requestKey
        ? state
        : { url: null, generating: false, error: null, missingAssets: [] };
}
