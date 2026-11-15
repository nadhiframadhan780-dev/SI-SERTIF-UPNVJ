export type NavPage =
  | 'beranda'
  | 'sertifikat'
  | 'tambah'
  | 'skripsi'
  | 'telusuri'
  | 'backup'
  | 'tentang';

export type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

export type ViewMode = 'card' | 'table';

export type SkripsiFilter = 'all' | 'skripsi' | 'non-skripsi';

export interface CertificateRecord {
  id: string;
  namaSertifikat: string;
  deskripsi: string;
  jenisSertifikat: string;
  tanggalDiperoleh: string; // YYYY-MM-DD
  isSyaratSkripsi: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pdfBlob: Blob;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CertificateFormValues {
  namaSertifikat: string;
  deskripsi: string;
  jenisSertifikat: string;
  tanggalDiperoleh: string;
  isSyaratSkripsi: boolean;
}

export interface FilterCriteria {
  search: string;
  jenis: string;
  tahun: string;
  skripsi: SkripsiFilter;
  sort: SortOption;
}

export interface SkripsiProgress {
  completedCount: number;
  targetCount: number;
  remainingCount: number;
  percentage: number;
  isFulfilled: boolean;
}

export interface CategoryStat {
  jenis: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SerializedCertificateBackup {
  id: string;
  namaSertifikat: string;
  deskripsi: string;
  jenisSertifikat: string;
  tanggalDiperoleh: string;
  isSyaratSkripsi: boolean;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pdfBase64: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackupFilePayload {
  app: 'SI-SERTIF-UPNVJ';
  version: number;
  exportedAt: string;
  certificates: SerializedCertificateBackup[];
}

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}
