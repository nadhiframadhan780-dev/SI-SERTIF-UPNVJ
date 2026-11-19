import { MAX_PDF_SIZE_BYTES, formatFileSize } from './certificateLogic';

export type StorageHealthStatus =
  | 'aman'
  | 'sedang'
  | 'kritis'
  | 'tidak-tersedia';

export interface DeviceStorageEstimate {
  supported: boolean;
  quotaBytes: number | null;
  usageBytes: number | null;
  availableBytes: number | null;
  usagePercent: number;
  /** 70% of available browser origin quota — safe additional headroom before hitting OS/browser eviction or QuotaExceededError */
  recommendedSafeAdditionalBytes: number | null;
  /** Existing certificate bytes + safe additional headroom */
  recommendedTotalArchiveBytes: number | null;
  /** Effective safe max size for a single PDF upload */
  effectiveMaxSingleFileBytes: number;
  persisted: boolean | null;
  status: StorageHealthStatus;
  headlineAdvice: string;
  detailAdvice: string;
  estimatedOneGbFiles: number;
  estimatedStandardFiveMbFiles: number;
}

const SAFE_HEADROOM_RATIO = 0.7;
const CRITICAL_AVAILABLE_BYTES = 100 * 1024 * 1024; // 100 MB
const MEDIUM_AVAILABLE_BYTES = 1.5 * 1024 * 1024 * 1024; // 1.5 GB
const STANDARD_PDF_BYTES = 5 * 1024 * 1024; // 5 MB benchmark

export function formatStorageCapacity(bytes: number): string {
  return formatFileSize(Math.max(0, Math.round(bytes)));
}

export function buildDeviceStorageEstimate(input: {
  quotaBytes: number | null | undefined;
  usageBytes: number | null | undefined;
  certificatesTotalBytes: number;
  persisted: boolean | null;
}): DeviceStorageEstimate {
  const quota =
    typeof input.quotaBytes === 'number' &&
    Number.isFinite(input.quotaBytes) &&
    input.quotaBytes > 0
      ? input.quotaBytes
      : null;

  if (quota === null) {
    return {
      supported: false,
      quotaBytes: null,
      usageBytes: null,
      availableBytes: null,
      usagePercent: 0,
      recommendedSafeAdditionalBytes: null,
      recommendedTotalArchiveBytes: null,
      effectiveMaxSingleFileBytes: MAX_PDF_SIZE_BYTES,
      persisted: input.persisted,
      status: 'tidak-tersedia',
      headlineAdvice: 'Estimasi ruang perangkat tidak dilaporkan browser ini',
      detailAdvice:
        'Browser atau mode privat saat ini tidak menyediakan API estimasi kuota disk. Anda tetap dapat mengunggah PDF hingga 1 GB per file dan mencadangkan arsip secara berkala ke .upnvjdats.',
      estimatedOneGbFiles: 0,
      estimatedStandardFiveMbFiles: 0,
    };
  }

  const rawUsage =
    typeof input.usageBytes === 'number' &&
    Number.isFinite(input.usageBytes) &&
    input.usageBytes >= 0
      ? input.usageBytes
      : 0;
  const usageBytes = Math.min(rawUsage, quota);
  const availableBytes = Math.max(0, quota - usageBytes);
  const usagePercent = Math.min(100, Math.round((usageBytes / quota) * 100));

  const recommendedSafeAdditionalBytes = Math.floor(
    availableBytes * SAFE_HEADROOM_RATIO
  );
  const certBytes = Math.max(0, input.certificatesTotalBytes || 0);
  const recommendedTotalArchiveBytes =
    certBytes + recommendedSafeAdditionalBytes;

  const effectiveMaxSingleFileBytes = Math.min(
    MAX_PDF_SIZE_BYTES,
    availableBytes
  );
  const estimatedOneGbFiles = Math.floor(
    recommendedSafeAdditionalBytes / MAX_PDF_SIZE_BYTES
  );
  const estimatedStandardFiveMbFiles = Math.floor(
    recommendedSafeAdditionalBytes / STANDARD_PDF_BYTES
  );

  const safeAdditionalLabel = formatStorageCapacity(
    recommendedSafeAdditionalBytes
  );

  let status: StorageHealthStatus = 'aman';
  let headlineAdvice = `Saran maksimal tambah simpan: ${safeAdditionalLabel}`;
  let detailAdvice = '';

  if (availableBytes < CRITICAL_AVAILABLE_BYTES || usagePercent >= 90) {
    status = 'kritis';
    headlineAdvice = `Ruang hampir penuh — tersisa ${formatStorageCapacity(availableBytes)}`;
    detailAdvice = `Kapasitas aman tinggal ${safeAdditionalLabel}. Segera ekspor backup .upnvjdats dan kosongkan ruang penyimpanan perangkat sebelum menambah PDF besar.`;
  } else if (availableBytes < MEDIUM_AVAILABLE_BYTES || usagePercent >= 75) {
    status = 'sedang';
    headlineAdvice = `Saran maksimal tambah simpan: ${safeAdditionalLabel}`;
    detailAdvice = `Sisa ruang mulai terbatas (${formatStorageCapacity(availableBytes)}). Disarankan menyimpan tidak lebih dari ${safeAdditionalLabel} lagi dan rutin mencadangkan arsip ke .upnvjdats.`;
  } else {
    status = 'aman';
    const fileEquiv =
      estimatedOneGbFiles >= 1
        ? `setara sekitar ${estimatedOneGbFiles} file PDF ukuran 1 GB (atau ${estimatedStandardFiveMbFiles.toLocaleString('id-ID')} PDF standar ±5 MB)`
        : `setara sekitar ${estimatedStandardFiveMbFiles.toLocaleString('id-ID')} file PDF standar ±5 MB`;
    detailAdvice = `Dari sisa kuota browser ${formatStorageCapacity(availableBytes)}, batas aman tambahan yang disarankan adalah ${safeAdditionalLabel} (70% kapasitas kosong, ${fileEquiv}) agar sistem perangkat tetap lega saat ekspor/restore .upnvjdats.`;
  }

  return {
    supported: true,
    quotaBytes: quota,
    usageBytes,
    availableBytes,
    usagePercent,
    recommendedSafeAdditionalBytes,
    recommendedTotalArchiveBytes,
    effectiveMaxSingleFileBytes,
    persisted: input.persisted,
    status,
    headlineAdvice,
    detailAdvice,
    estimatedOneGbFiles,
    estimatedStandardFiveMbFiles,
  };
}

export async function inspectDeviceStorage(
  certificatesTotalBytes: number
): Promise<DeviceStorageEstimate> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return buildDeviceStorageEstimate({
      quotaBytes: null,
      usageBytes: null,
      certificatesTotalBytes,
      persisted: null,
    });
  }

  try {
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate(),
      typeof navigator.storage.persisted === 'function'
        ? navigator.storage.persisted().catch(() => null)
        : Promise.resolve(null),
    ]);

    return buildDeviceStorageEstimate({
      quotaBytes: estimate.quota ?? null,
      usageBytes: estimate.usage ?? 0,
      certificatesTotalBytes,
      persisted,
    });
  } catch {
    return buildDeviceStorageEstimate({
      quotaBytes: null,
      usageBytes: null,
      certificatesTotalBytes,
      persisted: null,
    });
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.persist !== 'function'
  ) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
