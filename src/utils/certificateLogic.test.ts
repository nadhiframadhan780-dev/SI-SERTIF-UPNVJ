import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSkripsiProgress,
  collectJenisSuggestions,
  computeCategoryStats,
  filterAndSortCertificates,
  formatFileSize,
  formatIndonesianDate,
  formatTitleFromFilename,
  MAX_PDF_SIZE_BYTES,
  validateBackupPayload,
  validateCertificateForm,
  validatePdfFile,
} from './certificateLogic';
import type { CertificateRecord } from '../types/certificate';

function makeCert(
  overrides: Partial<CertificateRecord> = {}
): CertificateRecord {
  return {
    id: overrides.id ?? 'c-1',
    namaSertifikat: overrides.namaSertifikat ?? 'Seminar Nasional AI',
    deskripsi:
      overrides.deskripsi ??
      'Seminar nasional teknologi kecerdasan buatan oleh UPNVJ.',
    jenisSertifikat: overrides.jenisSertifikat ?? 'Seminar',
    tanggalDiperoleh: overrides.tanggalDiperoleh ?? '2026-03-10',
    isSyaratSkripsi: overrides.isSyaratSkripsi ?? false,
    fileName: overrides.fileName ?? 'seminar-ai.pdf',
    fileSize: overrides.fileSize ?? 102400,
    mimeType: 'application/pdf',
    pdfBlob: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    createdAt: overrides.createdAt ?? '2026-03-10T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-10T10:00:00.000Z',
  };
}

test('validatePdfFile enforces PDF extension, MIME, non-empty, and 10MB limit', () => {
  assert.equal(
    validatePdfFile({ name: 'sertif.pdf', type: 'application/pdf', size: 1024 })
      .valid,
    true
  );
  assert.equal(
    validatePdfFile({ name: 'sertif.pdf', type: '', size: 5000 }).valid,
    true
  );
  assert.equal(
    validatePdfFile({ name: 'foto.png', type: 'image/png', size: 5000 }).valid,
    false
  );
  assert.equal(
    validatePdfFile({ name: 'fake.pdf', type: 'image/jpeg', size: 5000 }).valid,
    false
  );
  assert.equal(
    validatePdfFile({
      name: 'huge.pdf',
      type: 'application/pdf',
      size: MAX_PDF_SIZE_BYTES + 1,
    }).valid,
    false
  );
  assert.equal(
    validatePdfFile({ name: 'empty.pdf', type: 'application/pdf', size: 0 })
      .valid,
    false
  );
});

test('formatTitleFromFilename formats file name cleanly', () => {
  assert.equal(
    formatTitleFromFilename('sertifikat_seminar-nasional_UPNVJ.pdf'),
    'Sertifikat Seminar Nasional UPNVJ'
  );
  assert.equal(formatTitleFromFilename('.pdf'), 'Sertifikat Mahasiswa');
});

test('validateCertificateForm catches missing and invalid fields', () => {
  const emptyErrors = validateCertificateForm(
    {
      namaSertifikat: '',
      deskripsi: '',
      jenisSertifikat: '',
      tanggalDiperoleh: '',
      isSyaratSkripsi: false,
    },
    { requirePdf: true, hasPdf: false }
  );
  assert.ok(emptyErrors.pdf);
  assert.ok(emptyErrors.namaSertifikat);
  assert.ok(emptyErrors.deskripsi);
  assert.ok(emptyErrors.jenisSertifikat);
  assert.ok(emptyErrors.tanggalDiperoleh);

  const validErrors = validateCertificateForm(
    {
      namaSertifikat: 'Pelatihan Cloud Computing',
      deskripsi: 'Pelatihan cloud computing tingkat lanjut oleh Dicoding.',
      jenisSertifikat: 'Pelatihan',
      tanggalDiperoleh: '2026-05-12',
      isSyaratSkripsi: true,
    },
    { requirePdf: true, hasPdf: true }
  );
  assert.deepEqual(validErrors, {});
});

