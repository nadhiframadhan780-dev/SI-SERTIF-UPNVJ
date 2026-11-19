import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HardDrive,
  Info,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  formatStorageCapacity,
  inspectDeviceStorage,
  requestPersistentStorage,
  type DeviceStorageEstimate,
  type StorageHealthStatus,
} from '../utils/storageQuota';
import { MAX_PDF_SIZE_BYTES } from '../utils/certificateLogic';
import { useFeedback } from './ToastProvider';

interface DeviceStorageCardProps {
  certificatesTotalBytes: number;
  variant?: 'full' | 'compact';
  onOpenBackup?: () => void;
}

const STATUS_META: Record<
  StorageHealthStatus,
  {
    label: string;
    textClass: string;
    barClass: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  aman: {
    label: 'Kapasitas Aman',
    textClass: 'text-emerald-700',
    barClass: 'bg-teal-600',
    Icon: CheckCircle2,
  },
  sedang: {
    label: 'Ruang Mulai Terbatas',
    textClass: 'text-amber-700',
    barClass: 'bg-amber-500',
    Icon: AlertTriangle,
  },
  kritis: {
    label: 'Ruang Hampir Penuh',
    textClass: 'text-red-700',
    barClass: 'bg-red-500',
    Icon: AlertTriangle,
  },
  'tidak-tersedia': {
    label: 'Estimasi Terbatas',
    textClass: 'text-slate-600',
    barClass: 'bg-slate-400',
    Icon: Info,
  },
};

