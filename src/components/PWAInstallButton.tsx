import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 whitespace-nowrap ${
          compact ? '' : 'w-full'
        }`}
      >
        <Download className="h-4 w-4 shrink-0 text-teal-700" />
        <span>Instal Aplikasi</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap ${
            compact ? '' : 'w-full'
          }`}
        >
          <Smartphone className="h-4 w-4 shrink-0 text-teal-700" />
          <span>Instal di iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <h3
                  id="ios-install-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Instal SI-SERTIF di iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tutup panduan instalasi"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                <li>
                  Ketuk tombol <strong>Bagikan (Share)</strong> pada bilah Safari.
                </li>
                <li>
                  Gulir ke bawah dan pilih{' '}
                  <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 shadow-md"
    >
      <WifiOff className="h-4 w-4 text-amber-700" aria-hidden="true" />
      <span>Mode Offline — Data lokal IndexedDB tetap tersedia</span>
    </div>
  );
};
