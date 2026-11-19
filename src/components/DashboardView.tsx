import React from 'react';
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  FilePlus2,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react';
import type {
  CategoryStat,
  CertificateRecord,
  NavPage,
  SkripsiProgress,
} from '../types/certificate';
import { formatIndonesianDate } from '../utils/certificateLogic';
import { LogoMark } from './Sidebar';

interface DashboardViewProps {
  certificates: CertificateRecord[];
  skripsiProgress: SkripsiProgress;
  categoryStats: CategoryStat[];
  onNavigate: (page: NavPage) => void;
  onSelectCertificate: (cert: CertificateRecord) => void;
  onLoadSampleData: () => Promise<void>;
  loadingSamples: boolean;
}

const DonutChart: React.FC<{ stats: CategoryStat[]; total: number }> = ({
  stats,
  total,
}) => {
  const size = 168;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label="Grafik donat jumlah sertifikat per jenis"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />
        {stats.map((stat) => {
          const segmentLength = (stat.count / total) * circumference;
          const dashArray = `${Math.max(0, segmentLength - 2)} ${circumference}`;
          const dashOffset = -cumulativeOffset;
          cumulativeOffset += segmentLength;

          return (
            <circle
              key={stat.jenis}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={stat.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
          {total}
        </span>
        <span className="text-[11px] font-medium text-slate-500">
          Sertifikat
        </span>
      </div>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  certificates,
  skripsiProgress,
  categoryStats,
  onNavigate,
  onSelectCertificate,
  onLoadSampleData,
  loadingSamples,
}) => {
  const recentCertificates = certificates.slice(0, 5);
  const latestCert = certificates[0];

  if (certificates.length === 0) {
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <section className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-amber-50/60 p-6 sm:p-10 shadow-xs">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-xs">
              <LogoMark className="h-12 w-auto" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              Arsip Sertifikat Akademik Mahasiswa UPN Veteran Jakarta
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600">
              Simpan file PDF sertifikat Anda dengan aman langsung di perangkat,
              isi detail otomatis menggunakan analisis dokumen cerdas, dan pantau
              kelengkapan minimal 5 sertifikat syarat wajib skripsi secara rapi.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('tambah')}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 whitespace-nowrap"
              >
                <FilePlus2 className="h-4.5 w-4.5" />
                <span>Unggah Sertifikat Pertama</span>
              </button>
              <button
                type="button"
                onClick={onLoadSampleData}
                disabled={loadingSamples}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>
                  {loadingSamples ? 'Memuat Contoh...' : 'Muat Data Contoh'}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Empty State Highlights */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Award className="h-5 w-5" />
            </div>
            <h2 className="mt-3.5 text-sm font-semibold text-slate-900">
              Penyimpanan Lokal PDF Besar
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Menggunakan IndexedDB sehingga dokumen PDF hingga 1 GB tersimpan
              rapi dan tetap dapat diakses tanpa koneksi internet.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h2 className="mt-3.5 text-sm font-semibold text-slate-900">
              Pemantau Syarat Skripsi (0/5)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Tandai sertifikat yang memenuhi kriteria kelulusan agar progres 5
              sertifikat wajib skripsi selalu terpantau.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h2 className="mt-3.5 text-sm font-semibold text-slate-900">
              Siap Backup & Multi-Platform
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Ekspor seluruh sertifikat beserta file PDF ke satu file cadangan
              atau instal sebagai aplikasi PWA di HP dan desktop.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Summary */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-6 text-white shadow-sm sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-teal-100">
            Ringkasan Portofolio Akademik
          </p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight [text-wrap:balance]">
            Selamat Datang di SI-SERTIF UPNVJ
          </h1>
          <p className="text-xs sm:text-sm text-teal-50/90 max-w-xl">
            {skripsiProgress.isFulfilled
              ? 'Target minimal 5 sertifikat syarat wajib skripsi sudah terpenuhi. Pertahankan dan cadangkan data Anda secara berkala.'
              : `Anda telah mengumpulkan ${skripsiProgress.completedCount} dari ${skripsiProgress.targetCount} sertifikat syarat wajib skripsi.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('skripsi')}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-slate-900 shadow-sm transition-colors hover:bg-yellow-300 whitespace-nowrap"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Syarat Skripsi ({skripsiProgress.completedCount}/5)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tambah')}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 whitespace-nowrap"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>Tambah Sertifikat</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Sertifikat</span>
            <Award className="h-4.5 w-4.5 text-teal-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {certificates.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tersimpan aman di perangkat
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Syarat Wajib Skripsi</span>
            <GraduationCap
              className={`h-4.5 w-4.5 ${
                skripsiProgress.isFulfilled
                  ? 'text-emerald-600'
                  : 'text-amber-500'
              }`}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {skripsiProgress.completedCount} / {skripsiProgress.targetCount}
          </p>
          <p
            className={`mt-1 text-xs font-medium ${
              skripsiProgress.isFulfilled
                ? 'text-emerald-700'
                : 'text-amber-700'
            }`}
          >
            {skripsiProgress.isFulfilled
              ? 'Status: Terpenuhi'
              : `Kurang ${skripsiProgress.remainingCount} sertifikat lagi`}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Kategori Jenis</span>
            <Layers className="h-4.5 w-4.5 text-teal-600" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {categoryStats.length}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            Terbanyak:{' '}
            <span className="font-medium text-slate-700">
              {categoryStats[0]?.jenis || '-'}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Sertifikat Terbaru</span>
            <Calendar className="h-4.5 w-4.5 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 truncate text-base font-bold text-slate-900">
            {latestCert?.namaSertifikat || '-'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {latestCert
              ? formatIndonesianDate(latestCert.tanggalDiperoleh)
              : '-'}
          </p>
        </div>
      </section>

      {/* Breakdown Chart + Recent List */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Category Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Jumlah per Jenis Sertifikat
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribusi kategori sertifikat yang tersimpan
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
            <DonutChart stats={categoryStats} total={certificates.length} />

            <div className="w-full flex-1 space-y-3">
              {categoryStats.map((stat) => (
                <div key={stat.jenis} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-slate-700 truncate">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span className="truncate">{stat.jenis}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                      {stat.count} ({stat.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${stat.percentage}%`,
                        backgroundColor: stat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Certificates */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sertifikat Terbaru
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik sertifikat untuk melihat pratinjau dokumen PDF
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sertifikat')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 whitespace-nowrap"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {recentCertificates.map((cert) => (
              <button
                key={cert.id}
                type="button"
                onClick={() => onSelectCertificate(cert)}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors hover:bg-slate-50/80 rounded-lg px-2 -mx-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {cert.namaSertifikat}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span className="font-medium text-teal-700">
                      {cert.jenisSertifikat}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatIndonesianDate(cert.tanggalDiperoleh)}
                    </span>
                    {cert.isSyaratSkripsi && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-emerald-700">
                          Syarat Skripsi
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold text-teal-700 whitespace-nowrap">
                  Pratinjau
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