test('calculateSkripsiProgress tracks X / 5 status accurately', () => {
  const underTarget = calculateSkripsiProgress([
    { isSyaratSkripsi: true },
    { isSyaratSkripsi: true },
    { isSyaratSkripsi: false },
  ]);
  assert.equal(underTarget.completedCount, 2);
  assert.equal(underTarget.remainingCount, 3);
  assert.equal(underTarget.percentage, 40);
  assert.equal(underTarget.isFulfilled, false);

  const fulfilled = calculateSkripsiProgress([
    { isSyaratSkripsi: true },
    { isSyaratSkripsi: true },
    { isSyaratSkripsi: true },
    { isSyaratSkripsi: true },
    { isSyaratSkripsi: true },
    { isSyaratSkripsi: true },
  ]);
  assert.equal(fulfilled.completedCount, 6);
  assert.equal(fulfilled.remainingCount, 0);
  assert.equal(fulfilled.percentage, 100);
  assert.equal(fulfilled.isFulfilled, true);
});

test('computeCategoryStats summarizes counts and percentages', () => {
  const stats = computeCategoryStats([
    { jenisSertifikat: 'Seminar' },
    { jenisSertifikat: 'Seminar' },
    { jenisSertifikat: 'Lomba' },
    { jenisSertifikat: 'Magang' },
  ]);
  assert.equal(stats.length, 3);
  assert.equal(stats[0].jenis, 'Seminar');
  assert.equal(stats[0].count, 2);
  assert.equal(stats[0].percentage, 50);
});

test('filterAndSortCertificates handles search, jenis, tahun, skripsi, and sort', () => {
  const list = [
    makeCert({
      id: '1',
      namaSertifikat: 'Bootcamp Web',
      jenisSertifikat: 'Pelatihan',
      tanggalDiperoleh: '2025-08-01',
      isSyaratSkripsi: true,
    }),
    makeCert({
      id: '2',
      namaSertifikat: 'Artikel Ilmiah',
      jenisSertifikat: 'Lomba',
      tanggalDiperoleh: '2026-02-15',
      isSyaratSkripsi: false,
    }),
    makeCert({
      id: '3',
      namaSertifikat: 'Cyber Security Seminar',
      jenisSertifikat: 'Seminar',
      tanggalDiperoleh: '2026-09-20',
      isSyaratSkripsi: true,
    }),
  ];

  const onlySkripsi = filterAndSortCertificates(list, {
    search: '',
    jenis: 'ALL',
    tahun: 'ALL',
    skripsi: 'skripsi',
    sort: 'date-desc',
  });
  assert.deepEqual(
    onlySkripsi.map((c) => c.id),
    ['3', '1']
  );

  const searchAndSortName = filterAndSortCertificates(list, {
    search: '2026',
    jenis: 'ALL',
    tahun: '2026',
    skripsi: 'ALL' as never,
    sort: 'name-asc',
  });
  // When search is '2026' (not in text), empty; test searching 'artikel'
  assert.equal(searchAndSortName.length, 0);

  const byNameAsc = filterAndSortCertificates(list, {
    search: '',
    jenis: 'ALL',
    tahun: '2026',
    skripsi: 'all',
    sort: 'name-asc',
  });
  assert.deepEqual(
    byNameAsc.map((c) => c.id),
    ['2', '3']
  );
});

test('collectJenisSuggestions merges custom user types before defaults without duplicates', () => {
  const suggestions = collectJenisSuggestions([
    { jenisSertifikat: 'Relawan Kampus' },
    { jenisSertifikat: 'Seminar' },
  ]);
  assert.equal(suggestions[0], 'Relawan Kampus');
  assert.equal(
    suggestions.filter((s) => s.toLowerCase() === 'seminar').length,
    1
  );
});

test('formatIndonesianDate and formatFileSize format cleanly', () => {
  assert.equal(formatIndonesianDate('2026-11-15'), '15 November 2026');
  assert.equal(formatFileSize(1536), '1.5 KB');
});

test('validateBackupPayload rejects foreign files and accepts valid backup', () => {
  assert.equal(validateBackupPayload({ foo: 'bar' }).valid, false);
  const valid = validateBackupPayload({
    app: 'SI-SERTIF-UPNVJ',
    version: 1,
    exportedAt: '2026-11-15T10:00:00Z',
    certificates: [
      {
        id: '1',
        namaSertifikat: 'Test',
        deskripsi: 'Deskripsi',
        jenisSertifikat: 'Seminar',
        tanggalDiperoleh: '2026-01-01',
        isSyaratSkripsi: true,
        fileName: 'a.pdf',
        fileSize: 100,
        mimeType: 'application/pdf',
        pdfBase64: 'JVBERi0=',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
  });
  assert.equal(valid.valid, true);
});
