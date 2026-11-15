import React, { useMemo, useState } from 'react';
import {
  Award,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  GraduationCap,
  LayoutGrid,
  List,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  CertificateRecord,
  FilterCriteria,
  NavPage,
  SkripsiFilter,
  SortOption,
  ViewMode,
} from '../types/certificate';
import {
  collectAvailableYears,
  filterAndSortCertificates,
  formatFileSize,
  formatIndonesianDate,
} from '../utils/certificateLogic';

interface CertificatesViewProps {
  certificates: CertificateRecord[];
  jenisSuggestions: string[];
  onNavigate: (page: NavPage) => void;
  onViewDetail: (cert: CertificateRecord) => void;
  onEdit: (cert: CertificateRecord) => void;
  onDelete: (cert: CertificateRecord) => void;
  onDownload: (cert: CertificateRecord) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certificates,
  onNavigate,
  onViewDetail,
  onEdit,
  onDelete,
  onDownload,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [criteria, setCriteria] = useState<FilterCriteria>({
    search: '',
    jenis: 'ALL',
    tahun: 'ALL',
    skripsi: 'all',
    sort: 'date-desc',
  });

  const usedJenisList = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of certificates) {
      const val = c.jenisSertifikat.trim();
      if (val && !map.has(val.toLowerCase())) {
        map.set(val.toLowerCase(), val);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'id'));
  }, [certificates]);

  const yearsList = useMemo(
    () => collectAvailableYears(certificates),
    [certificates]
  );

  const filtered = useMemo(
    () => filterAndSortCertificates(certificates, criteria),
    [certificates, criteria]
  );

  const resetFilters = () => {
    setCriteria({
      search: '',
      jenis: 'ALL',
      tahun: 'ALL',
      skripsi: 'all',
      sort: 'date-desc',
    });
  };

  if (certificates.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Award className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900">
          Belum Ada Sertifikat Tersimpan
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
          Mulai simpan sertifikat seminar, pelatihan, lomba, atau magang Anda
          dalam format PDF agar mudah dicari dan dikelompokkan kapan saja.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('tambah')}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <FilePlus2 className="h-4 w-4" />
          <span>Tambah Sertifikat</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Sertifikat Saya
          </h1>
          <p className="mt-0.5 text-sm text-slate-600 tabular-nums">
            Menampilkan {filtered.length} dari {certificates.length} sertifikat
            tersimpan
          </p>
        </div>

        {/* View Toggle */}
        <div
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1"
          role="group"
          aria-label="Mode tampilan daftar sertifikat"
        >
          <button
            type="button"
            onClick={() => setViewMode('card')}
            aria-pressed={viewMode === 'card'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'card'
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kartu</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'table'
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>Tabel</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <label htmlFor="search-sertifikat" className="sr-only">
              Cari sertifikat
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="search-sertifikat"
              type="search"
              value={criteria.search}
              onChange={(e) =>
                setCriteria((c) => ({ ...c, search: e.target.value }))
              }
              placeholder="Cari nama, deskripsi, jenis..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-jenis" className="sr-only">
              Filter jenis sertifikat
            </label>
            <select
              id="filter-jenis"
              value={criteria.jenis}
              onChange={(e) =>
                setCriteria((c) => ({ ...c, jenis: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="ALL">Semua Jenis</option>
              {usedJenisList.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-tahun" className="sr-only">
              Filter tahun diperoleh
            </label>
            <select
              id="filter-tahun"
              value={criteria.tahun}
              onChange={(e) =>
                setCriteria((c) => ({ ...c, tahun: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="ALL">Semua Tahun</option>
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-skripsi" className="sr-only">
              Filter status syarat skripsi
            </label>
            <select
              id="filter-skripsi"
              value={criteria.skripsi}
              onChange={(e) =>
                setCriteria((c) => ({
                  ...c,
                  skripsi: e.target.value as SkripsiFilter,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="all">Semua Status</option>
              <option value="skripsi">Syarat Skripsi</option>
              <option value="non-skripsi">Non-Skripsi</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="sort-sertifikat" className="sr-only">
              Urutkan sertifikat
            </label>
            <select
              id="sort-sertifikat"
              value={criteria.sort}
              onChange={(e) =>
                setCriteria((c) => ({
                  ...c,
                  sort: e.target.value as SortOption,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              <option value="date-desc">Terbaru</option>
              <option value="date-asc">Terlama</option>
              <option value="name-asc">Nama A–Z</option>
              <option value="name-desc">Nama Z–A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty Filter Result */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-900">
            Tidak ada sertifikat yang cocok dengan pencarian atau filter.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Reset Filter
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cert) => (
            <article
              key={cert.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md hover:shadow-slate-900/5"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                  {cert.namaSertifikat}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                  <span className="font-semibold text-teal-700">
                    {cert.jenisSertifikat}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {formatIndonesianDate(cert.tanggalDiperoleh)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {formatFileSize(cert.fileSize)}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-600 line-clamp-3">
                  {cert.deskripsi}
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    cert.isSyaratSkripsi
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {cert.isSyaratSkripsi ? 'Syarat Skripsi' : 'Umum'}
                  </span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewDetail(cert)}
                    aria-label={`Lihat pratinjau ${cert.namaSertifikat}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-teal-50 hover:text-teal-700"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(cert)}
                    aria-label={`Edit ${cert.namaSertifikat}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(cert)}
                    aria-label={`Unduh PDF ${cert.namaSertifikat}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(cert)}
                    aria-label={`Hapus ${cert.namaSertifikat}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Nama Sertifikat</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Syarat Skripsi</th>
                  <th className="px-4 py-3 text-right">Ukuran</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((cert) => (
                  <tr
                    key={cert.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="font-semibold text-slate-900 truncate">
                        {cert.namaSertifikat}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {cert.fileName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-teal-700 whitespace-nowrap">
                      {cert.jenisSertifikat}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {formatIndonesianDate(cert.tanggalDiperoleh)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {cert.isSyaratSkripsi ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <GraduationCap className="h-3.5 w-3.5" />
                          Ya
                        </span>
                      ) : (
                        <span className="text-slate-400">Tidak</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {formatFileSize(cert.fileSize)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewDetail(cert)}
                          aria-label={`Lihat pratinjau ${cert.namaSertifikat}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(cert)}
                          aria-label={`Edit ${cert.namaSertifikat}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownload(cert)}
                          aria-label={`Unduh PDF ${cert.namaSertifikat}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(cert)}
                          aria-label={`Hapus ${cert.namaSertifikat}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
