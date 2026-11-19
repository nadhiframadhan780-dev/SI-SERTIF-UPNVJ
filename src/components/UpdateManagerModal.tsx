import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  GitCommitHorizontal,
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
  X,
} from 'lucide-react';
import { APP_RELEASES } from '../data/changelog';
import type { AppBuildInfo, JustUpdatedRecord } from '../types/update';
import { applyPwaUpdate } from '../utils/pwaUpdater';
import {
  formatIndonesianDateTime,
  resolveDisplayReleases,
} from '../utils/updateLogic';

export const JUST_UPDATED_STORAGE_KEY = 'si_sertif_just_updated';

interface UpdateManagerModalProps {
  open: boolean;
  onClose: () => void;
  localInfo: AppBuildInfo;
  remoteInfo: AppBuildInfo | null;
  hasUpdate: boolean;
  checking: boolean;
  justUpdated: JustUpdatedRecord | null;
  onCheckNow: () => Promise<boolean>;
  onClearJustUpdated: () => void;
}

const UPDATE_STEPS = [
  'Mengambil paket & catatan pembaruan terbaru dari server...',
  'Menyegarkan cache aplikasi & Service Worker PWA (data sertifikat tetap aman)...',
  'Menerapkan antarmuka & fitur terbaru SI-SERTIF UPNVJ...',
];

