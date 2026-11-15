import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CertificateFormValues,
  CertificateRecord,
} from '../types/certificate';
import {
  formatFileSize,
  formatIndonesianDate,
  validateCertificateForm,
  type FormValidationErrors,
} from '../utils/certificateLogic';
import { PdfPreviewer } from './PdfPreviewer';

interface DetailModalProps {
  certificate: CertificateRecord | null;
  onClose: () => void;
  onEdit: (cert: CertificateRecord) => void;
  onDelete: (cert: CertificateRecord) => void;
  onDownload: (cert: CertificateRecord) => void;
}

export const CertificateDetailModal: React.FC<DetailModalProps> = ({
  certificate,
  onClose,
  onEdit,
  onDelete,
  onDownload,
}) => {
  if (!certificate) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="detail-modal-title"
              className="text-lg font-bold text-slate-900 leading-snug"
            >
              {certificate.namaSertifikat}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="font-medium text-teal-700">
                {certificate.jenisSertifikat}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {formatIndonesianDate(certificate.tanggalDiperoleh)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatFileSize(certificate.fileSize)}
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  certificate.isSyaratSkripsi
                    ? 'text-emerald-700'
                    : 'text-slate-500'
                }`}
              >
                {certificate.isSyaratSkripsi ? (
                  <>
                    <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                    Syarat Wajib Skripsi
                  </>
                ) : (
                  'Non-Skripsi'
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail sertifikat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Deskripsi Kegiatan
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {certificate.deskripsi}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Pratinjau Dokumen PDF
              </h3>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {certificate.fileName}
              </span>
            </div>
            <PdfPreviewer
              pdfBlob={certificate.pdfBlob}
              fileName={certificate.fileName}
              maxHeightClass="max-h-[420px]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            onClick={() => onDelete(certificate)}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            <span>Hapus</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onEdit(certificate)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Edit3 className="h-4 w-4 text-teal-700" />
              <span>Edit Data</span>
            </button>
            <button
              type="button"
              onClick={() => onDownload(certificate)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface EditModalProps {
  certificate: CertificateRecord | null;
  jenisSuggestions: string[];
  onClose: () => void;
  onSave: (id: string, values: CertificateFormValues) => Promise<void>;
}

export const CertificateEditModal: React.FC<EditModalProps> = ({
  certificate,
  jenisSuggestions,
  onClose,
  onSave,
}) => {
  const [values, setValues] = useState<CertificateFormValues>({
    namaSertifikat: '',
    deskripsi: '',
    jenisSertifikat: '',
    tanggalDiperoleh: '',
    isSyaratSkripsi: false,
  });
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (certificate) {
      setValues({
        namaSertifikat: certificate.namaSertifikat,
        deskripsi: certificate.deskripsi,
        jenisSertifikat: certificate.jenisSertifikat,
        tanggalDiperoleh: certificate.tanggalDiperoleh,
        isSyaratSkripsi: certificate.isSyaratSkripsi,
      });
      setErrors({});
    }
  }, [certificate]);

  if (!certificate) return null;

  const filteredSuggestions = jenisSuggestions.filter((item) =>
    item.toLowerCase().includes(values.jenisSertifikat.trim().toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateCertificateForm(values, {
      requirePdf: false,
      hasPdf: true,
    });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setSaving(true);
    try {
      await onSave(certificate.id, {
        ...values,
        namaSertifikat: values.namaSertifikat.trim(),
        deskripsi: values.deskripsi.trim(),
        jenisSertifikat: values.jenisSertifikat.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="edit-modal-title" className="text-base font-bold text-slate-900">
            Edit Informasi Sertifikat
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form edit"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-4">
          <div>
            <label
              htmlFor="edit-nama"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Nama Sertifikat <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-nama"
              type="text"
              value={values.namaSertifikat}
              onChange={(e) => {
                setValues((v) => ({ ...v, namaSertifikat: e.target.value }));
                setErrors((err) => ({ ...err, namaSertifikat: undefined }));
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                errors.namaSertifikat
                  ? 'border-red-300 focus:ring-red-200'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
              }`}
            />
            {errors.namaSertifikat && (
              <p className="mt-1 text-xs text-red-600">{errors.namaSertifikat}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-deskripsi"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Deskripsi Singkat <span className="text-red-500">*</span>
            </label>
            <textarea
              id="edit-deskripsi"
              rows={3}
              value={values.deskripsi}
              onChange={(e) => {
                setValues((v) => ({ ...v, deskripsi: e.target.value }));
                setErrors((err) => ({ ...err, deskripsi: undefined }));
              }}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <label
                htmlFor="edit-jenis"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Jenis Sertifikat <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-jenis"
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
                placeholder="Misal: Seminar, Pelatihan..."
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                  errors.jenisSertifikat
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                }`}
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {filteredSuggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setValues((v) => ({ ...v, jenisSertifikat: s }));
                          setErrors((err) => ({
                            ...err,
                            jenisSertifikat: undefined,
                          }));
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                      >
                        {s}
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
                htmlFor="edit-tanggal"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tanggal Diperoleh <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-tanggal"
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

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors hover:border-teal-300">
            <input
              type="checkbox"
              checked={values.isSyaratSkripsi}
              onChange={(e) =>
                setValues((v) => ({ ...v, isSyaratSkripsi: e.target.checked }))
              }
              className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="block text-sm font-semibold text-slate-800">
                Sertifikat ini dapat digunakan sebagai syarat skripsi
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Otomatis masuk ke daftar kelompok Syarat Wajib Skripsi (target
                minimal 5 sertifikat).
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
