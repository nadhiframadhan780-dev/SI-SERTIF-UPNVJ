import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileWarning,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { loadPdfDocument } from '../utils/pdfService';

interface PdfPreviewerProps {
  pdfBlob: Blob | null;
  fileName?: string;
  maxHeightClass?: string;
}

export const PdfPreviewer: React.FC<PdfPreviewerProps> = ({
  pdfBlob,
  fileName,
  maxHeightClass = 'max-h-[460px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pdfDocRef = useRef<{
    blob: Blob;
    handle: Awaited<ReturnType<typeof loadPdfDocument>>;
  } | null>(null);

  useEffect(() => {
    setCurrentPage(1);
    setZoom(1);
  }, [pdfBlob]);

  useEffect(() => {
    return () => {
      if (pdfDocRef.current) {
        void pdfDocRef.current.handle.dispose().catch(() => {});
        pdfDocRef.current = null;
      }
    };
  }, [pdfBlob]);

  useEffect(() => {
    if (!pdfBlob) return;
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null =
      null;

    async function renderPage() {
      if (!pdfBlob) return;
      setLoading(true);
      setError(null);
      try {
        let handle =
          pdfDocRef.current && pdfDocRef.current.blob === pdfBlob
            ? pdfDocRef.current.handle
            : null;
        if (!handle) {
          handle = await loadPdfDocument(pdfBlob);
          if (cancelled) {
            void handle.dispose().catch(() => {});
            return;
          }
          pdfDocRef.current = { blob: pdfBlob, handle };
        }
        const { pdf } = handle;
        setNumPages(pdf.numPages);

        const safePage = Math.min(Math.max(1, currentPage), pdf.numPages);
        const page = await pdf.getPage(safePage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth
          ? Math.max(260, containerRef.current.clientWidth - 48)
          : 520;
        const fitScale = Math.min(1.35, containerWidth / baseViewport.width);
        const targetScale = fitScale * zoom;

        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: targetScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({
          canvasContext: context,
          canvas,
          viewport,
        });
        await renderTask.promise;
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : 'Gagal merender file PDF.';
          if (!msg.toLowerCase().includes('cancel')) {
            setError('Pratinjau PDF gagal dimuat. File tetap dapat diunduh.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore cancellation error
        }
      }
    };
  }, [pdfBlob, currentPage, zoom]);

  if (!pdfBlob) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100/80">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-xs font-medium text-slate-700 max-w-[180px] sm:max-w-[260px]">
            {fileName || 'Pratinjau Sertifikat.pdf'}
          </span>
          {numPages > 0 && (
            <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
              · Hal {currentPage}/{numPages}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {numPages > 1 && (
            <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Halaman sebelumnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(numPages, p + 1))
                }
                disabled={currentPage >= numPages}
                aria-label="Halaman berikutnya"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            disabled={zoom <= 0.6}
            aria-label="Perkecil pratinjau"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-12 text-center font-mono text-xs font-medium text-slate-700 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            disabled={zoom >= 2.2}
            aria-label="Perbesar pratinjau"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset zoom pratinjau"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Paper Viewport */}
      <div
        ref={containerRef}
        className={`relative overflow-auto p-4 sm:p-6 ${maxHeightClass}`}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/70 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              <span>Memuat halaman PDF...</span>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white p-8 text-center">
            <FileWarning className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium text-slate-800">{error}</p>
          </div>
        ) : (
          <div className="mx-auto w-fit rounded-sm border border-slate-200 bg-white p-1.5 shadow-md shadow-slate-900/10">
            <canvas
              ref={canvasRef}
              data-testid="pdf-preview-canvas"
              className="block max-w-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