export const DeviceStorageCard: React.FC<DeviceStorageCardProps> = ({
  certificatesTotalBytes,
  variant = 'full',
  onOpenBackup,
}) => {
  const { showToast } = useFeedback();
  const [estimate, setEstimate] = useState<DeviceStorageEstimate | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingPersist, setRequestingPersist] = useState(false);

  const canRequestPersist =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.storage) &&
    typeof navigator.storage.persist === 'function';

  const loadEstimate = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await inspectDeviceStorage(certificatesTotalBytes);
      setEstimate(next);
    } finally {
      setRefreshing(false);
    }
  }, [certificatesTotalBytes]);

  useEffect(() => {
    void loadEstimate();
  }, [loadEstimate]);

  const handleEnablePersistent = async () => {
    setRequestingPersist(true);
    try {
      const granted = await requestPersistentStorage();
      await loadEstimate();
      if (granted) {
        showToast(
          'success',
          'Penyimpanan Persisten Aktif',
          'Browser menandai arsip sertifikat sebagai penyimpanan persisten agar tidak mudah terhapus otomatis.'
        );
      } else {
        showToast(
          'info',
          'Izin Persisten Belum Diberikan',
          'Browser menentukan penyimpanan persisten otomatis berdasarkan frekuensi penggunaan atau instalasi PWA.'
        );
      }
    } finally {
      setRequestingPersist(false);
    }
  };

  if (!estimate) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse"
        aria-busy="true"
      >
        <div className="h-4 w-48 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-36 rounded bg-slate-100" />
      </div>
    );
  }

  const meta = STATUS_META[estimate.status];
  const StatusIcon = meta.Icon;

  if (variant === 'compact') {
    const isConstrainedForOneGb =
      estimate.supported &&
      estimate.availableBytes !== null &&
      estimate.availableBytes < MAX_PDF_SIZE_BYTES;

    return (
      <section
        aria-label="Kapasitas penyimpanan perangkat"
        className="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <HardDrive className="h-4 w-4 text-teal-600" aria-hidden="true" />
            <span>Kapasitas Penyimpanan Perangkat</span>
          </div>
          <button
            type="button"
            onClick={() => void loadEstimate()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Perbarui Cek</span>
          </button>
        </div>

        {estimate.supported &&
        estimate.availableBytes !== null &&
        estimate.recommendedSafeAdditionalBytes !== null &&
        estimate.quotaBytes !== null ? (
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div>
                <span className="text-xs text-slate-500">
                  Sisa ruang browser:{' '}
                </span>
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {formatStorageCapacity(estimate.availableBytes)}
                </span>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {' '}
                  / {formatStorageCapacity(estimate.quotaBytes)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500">
                  Saran maksimal tambah simpan:{' '}
                </span>
                <span
                  className={`font-mono text-sm font-bold tabular-nums ${meta.textClass}`}
                >
                  {formatStorageCapacity(
                    estimate.recommendedSafeAdditionalBytes
                  )}
                </span>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${meta.barClass}`}
                style={{ width: `${Math.max(2, estimate.usagePercent)}%` }}
              />
            </div>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
              <StatusIcon
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.textClass}`}
              />
              <span>
                {isConstrainedForOneGb
                  ? `Perhatian: Sisa ruang saat ini (${formatStorageCapacity(estimate.availableBytes)}) di bawah 1 GB. Disarankan mengunggah PDF di bawah ${formatStorageCapacity(estimate.recommendedSafeAdditionalBytes)} atau ekspor backup terlebih dahulu.`
                  : estimate.detailAdvice}
              </span>
            </p>
          </div>
        ) : (
          <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
            {estimate.detailAdvice}
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Kapasitas Penyimpanan Perangkat dan Rekomendasi"
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <HardDrive className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sisa Storage Perangkat & Saran Maksimal Simpan
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className={`inline-flex items-center gap-1 font-semibold ${meta.textClass}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              {estimate.persisted !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {estimate.persisted
                      ? 'Penyimpanan Persisten Aktif'
                      : 'Penyimpanan Standar Browser'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {estimate.supported &&
            estimate.persisted === false &&
            canRequestPersist && (
              <button
                type="button"
                onClick={() => void handleEnablePersistent()}
                disabled={requestingPersist}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100/70 disabled:opacity-60 whitespace-nowrap"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  {requestingPersist
                    ? 'Meminta Izin...'
                    : 'Aktifkan Mode Persisten'}
                </span>
              </button>
            )}

          <button
            type="button"
            onClick={() => void loadEstimate()}
            disabled={refreshing}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Perbarui Cek</span>
          </button>

          {onOpenBackup && (
            <button
              type="button"
              onClick={onOpenBackup}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 whitespace-nowrap"
            >
              <span>Kelola & Backup</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {estimate.supported &&
      estimate.availableBytes !== null &&
      estimate.usageBytes !== null &&
      estimate.quotaBytes !== null &&
      estimate.recommendedSafeAdditionalBytes !== null ? (
        <>
          {/* 3-Column Metrics */}
          <div className="mt-5 grid grid-cols-1 gap-5 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Sisa Storage Tersedia
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {formatStorageCapacity(estimate.availableBytes)}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                dari total kuota {formatStorageCapacity(estimate.quotaBytes)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">
                Saran Maksimal Tambah Simpan
              </p>
              <p
                className={`mt-1 font-mono text-2xl font-bold tabular-nums ${meta.textClass}`}
              >
                {formatStorageCapacity(estimate.recommendedSafeAdditionalBytes)}
              </p>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {estimate.estimatedOneGbFiles >= 1
                  ? `≈ ${estimate.estimatedOneGbFiles} file ukuran 1 GB (batas aman 70%)`
                  : `≈ ${estimate.estimatedStandardFiveMbFiles.toLocaleString('id-ID')} PDF standar ±5 MB`}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">
                Terpakai di Browser Ini
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {formatStorageCapacity(estimate.usageBytes)}
              </p>
              <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {estimate.usagePercent}% terpakai · arsip PDF{' '}
                {formatStorageCapacity(certificatesTotalBytes)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Penggunaan Kuota Penyimpanan Situs</span>
              <span className="font-mono font-semibold text-slate-700 tabular-nums">
                {estimate.usagePercent}% terpakai
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${meta.barClass}`}
                style={{ width: `${Math.max(2, estimate.usagePercent)}%` }}
              />
            </div>
          </div>

          {/* Recommendation Details */}
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-800">
              {estimate.headlineAdvice}
            </p>
            <p className="mt-1">{estimate.detailAdvice}</p>
          </div>
        </>
      ) : (
        <div className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-800">
            {estimate.headlineAdvice}
          </p>
          <p className="mt-1">{estimate.detailAdvice}</p>
        </div>
      )}
    </section>
  );
};