export const UpdateManagerModal: React.FC<UpdateManagerModalProps> = ({
  open,
  onClose,
  localInfo,
  remoteInfo,
  hasUpdate,
  checking,
  justUpdated,
  onCheckNow,
  onClearJustUpdated,
}) => {
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const activeManifest = remoteInfo || localInfo;
  const displayReleases = resolveDisplayReleases({
    remoteInfo,
    localInfo,
    fallbackReleases: APP_RELEASES,
    activeBuiltAt: justUpdated?.builtAt || activeManifest.builtAt,
    activeVersion: justUpdated?.toVersion || activeManifest.version,
  });
  const latestRelease = displayReleases[0] || APP_RELEASES[0];

  const startApplyUpdate = async () => {
    if (applying) return;
    setApplying(true);
    setProgress(12);
    setActiveStepIndex(0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setProgress(44);
      setActiveStepIndex(1);

      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((name) => caches.delete(name)));
        } catch {
          // ignore cache deletion error
        }
      }

      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch {
          // ignore SW refresh failures and still refresh cleanly
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 520));
      setProgress(82);
      setActiveStepIndex(2);

      const targetInfo = remoteInfo || localInfo;
      const record: JustUpdatedRecord = {
        fromBuildId: localInfo.buildId,
        toBuildId: targetInfo.buildId,
        toVersion: targetInfo.version,
        commitSha: targetInfo.commitSha,
        commitMessage: targetInfo.commitMessage,
        builtAt: targetInfo.builtAt,
      };
      try {
        sessionStorage.setItem(
          JUST_UPDATED_STORAGE_KEY,
          JSON.stringify(record)
        );
      } catch {
        // ignore storage quota errors
      }

      await new Promise((resolve) => setTimeout(resolve, 480));
      setProgress(100);
      await applyPwaUpdate();
      await new Promise((resolve) => setTimeout(resolve, 250));
      window.location.reload();
    } catch {
      setApplying(false);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (!open) {
      setApplying(false);
      setProgress(0);
      setActiveStepIndex(0);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, applying, onClose]);

  if (!open) return null;

  const handleClose = () => {
    if (applying) return;
    if (justUpdated) onClearJustUpdated();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-teal-50/80 via-white to-amber-50/60 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                applying
                  ? 'bg-teal-600 text-white'
                  : hasUpdate
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {applying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : hasUpdate ? (
                <Rocket className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2
                id="update-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {applying
                  ? 'Mengimplementasikan Pembaruan Terbaru'
                  : hasUpdate
                  ? 'Pembaruan Terbaru Tersedia'
                  : justUpdated
                  ? 'Pembaruan Berhasil Diimplementasikan'
                  : 'Pembaruan & Catatan Rilis'}
              </h2>
              <p className="text-xs text-slate-600">
                Terakhir diperbarui:{' '}
                <span className="font-medium text-slate-800">
                  {formatIndonesianDateTime(activeManifest.builtAt)}
                </span>
              </p>
            </div>
          </div>

          {!applying && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup jendela pembaruan"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {applying ? (
            /* Animated Update Progress View */
            <div className="space-y-5">
              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
                <div className="flex items-center justify-between text-xs font-semibold text-teal-900 mb-2">
                  <span>Progres Penerapan Pembaruan</span>
                  <span className="font-mono tabular-nums">{progress}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-teal-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-600 via-emerald-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <ul className="mt-4 space-y-2.5">
                  {UPDATE_STEPS.map((stepText, idx) => {
                    const done =
                      progress >= 100 || idx < activeStepIndex;
                    const active = !done && idx === activeStepIndex;
                    return (
                      <li
                        key={stepText}
                        className={`flex items-start gap-2.5 text-xs ${
                          done
                            ? 'text-emerald-800 font-medium'
                            : active
                            ? 'text-teal-900 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : active ? (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-teal-600" />
                        ) : (
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <span>{stepText}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Yang Sedang Diimplementasikan
                </h3>
                {activeManifest.commitMessage && (
                  <p className="text-sm font-semibold text-slate-900">
                    {activeManifest.commitMessage}
                  </p>
                )}
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {latestRelease.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Status Callout Banner */}
              {hasUpdate ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/30 px-2.5 py-1 text-[11px] font-bold text-amber-950">
                        <Rocket className="h-3.5 w-3.5" />
                        <span>
                          Pembaruan v{activeManifest.version} Siap Diimplementasikan
                        </span>
                      </span>
                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {activeManifest.commitMessage ||
                          'Pembaruan terbaru dari repositori GitHub telah tersedia. Tinjau daftar perubahan di bawah sebelum menerapkan.'}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Dipublikasikan:{' '}
                        {formatIndonesianDateTime(activeManifest.builtAt)}
                        {activeManifest.commitSha
                          ? ` · Commit ${activeManifest.commitSha}`
                          : ''}
                        {' · Belum diterapkan ke sesi Anda'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void startApplyUpdate()}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 whitespace-nowrap"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Implementasikan Pembaruan Sekarang</span>
                    </button>
                  </div>
                </div>
              ) : justUpdated ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-950">
                        Pembaruan v{justUpdated.toVersion} telah selesai
                        diimplementasikan!
                      </p>
                      <p className="mt-1 text-xs text-emerald-800">
                        {justUpdated.commitMessage
                          ? `Pembaruan aktif: ${justUpdated.commitMessage}. `
                          : ''}
                        Diperbarui pada{' '}
                        {formatIndonesianDateTime(justUpdated.builtAt)}. Data
                        sertifikat lokal Anda tetap tersimpan utuh.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
                      <span className="text-sm font-bold text-slate-900">
                        Aplikasi Sudah Versi Terbaru (v{localInfo.version})
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Pembaruan terakhir:{' '}
                      {formatIndonesianDateTime(localInfo.builtAt)}
                      {localInfo.commitSha
                        ? ` · Commit ${localInfo.commitSha}`
                        : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={checking}
                    onClick={() => void onCheckNow()}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50/60 hover:text-teal-800 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {checking ? 'Memeriksa...' : 'Cek Pembaruan'}
                    </span>
                  </button>
                </div>
              )}

              {/* Automatic GitHub / Build Commits Section */}
              {activeManifest.recentCommits.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <GitCommitHorizontal className="h-4 w-4 text-teal-700" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Pembaruan Terakhir dari GitHub
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {activeManifest.recentCommits.slice(0, 5).map((commit) => (
                      <div
                        key={commit.sha}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                            {commit.sha}
                          </span>
                          <span className="text-slate-800 font-medium truncate">
                            {commit.message}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                          {formatIndonesianDateTime(commit.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Curated Feature Explanation / Release Notes */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Penjelasan Fitur & Perubahan yang Diimplementasikan
                </h3>
                <div className="space-y-3">
                  {displayReleases.map((release, index) => (
                    <div
                      key={release.version}
                      className={`rounded-2xl border p-4 ${
                        index === 0
                          ? 'border-teal-200 bg-teal-50/35'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold ${
                              index === 0
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            v{release.version}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">
                            {release.title}
                          </h4>
                        </div>
                        <span className="text-[11px] font-medium text-slate-600">
                          {release.dateLabel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        {release.summary}
                      </p>
                      {index === 0 && activeManifest.commitMessage && (
                        <p className="mt-2 text-xs font-medium text-teal-900">
                          Pembaruan build terakhir
                          {activeManifest.commitSha
                            ? ` (${activeManifest.commitSha})`
                            : ''}
                          : {activeManifest.commitMessage}
                        </p>
                      )}
                      <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
                        {release.highlights.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!applying && (
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6">
            {hasUpdate && (
              <button
                type="button"
                onClick={() => void startApplyUpdate()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Implementasikan Sekarang</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
