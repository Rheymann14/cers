import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FileText,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export default function CertificatePdfViewer({
    file,
    url,
    generating,
    statusLabel,
    error,
    className,
}: {
    file: Blob | null;
    url?: string | null;
    generating: boolean;
    statusLabel?: string;
    error?: string | null;
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [loadedPages, setLoadedPages] = useState<{
        file: Blob | null;
        count: number;
    }>({ file: null, count: 0 });
    const [pageState, setPageState] = useState<{
        file: Blob | null;
        page: number;
    }>({ file: null, page: 1 });
    const [loadError, setLoadError] = useState<{
        file: Blob | null;
        message: string;
    } | null>(null);
    // Reset to the first page whenever a new PDF is shown.
    const numPages = loadedPages.file === file ? loadedPages.count : 0;
    const pageNumber =
        pageState.file === file ? Math.min(pageState.page, numPages || 1) : 1;
    const loadErrorMessage =
        loadError && loadError.file === file ? loadError.message : null;

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const updateSize = () =>
            setContainerSize({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        const resizeObserver = new ResizeObserver(updateSize);

        updateSize();
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, []);

    function goToPage(page: number) {
        setPageState({ file, page });
    }

    // Fit the whole portrait page in view (pages are roughly 1:1.3–1:1.53).
    const pageWidth = Math.max(
        1,
        Math.min(containerSize.width - 24, (containerSize.height - 24) / 1.42),
    );

    return (
        <div
            className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/40',
                className,
            )}
        >
            <div
                ref={containerRef}
                className="relative grid min-h-0 flex-1 place-items-center overflow-auto p-3"
            >
                {error ? (
                    <p className="max-w-sm text-center text-sm text-destructive">
                        {error}
                    </p>
                ) : file ? (
                    <Document
                        file={file}
                        aria-label="Certificates PDF preview"
                        loading={
                            <Skeleton
                                className="rounded bg-background"
                                style={{
                                    width: pageWidth,
                                    height: pageWidth * 1.41,
                                }}
                            />
                        }
                        error={
                            <div className="flex max-w-sm flex-col items-center gap-2 text-center text-sm">
                                <p className="text-destructive">
                                    The PDF preview could not be loaded.
                                </p>
                                {loadErrorMessage && (
                                    <p className="text-xs break-words text-muted-foreground">
                                        {loadErrorMessage}
                                    </p>
                                )}
                                {url && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                    >
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            <ExternalLink className="size-3.5" />
                                            Open PDF in a new tab
                                        </a>
                                    </Button>
                                )}
                            </div>
                        }
                        onLoadSuccess={({ numPages: count }) =>
                            setLoadedPages({ file, count })
                        }
                        onLoadError={(loadFailure) => {
                            console.error(
                                'Certificate PDF preview failed to load.',
                                loadFailure,
                            );
                            setLoadError({
                                file,
                                message: loadFailure.message,
                            });
                        }}
                        onSourceError={(sourceFailure) => {
                            console.error(
                                'Certificate PDF preview source failed.',
                                sourceFailure,
                            );
                            setLoadError({
                                file,
                                message: sourceFailure.message,
                            });
                        }}
                    >
                        {containerSize.width > 0 && (
                            <Page
                                pageNumber={pageNumber}
                                width={pageWidth}
                                renderAnnotationLayer={false}
                                renderTextLayer={false}
                                className="overflow-hidden rounded bg-white shadow-md"
                            />
                        )}
                    </Document>
                ) : (
                    !generating && (
                        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="size-6" />
                            No certificates to preview.
                        </div>
                    )
                )}

                {generating && (
                    <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-[1px]">
                        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm">
                            <Spinner />
                            {statusLabel ?? 'Generating certificates...'}
                        </div>
                    </div>
                )}
            </div>

            {numPages > 1 && (
                <div className="flex items-center justify-center gap-2 border-t bg-background p-2 text-sm text-muted-foreground">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Previous page"
                        disabled={pageNumber <= 1}
                        onClick={() => goToPage(Math.max(1, pageNumber - 1))}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="min-w-24 text-center">
                        Page {pageNumber} of {numPages}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Next page"
                        disabled={pageNumber >= numPages}
                        onClick={() =>
                            goToPage(Math.min(numPages, pageNumber + 1))
                        }
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
