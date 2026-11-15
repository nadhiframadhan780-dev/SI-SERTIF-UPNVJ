import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  FileJson,
  HardDrive,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CertificateRecord } from '../types/certificate';
import {
  formatFileSize,
  validateBackupPayload,
} from '../utils/certificateLogic';
import {
  clearAllCertificates,
  exportBackupPayload,
  restoreBackupPayload,
} from '../utils/db';
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
      const payload = await exportBackupPayload();
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `si-sertif-upnvj-backup-${dateStamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(
        'success',
        'Backup Berhasil Diunduh',
        `${payload.certificates.length} sertifikat beserta file PDF telah diekspor.`
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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setRestoring(true);
    try {
      const rawText = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        showToast(
          'error',
          'File Rusak',
          'File backup bukan JSON yang valid.'
        );
        return;
      }

      const validation = validateBackupPayload(parsed);
      if (!validation.valid || !validation.payload) {
        showToast(
          'error',
          'Backup Tidak Valid',
          validation.error || 'Struktur backup tidak dikenali.'
        );
        return;
      }

      const incomingCount = validation.payload.certificates.length;
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

      const restoredCount = await restoreBackupPayload(
        validation.payload,
        restoreMode
      );
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
    } catch {
      showToast(
        'error',
        'Gagal Memulihkan Backup',
        'Pastikan file backup tidak rusak dan berasal dari SI-SERTIF UPNVJ.'
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleClearAll = async () => {
    if (certificates.length === 0) return;

    const ok = await confirm({
      title: 'Hapus Seluruh Data Sertifikat?',
      message: `Tindakan ini akan menghapus ${certificates.length} sertifikat dan seluruh file PDF dari penyimpanan browser secara permanen. Pastikan Anda sudah membuat backup terlebih dahulu.`,
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
          Cadangkan seluruh sertifikat beserta file PDF dari penyimpanan
          IndexedDB agar aman saat berpindah perangkat atau membersihkan browser.
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
            Mendukung dokumen PDF hingga 10 MB per file
          </p>
        </div>
      </section>

      {/* Export & Restore Cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <FileJson className="h-5.5 w-5.5" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">
              Ekspor Backup (.json)
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Mengunduh satu file cadangan berisi seluruh metadata sertifikat,
              status syarat skripsi, dan file PDF asli Anda.
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
              {exporting ? 'Menyiapkan Backup...' : 'Unduh File Backup'}
            </span>
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <RotateCcw className="h-5.5 w-5.5" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">
              Restore dari File Backup
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Pilih file <code className="font-mono text-xs">.json</code> hasil
              ekspor SI-SERTIF UPNVJ untuk memulihkan sertifikat beserta PDF-nya
              ke perangkat ini.
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

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
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
              {restoring ? 'Memulihkan Data...' : 'Pilih File Backup (.json)'}
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
