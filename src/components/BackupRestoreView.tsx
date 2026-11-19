import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  FileArchive,
  HardDrive,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CertificateRecord } from '../types/certificate';
import {
  createUpnvjdatsBlobFromRecords,
  readBackupFile,
  UPNVJDATS_EXTENSION,
} from '../utils/backupArchive';
import { formatFileSize } from '../utils/certificateLogic';
import {
  clearAllCertificates,
  getAllCertificates,
  restoreBackupPayload,
  restoreCertificateRecords,
} from '../utils/db';
import { DeviceStorageCard } from './DeviceStorageCard';
import { useFeedback } from './ToastProvider';

interface BackupRestoreViewProps {
  certificates: CertificateRecord[];
  onRefreshCertificates: () => Promise<void>;
  onLoadSampleData: () => Promise<void>;
  loadingSamples: boolean;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  certificates,
  onRefreshCertificates,
  onLoadSampleData,
  loadingSamples,
}) => {
  const { showToast, confirm } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [isDraggingRestore, setIsDraggingRestore] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  const totalBytes = certificates.reduce((sum, c) => sum + c.fileSize, 0);

  const handleExport = async () => {
    if (certificates.length === 0) {
      showToast(
        'warning',
        'Tidak Ada Data',
        'Tambahkan minimal satu sertifikat sebelum membuat file backup.'
      );
      return;
    }

    setExporting(true);
    try {
      const allCerts = await getAllCertificates();
      const blob = await createUpnvjdatsBlobFromRecords(allCerts);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `si-sertif-upnvj-backup-${dateStamp}${UPNVJDATS_EXTENSION}`;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Delay revocation so mobile Safari / Android Chrome / WebViews finish reading the Blob URL
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);

      showToast(
        'success',
        'Backup .upnvjdats Berhasil Diunduh',
        `${allCerts.length} sertifikat beserta file PDF telah dikemas (${formatFileSize(blob.size)}).`
      );
    } catch {
      showToast(
        'error',
        'Gagal Membuat Backup',
        'Terjadi kendala saat mengekspor data dari IndexedDB.'
      );
    } finally {
      setExporting(false);
    }
  };

  const processRestoreFile = async (file: File | undefined) => {
    if (!file) return;

    setRestoring(true);
    try {
      const decoded = await readBackupFile(file);
      if (!decoded.valid || (!decoded.records && !decoded.payload)) {
        showToast(
          'error',
          'Backup Tidak Valid',
          decoded.error ||
            'Struktur file .upnvjdats tidak dikenali atau rusak.'
        );
        return;
      }

      const incomingCount = decoded.records
        ? decoded.records.length
        : decoded.payload!.certificates.length;
      const shouldProceed =
        certificates.length > 0
          ? await confirm({
              title:
                restoreMode === 'replace'
                  ? 'Ganti Semua Data dengan Backup?'
                  : 'Gabungkan Data Backup?',
              message:
                restoreMode === 'replace'
                  ? `Ditemukan ${incomingCount} sertifikat di file backup. Seluruh ${certificates.length} sertifikat lama akan dihapus dan diganti.`
                  : `Ditemukan ${incomingCount} sertifikat di file backup. Data akan ditambahkan dan diperbarui ke arsip Anda saat ini.`,
              confirmLabel:
                restoreMode === 'replace' ? 'Ya, Ganti Semua' : 'Ya, Gabungkan',
              cancelLabel: 'Batal',
              variant: restoreMode === 'replace' ? 'warning' : 'primary',
            })
          : true;

      if (!shouldProceed) {
        return;
      }

      const restoredCount = decoded.records
        ? await restoreCertificateRecords(decoded.records, restoreMode)
        : await restoreBackupPayload(decoded.payload!, restoreMode);
      await onRefreshCertificates();

      showToast(
        'success',
        'Restore Berhasil',
        `${restoredCount} sertifikat berhasil dipulihkan (${
          restoreMode === 'replace'
            ? 'mengganti data lama'
            : 'digabungkan dengan data yang ada'
        }).`
      );
    } catch (err) {
      const isQuotaError =
        err instanceof Error && err.name === 'QuotaExceededError';
      showToast(
        'error',
        isQuotaError
          ? 'Ruang Penyimpanan Browser Penuh'
          : 'Gagal Memulihkan Backup',
        isQuotaError
          ? 'Kapasitas penyimpanan perangkat/browser tidak mencukupi untuk menampung seluruh PDF dari file backup ini.'
          : 'Pastikan file .upnvjdats tidak rusak dan berasal dari SI-SERTIF UPNVJ.'
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await processRestoreFile(file);
  };

  const handleClearAll = async () => {
    if (certificates.length === 0) return;

    const ok = await confirm({
      title: 'Hapus Seluruh Data Sertifikat?',
      message: `Tindakan ini akan menghapus ${certificates.length} sertifikat dan seluruh file PDF dari penyimpanan browser secara permanen. Pastikan Anda sudah membuat backup .upnvjdats terlebih dahulu.`,
      confirmLabel: 'Ya, Hapus Semua',
      cancelLabel: 'Batal',
      variant: 'danger',
    });

    if (!ok) return;

    await clearAllCertificates();
    await onRefreshCertificates();
    showToast(
      'info',
      'Penyimpanan Dikosongkan',
      'Seluruh data sertifikat di perangkat ini telah dihapus.'
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Backup & Restore Data
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Cadangkan seluruh sertifikat beserta file PDF ke dalam satu file
          arsip <code className="font-mono text-xs font-semibold">.upnvjdats</code>{' '}
          yang ringkas dan kompatibel di semua perangkat (HP, tablet, maupun PC).
        </p>
      </div>

      {/* Storage Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Jumlah Data Tersimpan</span>
            <Database className="h-4.5 w-4.5 text-teal-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {certificates.length} Sertifikat
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tersimpan persisten di IndexedDB browser
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Ukuran Dokumen PDF</span>
            <HardDrive className="h-4.5 w-4.5 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatFileSize(totalBytes)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Mendukung dokumen PDF hingga 1 GB per file
          </p>
        </div>
      </section>

      {/* Device Storage Quota & Safe Limit Recommendation */}
      <DeviceStorageCard certificatesTotalBytes={totalBytes} variant="full" />

      {/* Export & Restore Cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <FileArchive className="h-5.5 w-5.5" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1 font-mono text-[11px] font-semibold text-teal-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                .upnvjdats
              </span>
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">
              Ekspor Backup (.upnvjdats)
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Mengemas seluruh metadata sertifikat, status syarat skripsi, dan
              file PDF asli menjadi satu arsip terkompresi{' '}
              <code className="font-mono text-xs">.upnvjdats</code> lengkap
              dengan verifikasi integritas data lintas perangkat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            <Download className="h-4.5 w-4.5" />
            <span>
              {exporting
                ? 'Mengemas Arsip .upnvjdats...'
                : 'Unduh File Backup (.upnvjdats)'}
            </span>
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingRestore(true);
          }}
          onDragLeave={() => setIsDraggingRestore(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingRestore(false);
            const droppedFile = e.dataTransfer.files?.[0];
            void processRestoreFile(droppedFile);
          }}
          className={`flex flex-col justify-between rounded-2xl border p-6 transition-colors ${
            isDraggingRestore
              ? 'border-emerald-400 bg-emerald-50/40'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <RotateCcw className="h-5.5 w-5.5" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">
              Restore dari File Backup
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Pilih atau seret file{' '}
              <code className="font-mono text-xs">.upnvjdats</code> hasil ekspor
              SI-SERTIF UPNVJ (juga mendukung arsip <code className="font-mono text-xs">.json</code> lama) untuk
              memulihkan sertifikat beserta PDF-nya di perangkat ini.
            </p>

            <div className="mt-4">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mode Pemulihan
              </span>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setRestoreMode('merge')}
                  aria-pressed={restoreMode === 'merge'}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    restoreMode === 'merge'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gabungkan
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreMode('replace')}
                  aria-pressed={restoreMode === 'replace'}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    restoreMode === 'replace'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ganti Semua
                </button>
              </div>
            </div>
          </div>

          {/* Intentionally omit `accept` so Android/iOS OS file pickers never gray out custom `.upnvjdats` files */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => void handleImportFile(e)}
            className="sr-only"
            id="restore-file-input"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            <Upload className="h-4.5 w-4.5" />
            <span>
              {restoring
                ? 'Memulihkan Arsip...'
                : 'Pilih File Backup (.upnvjdats)'}
            </span>
          </button>
        </div>
      </section>

      {/* Utilities */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-slate-900">Utilitas Data</h2>
        <p className="mt-1 text-xs text-slate-500">
          Gunakan data contoh untuk simulasi cepat atau kosongkan penyimpanan
          lokal.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onLoadSampleData()}
            disabled={loadingSamples}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>
              {loadingSamples ? 'Memuat Contoh...' : 'Muat 5 Data Contoh'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleClearAll()}
            disabled={certificates.length === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            <span>Hapus Semua Data</span>
          </button>
        </div>
      </section>
    </div>
  );
};
