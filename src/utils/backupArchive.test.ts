import assert from 'node:assert/strict';
import test from 'node:test';
import type { BackupFilePayload } from '../types/certificate';
import {
  computeCrc32,
  createUpnvjdatsBlob,
  decodeUpnvjdatsBytes,
  encodeUpnvjdatsArchive,
  readBackupFile,
  UPNVJDATS_MAGIC,
} from './backupArchive.ts';

const SAMPLE_PAYLOAD: BackupFilePayload = {
  app: 'SI-SERTIF-UPNVJ',
  version: 1,
  exportedAt: '2026-11-19T14:00:00.000Z',
  certificates: [
    {
      id: 'cert-upnvj-1',
      namaSertifikat: 'Seminar Nasional Akuntansi UPNVJ',
      deskripsi: 'Diselenggarakan oleh FEB UPN Veteran Jakarta.',
      jenisSertifikat: 'Seminar',
      tanggalDiperoleh: '2026-10-12',
      isSyaratSkripsi: true,
      fileName: 'seminar-akuntansi.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      pdfBase64: 'JVBERi0xLjQK',
      createdAt: '2026-10-12T08:00:00.000Z',
      updatedAt: '2026-10-12T08:00:00.000Z',
    },
  ],
};

test('encodeUpnvjdatsArchive creates UPNVJDTS binary header and round-trips with compression', async () => {
  const archive = await encodeUpnvjdatsArchive(SAMPLE_PAYLOAD);
  assert.deepEqual(
    Array.from(archive.subarray(0, 8)),
    Array.from(UPNVJDATS_MAGIC)
  );

  const decoded = await decodeUpnvjdatsBytes(archive);
  assert.equal(decoded.valid, true);
  assert.equal(decoded.format, 'upnvjdats');
  assert.deepEqual(decoded.payload, SAMPLE_PAYLOAD);
});

test('encodeUpnvjdatsArchive round-trips without CompressionStream (raw fallback)', async () => {
  const archive = await encodeUpnvjdatsArchive(SAMPLE_PAYLOAD, {
    disableCompression: true,
  });
  assert.equal(archive[9], 0);

  const decoded = await decodeUpnvjdatsBytes(archive);
  assert.equal(decoded.valid, true);
  assert.equal(decoded.format, 'upnvjdats');
  assert.deepEqual(decoded.payload, SAMPLE_PAYLOAD);
});

test('createUpnvjdatsBlob and readBackupFile work via Blob with octet-stream MIME', async () => {
  const blob = await createUpnvjdatsBlob(SAMPLE_PAYLOAD);
  assert.equal(blob.type, 'application/octet-stream');

  const decoded = await readBackupFile(blob);
  assert.equal(decoded.valid, true);
  assert.deepEqual(decoded.payload, SAMPLE_PAYLOAD);
});

test('decodeUpnvjdatsBytes detects corrupted or truncated .upnvjdats files via CRC32/length', async () => {
  const archive = await encodeUpnvjdatsArchive(SAMPLE_PAYLOAD);
  const tampered = new Uint8Array(archive);
  tampered[tampered.length - 1] ^= 0xff;

  const tamperedResult = await decodeUpnvjdatsBytes(tampered);
  assert.equal(tamperedResult.valid, false);
  assert.match(tamperedResult.error || '', /rusak|gagal/i);

  const truncated = archive.subarray(0, 12);
  const truncatedResult = await decodeUpnvjdatsBytes(truncated);
  assert.equal(truncatedResult.valid, false);
});

test('decodeUpnvjdatsBytes accepts legacy SI-SERTIF JSON backups and rejects foreign files', async () => {
  const legacyBytes = new TextEncoder().encode(JSON.stringify(SAMPLE_PAYLOAD));
  const legacyDecoded = await decodeUpnvjdatsBytes(legacyBytes);
  assert.equal(legacyDecoded.valid, true);
  assert.equal(legacyDecoded.format, 'json-legacy');

  const randomPdf = new TextEncoder().encode('%PDF-1.4 random file');
  const rejected = await decodeUpnvjdatsBytes(randomPdf);
  assert.equal(rejected.valid, false);

  assert.equal(computeCrc32(new Uint8Array([1, 2, 3])) > 0, true);
});
