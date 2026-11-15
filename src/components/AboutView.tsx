import React from 'react';
import {
  CheckCircle2,
  Database,
  FileSearch,
  GraduationCap,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { LogoMark } from './Sidebar';

export const AboutView: React.FC = () => {
  const features = [
    {
      Icon: FileSearch,
      title: 'Pratinjau PDF & Pengisian Otomatis',
      desc: 'Tampilkan dokumen PDF layaknya kertas sertifikat dengan fitur zoom dan navigasi halaman. Judul dan deskripsi otomatis diekstrak dari isi PDF.',
    },
    {
      Icon: GraduationCap,
      title: 'Kelompok Syarat Wajib Skripsi',
      desc: 'Tandai sertifikat yang memenuhi syarat skripsi untuk memantau progres otomatis menuju target minimal 5 sertifikat.',
    },
    {
      Icon: Database,
      title: 'Penyimpanan IndexedDB & Backup',
      desc: 'File PDF berukuran besar hingga 10 MB tersimpan lokal di browser, lengkap dengan fitur ekspor dan restore file cadangan.',
    },
    {
      Icon: Smartphone,
      title: 'PWA Multi-Platform',
      desc: 'Dapat diinstal di Android, iOS, maupun Desktop Windows sebagai aplikasi mandiri dan tetap dapat dibuka saat offline.',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Unggah Sertifikat PDF',
      desc: 'Masuk ke menu Tambah Sertifikat, seret atau pilih file PDF sertifikat Anda (maksimal 10 MB).',
    },
    {
      number: '02',
      title: 'Periksa Hasil Otomatis & Lengkapi Jenis',
      desc: 'Nama dan deskripsi akan terisi otomatis dari PDF. Tentukan jenis sertifikat dan tanggal diperoleh sesuai dokumen.',
    },
    {
      number: '03',
      title: 'Tandai Syarat Wajib Skripsi',
      desc: 'Centang opsi syarat skripsi bila sertifikat relevan untuk melengkapi target minimal 5 sertifikat kelulusan.',
    },
    {
      number: '04',
      title: 'Kelola & Cadangkan Secara Berkala',
      desc: 'Gunakan fitur cari, filter, urutkan, dan lakukan Backup data ke file .json agar arsip sertifikat tetap aman.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <LogoMark className="h-12 w-auto" />
        <h1 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Tentang SI-SERTIF UPNVJ
        </h1>
        <p className="mt-2 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-600">
          <strong>SI-SERTIF UPNVJ</strong> (Sistem Informasi Sertifikat UPN
          Veteran Jakarta) dirancang khusus untuk membantu mahasiswa menyimpan,
          mengelola, dan mengelompokkan seluruh sertifikat kegiatan akademik
          maupun non-akademik secara terstruktur, memantau kelengkapan syarat
          wajib skripsi, dan mengakses dokumen kapan saja secara aman langsung
          dari perangkat pribadi.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Privasi Terjaga (Data Tersimpan Lokal di IndexedDB)
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 text-teal-700">
            <CheckCircle2 className="h-4 w-4" />
            Mendukung Mode Offline (PWA)
          </span>
        </div>
      </section>

      {/* Feature List */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Fitur Utama</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4-Step Guide */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-bold text-slate-900">
          Cara Penggunaan (4 Langkah Mudah)
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
            >
              <span className="font-mono text-xs font-bold text-teal-700">
                {step.number}
              </span>
              <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
