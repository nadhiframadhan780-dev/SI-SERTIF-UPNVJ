import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import type {
  CertificateFormValues,
  CertificateRecord,
} from '../types/certificate';
import {
  formatFileSize,
  validateCertificateForm,
  validatePdfFile,
  type FormValidationErrors,
} from '../utils/certificateLogic';
import { analyzeCertificatePdf } from '../utils/pdfService';
import { PdfPreviewer } from './PdfPreviewer';
import { useFeedback } from './ToastProvider';

interface AddCertificateViewProps {
  jenisSuggestions: string[];
  onSaveCertificate: (record: CertificateRecord) => Promise<void>;
  onSuccessNavigate: () => void;
}

export const AddCertificateView: React.FC<AddCertificateViewProps> = ({
  jenisSuggestions,
  onSaveCertificate,
  onSuccessNavigate,
}) => {
  const { showToast } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiStatusNote, setAiStatusNote] = useState<string | null>(null);

  const [values, setValues] = useState<CertificateFormValues>({
    namaSertifikat: '',
    deskripsi: '',
    jenisSertifikat: '',
    tanggalDiperoleh: new Date().toISOString().slice(0, 10),
    isSyaratSkripsi: false,
  });
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredSuggestions = jenisSuggestions.filter((item) =>
    item.toLowerCase().includes(values.jenisSertifikat.trim().toLowerCase())
  );

  const handleFileChosen = async (file: File | undefined) => {
    if (!file) return;

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setErrors((prev) => ({ ...prev, pdf: validation.error }));
      showToast('error', 'File Ditolak', validation.error);
      return;
    }

    aiAbortRef.current?.abort();
    const abortCtrl = new AbortController();
    aiAbortRef.current = abortCtrl;

    setErrors((prev) => ({ ...prev, pdf: undefined }));
    setSelectedFile(file);
    setAnalyzingAi(true);
    setAiStatusNote('Mengekstrak teks PDF dan menganalisis metadata...');

    const analysis = await analyzeCertificatePdf(
      file,
      file.name,
      abortCtrl.signal
    );
    if (aiAbortRef.current !== abortCtrl || abortCtrl.signal.aborted) return;
    setAnalyzingAi(false);

    setValues((prev) => ({
      ...prev,
      namaSertifikat: analysis.namaSertifikat || prev.namaSertifikat,
      deskripsi: analysis.deskripsi || prev.deskripsi,
    }));
    setErrors((prev) => ({
      ...prev,
      namaSertifikat: undefined,
      deskripsi: analysis.deskripsi ? undefined : prev.deskripsi,
    }));

    if (analysis.isFallback) {
      setAiStatusNote(
        analysis.message ||
          'Pengisian otomatis AI gagal, nama sertifikat diisi dari nama file.'
      );
      showToast(
        'warning',
        'Pengisian Otomatis Terbatas',
        analysis.message ||
          'Nama sertifikat diisi dari nama file. Silakan lengkapi atau sunting secara manual.'
      );
    } else {
      setAiStatusNote(
        'Nama sertifikat dan deskripsi berhasil diisi otomatis. Anda dapat menyuntingnya bila perlu.'
      );
      showToast(
        'success',
        'Sertifikat Berhasil Dianalisis',
        'Nama dan deskripsi terisi otomatis dari dokumen PDF.'
      );
    }
  };

  const handleClearFile = () => {
    aiAbortRef.current?.abort();
    setAnalyzingAi(false);
    setSelectedFile(null);
    setAiStatusNote(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCertificateForm(values, {
      requirePdf: true,
      hasPdf: Boolean(selectedFile),
    });

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      showToast(
        'error',
        'Data Belum Lengkap',
        'Periksa kembali kolom yang ditandai merah sebelum menyimpan.'
      );
      return;
    }

    if (!selectedFile) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const record: CertificateRecord = {
        id,
        namaSertifikat: values.namaSertifikat.trim(),
        deskripsi: values.deskripsi.trim(),
        jenisSertifikat: values.jenisSertifikat.trim(),
        tanggalDiperoleh: values.tanggalDiperoleh,
        isSyaratSkripsi: values.isSyaratSkripsi,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'application/pdf',
        pdfBlob: selectedFile,
        createdAt: now,
        updatedAt: now,
      };

      await onSaveCertificate(record);
      onSuccessNavigate();
    } catch (err) {
      const isQuotaError =
        err instanceof Error && err.name === 'QuotaExceededError';
      showToast(
        'error',
        isQuotaError
          ? 'Ruang Penyimpanan Penuh'
          : 'Gagal Menyimpan Sertifikat',
        isQuotaError
          ? 'Ruang penyimpanan browser/perangkat tidak mencukupi untuk file PDF ini. Kosongkan penyimpanan atau buat backup terlebih dahulu.'
          : 'Terjadi kendala saat menyimpan file ke IndexedDB browser.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Tambah Sertifikat Baru
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Unggah dokumen sertifikat berformat PDF (maksimal 1 GB). Nama dan
          deskripsi akan dianalisis otomatis, lalu lengkapi jenis dan tanggalnya.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* Left: PDF Upload & Live Preview */}
        <div className="space-y-4 xl:col-span-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              void handleFileChosen(file);
            }}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragging
                ? 'border-teal-500 bg-teal-50/70'
                : errors.pdf
                ? 'border-red-300 bg-red-50/30'
                : 'border-slate-300 bg-white hover:border-teal-400'
            }`}
          >
            <input
              ref={fileInputRef}
              id="pdf-upload-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => void handleFileChosen(e.target.files?.[0])}
              className="sr-only"
            />

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <UploadCloud className="h-6 w-6" />
            </div>

            {selectedFile ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-slate-900 break-all">
                  {selectedFile.name}
                </p>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  {formatFileSize(selectedFile.size)} · Dokumen PDF
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <label
                    htmlFor="pdf-upload-input"
                    className="cursor-pointer inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileUp className="h-3.5 w-3.5 text-teal-700" />
                    <span>Ganti File PDF</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Hapus File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  Seret dan lepas file PDF sertifikat ke sini
                </p>
                <p className="text-xs text-slate-500">
                  Hanya mendukung format PDF (.pdf) dengan ukuran maksimal 1 GB
                </p>
                <div className="pt-2">
                  <label
                    htmlFor="pdf-upload-input"
                    className="cursor-pointer inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
                  >
                    <FileUp className="h-4 w-4" />
                    <span>Pilih File PDF</span>
                  </label>
                </div>
              </div>
            )}

            {errors.pdf && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors.pdf}</span>
              </p>
            )}
          </div>

          {selectedFile && (
            <PdfPreviewer
              pdfBlob={selectedFile}
              fileName={selectedFile.name}
              maxHeightClass="max-h-[480px]"
            />
          )}
        </div>

        {/* Right: Metadata Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 xl:col-span-6"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <h2 className="text-base font-bold text-slate-900">
              Detail Informasi Sertifikat
            </h2>
            {analyzingAi && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menganalisis AI...</span>
              </span>
            )}
          </div>

          {analyzingAi && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs text-teal-900">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4.5 w-4.5 shrink-0 animate-spin text-teal-600" />
                <div>
                  <p className="font-semibold">
                    Sedang membaca isi sertifikat...
                  </p>
                  <p className="text-teal-700 mt-0.5">
                    Nama sertifikat dan deskripsi kegiatan sedang diekstrak
                    otomatis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const ctrl = aiAbortRef.current;
                  aiAbortRef.current = null;
                  ctrl?.abort();
                  setAnalyzingAi(false);
                  setAiStatusNote(
                    'Pengisian manual diaktifkan. Silakan lengkapi nama dan deskripsi sertifikat.'
                  );
                }}
                className="rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 whitespace-nowrap"
              >
                Isi Manual
              </button>
            </div>
          )}

          {!analyzingAi && aiStatusNote && (
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                aria-hidden="true"
              />
              <span>{aiStatusNote}</span>
            </div>
          )}

          {/* Nama Sertifikat */}
          <div>
            <label
              htmlFor="add-nama"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nama Sertifikat <span className="text-red-500">*</span>
            </label>
            <input
              id="add-nama"
              type="text"
              value={values.namaSertifikat}
              onChange={(e) => {
                setValues((v) => ({ ...v, namaSertifikat: e.target.value }));
                setErrors((err) => ({ ...err, namaSertifikat: undefined }));
              }}
              placeholder="Contoh: Sertifikat Peserta Seminar Nasional Keamanan Siber"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                errors.namaSertifikat
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
              }`}
            />
            {errors.namaSertifikat && (
              <p className="mt-1 text-xs text-red-600">
                {errors.namaSertifikat}
              </p>
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <label
              htmlFor="add-deskripsi"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Deskripsi Singkat <span className="text-red-500">*</span>
            </label>
            <textarea
              id="add-deskripsi"
              rows={3}
              value={values.deskripsi}
              onChange={(e) => {
                setValues((v) => ({ ...v, deskripsi: e.target.value }));
                setErrors((err) => ({ ...err, deskripsi: undefined }));
              }}
              placeholder="Ringkasan kegiatan, penyelenggara, dan keterangan penerima sertifikat (1–3 kalimat)"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                errors.deskripsi
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
              }`}
            />
            {errors.deskripsi && (
              <p className="mt-1 text-xs text-red-600">{errors.deskripsi}</p>
            )}
          </div>

          {/* Jenis & Tanggal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label
                htmlFor="add-jenis"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Jenis Sertifikat <span className="text-red-500">*</span>
              </label>
              <input
                id="add-jenis"
                type="text"
                autoComplete="off"
                value={values.jenisSertifikat}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
                onChange={(e) => {
                  setValues((v) => ({ ...v, jenisSertifikat: e.target.value }));
                  setErrors((err) => ({ ...err, jenisSertifikat: undefined }));
                  setShowSuggestions(true);
                }}
                placeholder="Ketik atau pilih jenis..."
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                  errors.jenisSertifikat
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                }`}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul
                  aria-label="Saran jenis sertifikat"
                  className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {filteredSuggestions.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setValues((v) => ({ ...v, jenisSertifikat: item }));
                          setErrors((err) => ({
                            ...err,
                            jenisSertifikat: undefined,
                          }));
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errors.jenisSertifikat && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.jenisSertifikat}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="add-tanggal"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tanggal Diperoleh <span className="text-red-500">*</span>
              </label>
              <input
                id="add-tanggal"
                type="date"
                value={values.tanggalDiperoleh}
                onChange={(e) => {
                  setValues((v) => ({
                    ...v,
                    tanggalDiperoleh: e.target.value,
                  }));
                  setErrors((err) => ({
                    ...err,
                    tanggalDiperoleh: undefined,
                  }));
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                  errors.tanggalDiperoleh
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                }`}
              />
              {errors.tanggalDiperoleh && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.tanggalDiperoleh}
                </p>
              )}
            </div>
          </div>

          {/* Syarat Skripsi Checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-amber-50/40 p-4 transition-colors hover:border-teal-300">
            <input
              type="checkbox"
              checked={values.isSyaratSkripsi}
              onChange={(e) =>
                setValues((v) => ({ ...v, isSyaratSkripsi: e.target.checked }))
              }
              className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                Sertifikat ini dapat digunakan sebagai syarat skripsi
              </span>
              <span className="block text-xs text-slate-600 mt-0.5">
                Jika dicentang, sertifikat otomatis masuk ke kelompok{' '}
                <strong>Syarat Wajib Skripsi</strong>.
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || analyzingAi}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap"
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Sertifikat'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
