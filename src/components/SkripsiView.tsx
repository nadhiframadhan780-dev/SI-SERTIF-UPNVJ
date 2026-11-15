import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  GraduationCap,
  MinusCircle,
  PlusCircle,
} from 'lucide-react';
import type {
  CertificateRecord,
  NavPage,
  SkripsiProgress,
} from '../types/certificate';
import { formatIndonesianDate } from '../utils/certificateLogic';

interface SkripsiViewProps {
  certificates: CertificateRecord[];
  skripsiProgress: SkripsiProgress;
  onNavigate: (page: NavPage) => void;
  onToggleSkripsi: (cert: CertificateRecord) => Promise<void>;
  onViewDetail: (cert: CertificateRecord) => void;
  onEdit: (cert: CertificateRecord) => void;
  onDownload: (cert: CertificateRecord) => void;
}

export const SkripsiView: React.FC<SkripsiViewProps> = ({
  certificates,
  skripsiProgress,
  onNavigate,
  onToggleSkripsi,
  onViewDetail,
  onEdit,
  onDownload,
}) => {
  const skripsiCertificates = certificates.filter((c) => c.isSyaratSkripsi);
  const nonSkripsiCertificates = certificates.filter((c) => !c.isSyaratSkripsi);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Syarat Wajib Skripsi
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Kelompok sertifikat mahasiswa yang dapat digunakan untuk memenuhi
            syarat minimal 5 sertifikat skripsi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('tambah')}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 whitespace-nowrap"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>Tambah Sertifikat</span>
        </button>
      </div>

      {/* Progress Card */}
      <section
        aria-label="Progres syarat wajib skripsi"
        className={`rounded-2xl border p-6 ${
          skripsiProgress.isFulfilled
            ? 'border-emerald-200 bg-emerald-50/60'
            : 'border-amber-200 bg-yellow-50/70'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                skripsiProgress.isFulfilled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-yellow-400 text-slate-900'
              }`}
            >
              {skripsiProgress.isFulfilled ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">
                {skripsiProgress.isFulfilled
                  ? 'Selamat! Syarat Wajib Skripsi Terpenuhi'
                  : 'Syarat Wajib Skripsi Belum Terpenuhi'}
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                {skripsiProgress.isFulfilled
                  ? `Anda telah mengumpulkan ${skripsiProgress.completedCount} sertifikat syarat skripsi (melebihi/memenuhi target minimal ${skripsiProgress.targetCount} sertifikat).`
                  : `Anda membutuhkan ${skripsiProgress.remainingCount} sertifikat lagi untuk memenuhi batas minimal ${skripsiProgress.targetCount} sertifikat syarat skripsi.`}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <span
              data-testid="skripsi-progress-count"
              className={`font-mono text-2xl font-bold tabular-nums ${
                skripsiProgress.isFulfilled
                  ? 'text-emerald-700'
                  : 'text-amber-800'
              }`}
            >
              {skripsiProgress.completedCount} / {skripsiProgress.targetCount}{' '}
              terpenuhi
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-white/90 border border-slate-200/70">
            <div
              role="progressbar"
              aria-valuenow={skripsiProgress.completedCount}
              aria-valuemin={0}
              aria-valuemax={skripsiProgress.targetCount}
              className={`h-full rounded-full transition-all duration-500 ${
                skripsiProgress.isFulfilled ? 'bg-emerald-600' : 'bg-yellow-500'
              }`}
              style={{ width: `${skripsiProgress.percentage}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-600 tabular-nums">
            <span>Progres Kelengkapan: {skripsiProgress.percentage}%</span>
            <span>Target Minimal: {skripsiProgress.targetCount} Sertifikat</span>
          </div>
        </div>
      </section>

      {/* Qualifying Certificates List */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Daftar Sertifikat Syarat Skripsi ({skripsiCertificates.length})
          </h2>
        </div>

        {skripsiCertificates.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Belum ada sertifikat yang ditandai sebagai syarat skripsi
            </p>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Centang opsi "Sertifikat ini dapat digunakan sebagai syarat
              skripsi" saat mengunggah atau mengedit sertifikat agar muncul di
              kelompok ini.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {skripsiCertificates.map((cert, index) => (
              <li
                key={cert.id}
                className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center hover:bg-slate-50/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                      {String(index + 1).padStart(2, '0')}.
                    </span>
                    <h3 className="truncate text-sm font-bold text-slate-900">
                      {cert.namaSertifikat}
                    </h3>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-7 text-xs text-slate-500">
                    <span className="font-medium text-teal-700">
                      {cert.jenisSertifikat}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {formatIndonesianDate(cert.tanggalDiperoleh)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-md text-slate-600">
                      {cert.deskripsi}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-7 sm:pl-0">
                  <button
                    type="button"
                    onClick={() => onViewDetail(cert)}
                    aria-label={`Lihat pratinjau ${cert.namaSertifikat}`}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5 text-teal-700" />
                    <span>Pratinjau</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(cert)}
                    aria-label={`Edit ${cert.namaSertifikat}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(cert)}
                    aria-label={`Unduh PDF ${cert.namaSertifikat}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onToggleSkripsi(cert)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 text-xs font-medium text-amber-800 hover:bg-amber-100 whitespace-nowrap"
                  >
                    <MinusCircle className="h-3.5 w-3.5" />
                    <span>Lepas Syarat</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Non-skripsi certificates quick add */}
      {nonSkripsiCertificates.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              Sertifikat Lainnya yang Belum Ditandai ({nonSkripsiCertificates.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Anda dapat memasukkan sertifikat berikut ke kelompok Syarat Wajib
              Skripsi dengan satu klik.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {nonSkripsiCertificates.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-col justify-between gap-3 px-6 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {cert.namaSertifikat}
                  </p>
                  <p className="text-xs text-slate-500">
                    {cert.jenisSertifikat} ·{' '}
                    <span className="tabular-nums">
                      {formatIndonesianDate(cert.tanggalDiperoleh)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onToggleSkripsi(cert)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 whitespace-nowrap self-start sm:self-auto"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Jadikan Syarat Skripsi</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
