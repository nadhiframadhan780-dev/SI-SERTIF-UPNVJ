import type {
  BackupFilePayload,
  CategoryStat,
  CertificateFormValues,
  CertificateRecord,
  FilterCriteria,
  SkripsiProgress,
} from '../types/certificate';

export const MAX_PDF_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB
export const SKRIPSI_TARGET_COUNT = 5;

export const DEFAULT_JENIS_SUGGESTIONS: string[] = [
  'Seminar',
  'Pelatihan',
  'Lomba',
  'Magang',
  'Organisasi',
  'Bahasa',
  'Workshop',
  'Sertifikasi Profesi',
];

const CATEGORY_PALETTE = [
  '#0D9488', // Teal 600
  '#16A34A', // Green 600
  '#EAB308', // Yellow 500
  '#0284C7', // Sky 600
  '#0F766E', // Teal 700
  '#65A30D', // Lime 600
  '#D97706', // Amber 600
  '#0891B2', // Cyan 600
];

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePdfFile(file: {
  name: string;
  type: string;
  size: number;
}): PdfValidationResult {
  const lowerName = file.name.toLowerCase();
  const hasPdfExtension = lowerName.endsWith('.pdf');
  const hasPdfMime =
    file.type === 'application/pdf' || file.type === 'application/x-pdf';

  // Some browsers or OS file pickers leave file.type empty for .pdf; require extension AND valid/empty MIME
  if (!hasPdfExtension) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Hanya file PDF (.pdf) yang diperbolehkan.',
    };
  }

  if (file.type && !hasPdfMime) {
    return {
      valid: false,
      error: `Tipe file "${file.type}" ditolak. Pastikan file yang diunggah adalah dokumen PDF asli.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'File PDF kosong atau rusak. Silakan pilih file PDF yang valid.',
    };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Ukuran file melebihi batas maksimal 1 GB. Kompres PDF Anda terlebih dahulu.',
    };
  }

  return { valid: true };
}

export function formatTitleFromFilename(fileName: string): string {
  const withoutExt = fileName.replace(/\.pdf$/i, '');
  const cleaned = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Sertifikat Mahasiswa';
  }

  return cleaned
    .split(' ')
    .map((word) => {
      if (word.length <= 6 && /^[A-Z0-9]+$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export type FormValidationErrors = Partial<
  Record<keyof CertificateFormValues | 'pdf', string>
>;

export function validateCertificateForm(
  values: CertificateFormValues,
  options: { requirePdf: boolean; hasPdf: boolean }
): FormValidationErrors {
  const errors: FormValidationErrors = {};

  if (options.requirePdf && !options.hasPdf) {
    errors.pdf = 'File sertifikat PDF wajib diunggah.';
  }

  const nama = values.namaSertifikat.trim();
  if (!nama) {
    errors.namaSertifikat = 'Nama sertifikat wajib diisi.';
  } else if (nama.length < 3) {
    errors.namaSertifikat = 'Nama sertifikat minimal terdiri dari 3 karakter.';
  } else if (nama.length > 180) {
    errors.namaSertifikat = 'Nama sertifikat maksimal 180 karakter.';
  }

  const deskripsi = values.deskripsi.trim();
  if (!deskripsi) {
    errors.deskripsi = 'Deskripsi singkat sertifikat wajib diisi.';
  } else if (deskripsi.length < 10) {
    errors.deskripsi = 'Deskripsi minimal terdiri dari 10 karakter.';
  }

  const jenis = values.jenisSertifikat.trim();
  if (!jenis) {
    errors.jenisSertifikat = 'Jenis sertifikat wajib diisi atau dipilih.';
  } else if (jenis.length > 50) {
    errors.jenisSertifikat = 'Jenis sertifikat maksimal 50 karakter.';
  }

  if (!values.tanggalDiperoleh) {
    errors.tanggalDiperoleh = 'Tanggal diperoleh wajib diisi.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.tanggalDiperoleh)) {
    errors.tanggalDiperoleh = 'Format tanggal tidak valid.';
  }

  return errors;
}

export function calculateSkripsiProgress(
  certificates: Array<Pick<CertificateRecord, 'isSyaratSkripsi'>>,
  targetCount = SKRIPSI_TARGET_COUNT
): SkripsiProgress {
  const completedCount = certificates.filter((c) => c.isSyaratSkripsi).length;
  const remainingCount = Math.max(0, targetCount - completedCount);
  const percentage = Math.min(
    100,
    Math.round((completedCount / targetCount) * 100)
  );
  return {
    completedCount,
    targetCount,
    remainingCount,
    percentage,
    isFulfilled: completedCount >= targetCount,
  };
}

export function computeCategoryStats(
  certificates: Array<Pick<CertificateRecord, 'jenisSertifikat'>>
): CategoryStat[] {
  if (certificates.length === 0) return [];

  const counts = new Map<string, number>();
  for (const cert of certificates) {
    const label = cert.jenisSertifikat.trim() || 'Lainnya';
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  const total = certificates.length;
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id'))
    .map(([jenis, count], idx) => ({
      jenis,
      count,
      percentage: Math.round((count / total) * 100),
      color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
    }));
}

export function filterAndSortCertificates(
  certificates: CertificateRecord[],
  criteria: FilterCriteria
): CertificateRecord[] {
  const query = criteria.search.trim().toLowerCase();

  const filtered = certificates.filter((cert) => {
    if (query) {
      const haystack = [
        cert.namaSertifikat,
        cert.deskripsi,
        cert.jenisSertifikat,
        cert.fileName,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (
      criteria.jenis &&
      criteria.jenis !== 'ALL' &&
      cert.jenisSertifikat.toLowerCase() !== criteria.jenis.toLowerCase()
    ) {
      return false;
    }

    if (criteria.tahun && criteria.tahun !== 'ALL') {
      const year = cert.tanggalDiperoleh.slice(0, 4);
      if (year !== criteria.tahun) {
        return false;
      }
    }

    if (criteria.skripsi === 'skripsi' && !cert.isSyaratSkripsi) {
      return false;
    }
    if (criteria.skripsi === 'non-skripsi' && cert.isSyaratSkripsi) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (criteria.sort) {
      case 'date-asc':
        return a.tanggalDiperoleh.localeCompare(b.tanggalDiperoleh);
      case 'name-asc':
        return a.namaSertifikat.localeCompare(b.namaSertifikat, 'id');
      case 'name-desc':
        return b.namaSertifikat.localeCompare(a.namaSertifikat, 'id');
      case 'date-desc':
      default:
        return (
          b.tanggalDiperoleh.localeCompare(a.tanggalDiperoleh) ||
          b.createdAt.localeCompare(a.createdAt)
        );
    }
  });
}

export function collectJenisSuggestions(
  certificates: Array<Pick<CertificateRecord, 'jenisSertifikat'>>
): string[] {
  const seen = new Map<string, string>();
  for (const cert of certificates) {
    const trimmed = cert.jenisSertifikat.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.set(trimmed.toLowerCase(), trimmed);
    }
  }
  for (const def of DEFAULT_JENIS_SUGGESTIONS) {
    if (!seen.has(def.toLowerCase())) {
      seen.set(def.toLowerCase(), def);
    }
  }
  return Array.from(seen.values());
}

export function collectAvailableYears(
  certificates: Array<Pick<CertificateRecord, 'tanggalDiperoleh'>>
): string[] {
  const years = new Set<string>();
  for (const cert of certificates) {
    const year = cert.tanggalDiperoleh.slice(0, 4);
    if (/^\d{4}$/.test(year)) {
      years.add(year);
    }
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export function formatIndonesianDate(isoDate: string): string {
  if (!isoDate) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);

  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  if (monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${day} ${months[monthIdx]} ${year}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function validateBackupPayload(data: unknown): {
  valid: boolean;
  payload?: BackupFilePayload;
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Format file backup tidak valid.' };
  }
  const obj = data as Record<string, unknown>;
  if (obj.app !== 'SI-SERTIF-UPNVJ' || !Array.isArray(obj.certificates)) {
    return {
      valid: false,
      error: 'File ini bukan backup resmi SI-SERTIF UPNVJ.',
    };
  }

  for (const item of obj.certificates) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Data sertifikat di dalam backup rusak.' };
    }
    const rec = item as Record<string, unknown>;
    if (
      typeof rec.id !== 'string' ||
      typeof rec.namaSertifikat !== 'string' ||
      typeof rec.pdfBase64 !== 'string'
    ) {
      return {
        valid: false,
        error: 'Struktur item sertifikat di file backup tidak lengkap.',
      };
    }
  }

  return { valid: true, payload: obj as unknown as BackupFilePayload };
}
