import type {
  BackupFilePayload,
  CertificateRecord,
} from '../types/certificate';
import { validateBackupPayload } from './certificateLogic';

export const UPNVJDATS_EXTENSION = '.upnvjdats';
export const UPNVJDATS_MAGIC = new Uint8Array([
  0x55, 0x50, 0x4e, 0x56, 0x4a, 0x44, 0x54, 0x53,
]); // "UPNVJDTS"
const ARCHIVE_VERSION_V1 = 1;
const ARCHIVE_VERSION_V2 = 2;
const HEADER_SIZE_V1 = 18; // 8 magic + 1 version + 1 flag + 4 crc32 + 4 uncompressedLength
const HEADER_SIZE_V2 = 16; // 8 magic + 1 version + 1 flags + 2 reserved + 4 recordCount
const V2_RECORD_META_HEADER = 4; // uint32 metaLen
const V2_RECORD_PDF_HEADER = 12; // uint64 pdfLen + uint32 pdfCrc32
const FLAG_RAW = 0;
const FLAG_GZIP = 1;
const CRC_CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB streaming chunks

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function updateCrc32(crc: number, bytes: Uint8Array): number {
  let c = crc >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return c >>> 0;
}

export function computeCrc32(bytes: Uint8Array): number {
  return (updateCrc32(0xffffffff, bytes) ^ 0xffffffff) >>> 0;
}

export async function computeBlobCrc32(blob: Blob): Promise<number> {
  let crc = 0xffffffff;
  let offset = 0;
  while (offset < blob.size) {
    const end = Math.min(offset + CRC_CHUNK_BYTES, blob.size);
    const chunkBuf = await blob.slice(offset, end).arrayBuffer();
    crc = updateCrc32(crc, new Uint8Array(chunkBuf));
    offset = end;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hasMagicHeader(bytes: Uint8Array): boolean {
  if (bytes.length < UPNVJDATS_MAGIC.length) return false;
  for (let i = 0; i < UPNVJDATS_MAGIC.length; i++) {
    if (bytes[i] !== UPNVJDATS_MAGIC[i]) return false;
  }
  return true;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Legacy v1 encoder (kept for unit testing & small JSON-payload serialization)
 */
export async function encodeUpnvjdatsArchive(
  payload: BackupFilePayload,
  options?: { disableCompression?: boolean }
): Promise<Uint8Array> {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const crc32 = computeCrc32(jsonBytes);
  const uncompressedLength = jsonBytes.byteLength;

  let compressionFlag = FLAG_RAW;
  let bodyBytes: Uint8Array = jsonBytes;

  if (
    !options?.disableCompression &&
    typeof CompressionStream !== 'undefined'
  ) {
    try {
      const compressed = await gzipBytes(jsonBytes);
      if (compressed.byteLength > 0) {
        compressionFlag = FLAG_GZIP;
        bodyBytes = compressed;
      }
    } catch {
      compressionFlag = FLAG_RAW;
      bodyBytes = jsonBytes;
    }
  }

  const archive = new Uint8Array(HEADER_SIZE_V1 + bodyBytes.byteLength);
  archive.set(UPNVJDATS_MAGIC, 0);

  const view = new DataView(archive.buffer);
  view.setUint8(8, ARCHIVE_VERSION_V1);
  view.setUint8(9, compressionFlag);
  view.setUint32(10, crc32, false);
  view.setUint32(14, uncompressedLength, false);

  archive.set(bodyBytes, HEADER_SIZE_V1);
  return archive;
}

export async function createUpnvjdatsBlob(
  payload: BackupFilePayload
): Promise<Blob> {
  const bytes = await encodeUpnvjdatsArchive(payload);
  return new Blob([toArrayBuffer(bytes)], {
    type: 'application/octet-stream',
  });
}

/**
 * Streaming v2 binary container: stores metadata separately from raw PDF Blobs so
 * multi-hundred MB / 1 GB archives never hit V8's string limit or inflate by 33% base64.
 */
export async function createUpnvjdatsBlobFromRecords(
  records: CertificateRecord[]
): Promise<Blob> {
  const encoder = new TextEncoder();
  const header = new Uint8Array(HEADER_SIZE_V2);
  header.set(UPNVJDATS_MAGIC, 0);
  const headerView = new DataView(header.buffer);
  headerView.setUint8(8, ARCHIVE_VERSION_V2);
  headerView.setUint8(9, 0);
  headerView.setUint16(10, 0, false);
  headerView.setUint32(12, records.length, false);

  const parts: BlobPart[] = [toArrayBuffer(header)];

  for (const cert of records) {
    const metadata = {
      id: cert.id,
      namaSertifikat: cert.namaSertifikat,
      deskripsi: cert.deskripsi,
      jenisSertifikat: cert.jenisSertifikat,
      tanggalDiperoleh: cert.tanggalDiperoleh,
      isSyaratSkripsi: Boolean(cert.isSyaratSkripsi),
      fileName: cert.fileName || 'sertifikat.pdf',
      fileSize: cert.fileSize || cert.pdfBlob.size,
      mimeType: cert.mimeType || 'application/pdf',
      createdAt: cert.createdAt,
      updatedAt: cert.updatedAt,
    };
    const metaBytes = encoder.encode(JSON.stringify(metadata));
    const metaLenBuf = new Uint8Array(V2_RECORD_META_HEADER);
    new DataView(metaLenBuf.buffer).setUint32(0, metaBytes.byteLength, false);

    const pdfLen = cert.pdfBlob.size;
    const pdfCrc = await computeBlobCrc32(cert.pdfBlob);
    const pdfHeaderBuf = new Uint8Array(V2_RECORD_PDF_HEADER);
    const pdfHeaderView = new DataView(pdfHeaderBuf.buffer);
    pdfHeaderView.setBigUint64(0, BigInt(pdfLen), false);
    pdfHeaderView.setUint32(8, pdfCrc, false);

    parts.push(
      toArrayBuffer(metaLenBuf),
      toArrayBuffer(metaBytes),
      toArrayBuffer(pdfHeaderBuf),
      cert.pdfBlob
    );
  }

  return new Blob(parts, { type: 'application/octet-stream' });
}

export interface DecodeBackupResult {
  valid: boolean;
  payload?: BackupFilePayload;
  records?: CertificateRecord[];
  format?: 'upnvjdats-v2' | 'upnvjdats' | 'json-legacy';
  error?: string;
}

async function decodeV2ArchiveBlob(file: Blob): Promise<DecodeBackupResult> {
  if (file.size < HEADER_SIZE_V2) {
    return {
      valid: false,
      error: 'Header file .upnvjdats tidak lengkap atau rusak.',
    };
  }

  const headerBytes = new Uint8Array(
    await file.slice(0, HEADER_SIZE_V2).arrayBuffer()
  );
  const headerView = new DataView(
    headerBytes.buffer,
    headerBytes.byteOffset,
    headerBytes.byteLength
  );
  const recordCount = headerView.getUint32(12, false);
  let offset = HEADER_SIZE_V2;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const records: CertificateRecord[] = [];

  for (let i = 0; i < recordCount; i++) {
    if (offset + V2_RECORD_META_HEADER > file.size) {
      return {
        valid: false,
        error: 'File .upnvjdats terpotong saat membaca metadata sertifikat.',
      };
    }

    const metaLenBuf = await file
      .slice(offset, offset + V2_RECORD_META_HEADER)
      .arrayBuffer();
    const metaLen = new DataView(metaLenBuf).getUint32(0, false);
    offset += V2_RECORD_META_HEADER;

    if (metaLen <= 0 || metaLen > 1024 * 1024 || offset + metaLen > file.size) {
      return {
        valid: false,
        error: 'Metadata di dalam file .upnvjdats rusak atau tidak valid.',
      };
    }

    const metaBuf = await file.slice(offset, offset + metaLen).arrayBuffer();
    offset += metaLen;

    let meta: Partial<CertificateRecord>;
    try {
      meta = JSON.parse(
        decoder.decode(new Uint8Array(metaBuf))
      ) as Partial<CertificateRecord>;
    } catch {
      return {
        valid: false,
        error: 'Isi metadata sertifikat di file .upnvjdats tidak dapat dibaca.',
      };
    }

    if (
      typeof meta.id !== 'string' ||
      typeof meta.namaSertifikat !== 'string'
    ) {
      return {
        valid: false,
        error: 'Struktur sertifikat di dalam file .upnvjdats tidak lengkap.',
      };
    }

    if (offset + V2_RECORD_PDF_HEADER > file.size) {
      return {
        valid: false,
        error: 'File .upnvjdats terpotong sebelum data PDF.',
      };
    }

    const pdfHeaderBuf = await file
      .slice(offset, offset + V2_RECORD_PDF_HEADER)
      .arrayBuffer();
    const pdfHeaderView = new DataView(pdfHeaderBuf);
    const pdfLenBig = pdfHeaderView.getBigUint64(0, false);
    const expectedCrc = pdfHeaderView.getUint32(8, false);
    offset += V2_RECORD_PDF_HEADER;

    const pdfLen = Number(pdfLenBig);
    if (
      !Number.isSafeInteger(pdfLen) ||
      pdfLen < 0 ||
      offset + pdfLen > file.size
    ) {
      return {
        valid: false,
        error:
          'File .upnvjdats rusak atau terpotong saat transfer. Unduh ulang file backup dari perangkat asal.',
      };
    }

    const mimeType = meta.mimeType || 'application/pdf';
    const pdfBlob = file.slice(offset, offset + pdfLen, mimeType);
    offset += pdfLen;

    const actualCrc = await computeBlobCrc32(pdfBlob);
    if (actualCrc !== expectedCrc) {
      return {
        valid: false,
        error:
          'Pemeriksaan integritas file .upnvjdats gagal (data PDF rusak atau tidak utuh).',
      };
    }

    records.push({
      id: meta.id,
      namaSertifikat: meta.namaSertifikat,
      deskripsi: meta.deskripsi || '',
      jenisSertifikat: meta.jenisSertifikat || 'Lainnya',
      tanggalDiperoleh:
        meta.tanggalDiperoleh || new Date().toISOString().slice(0, 10),
      isSyaratSkripsi: Boolean(meta.isSyaratSkripsi),
      fileName: meta.fileName || 'sertifikat.pdf',
      fileSize: meta.fileSize || pdfBlob.size,
      mimeType,
      pdfBlob,
      createdAt: meta.createdAt || new Date().toISOString(),
      updatedAt: meta.updatedAt || new Date().toISOString(),
    });
  }

  return {
    valid: true,
    records,
    format: 'upnvjdats-v2',
  };
}

export async function decodeUpnvjdatsBytes(
  rawBytes: Uint8Array
): Promise<DecodeBackupResult> {
  if (rawBytes.byteLength === 0) {
    return {
      valid: false,
      error:
        'File backup kosong. Pastikan Anda memilih file .upnvjdats yang benar.',
    };
  }

  if (hasMagicHeader(rawBytes)) {
    if (rawBytes.byteLength < 10) {
      return {
        valid: false,
        error: 'Header file .upnvjdats tidak lengkap atau rusak.',
      };
    }

    const formatVersion = rawBytes[8];
    if (formatVersion === ARCHIVE_VERSION_V2) {
      return decodeV2ArchiveBlob(new Blob([toArrayBuffer(rawBytes)]));
    }

    if (formatVersion !== ARCHIVE_VERSION_V1) {
      return {
        valid: false,
        error: `Versi arsip .upnvjdats (v${formatVersion}) tidak didukung oleh aplikasi ini.`,
      };
    }

    if (rawBytes.byteLength < HEADER_SIZE_V1) {
      return {
        valid: false,
        error: 'Header file .upnvjdats tidak lengkap atau rusak.',
      };
    }

    const view = new DataView(
      rawBytes.buffer,
      rawBytes.byteOffset,
      rawBytes.byteLength
    );
    const compressionFlag = view.getUint8(9);
    const expectedCrc32 = view.getUint32(10, false);
    const expectedLength = view.getUint32(14, false);
    const bodyBytes = rawBytes.subarray(HEADER_SIZE_V1);

    let jsonBytes: Uint8Array;
    if (compressionFlag === FLAG_GZIP) {
      if (typeof DecompressionStream === 'undefined') {
        return {
          valid: false,
          error:
            'Browser pada perangkat ini belum mendukung dekompresi arsip modern. Gunakan browser versi terbaru.',
        };
      }
      try {
        jsonBytes = await gunzipBytes(bodyBytes);
      } catch {
        return {
          valid: false,
          error:
            'File .upnvjdats rusak atau terpotong saat transfer. Unduh ulang file backup dari perangkat asal.',
        };
      }
    } else if (compressionFlag === FLAG_RAW) {
      jsonBytes = bodyBytes;
    } else {
      return {
        valid: false,
        error: 'Metode kompresi file .upnvjdats tidak dikenali.',
      };
    }

    if (
      jsonBytes.byteLength !== expectedLength ||
      computeCrc32(jsonBytes) !== expectedCrc32
    ) {
      return {
        valid: false,
        error:
          'Pemeriksaan integritas file .upnvjdats gagal (file rusak atau tidak utuh).',
      };
    }

    let parsed: unknown;
    try {
      const jsonText = new TextDecoder('utf-8', { fatal: true }).decode(
        jsonBytes
      );
      parsed = JSON.parse(jsonText);
    } catch {
      return {
        valid: false,
        error: 'Isi data di dalam file .upnvjdats tidak dapat dibaca.',
      };
    }

    const validation = validateBackupPayload(parsed);
    if (!validation.valid || !validation.payload) {
      return {
        valid: false,
        error:
          validation.error ||
          'Struktur sertifikat di dalam file .upnvjdats tidak valid.',
      };
    }

    return {
      valid: true,
      payload: validation.payload,
      format: 'upnvjdats',
    };
  }

  // Backward-compatible fallback for older .json SI-SERTIF UPNVJ backups
  try {
    const text = new TextDecoder('utf-8', { fatal: true })
      .decode(rawBytes)
      .replace(/^\uFEFF/, '')
      .trim();

    if (!text.startsWith('{')) {
      return {
        valid: false,
        error:
          'Format file tidak dikenali. Pilih file backup .upnvjdats resmi dari SI-SERTIF UPNVJ.',
      };
    }

    const parsed = JSON.parse(text) as unknown;
    const validation = validateBackupPayload(parsed);
    if (!validation.valid || !validation.payload) {
      return {
        valid: false,
        error:
          validation.error ||
          'File ini bukan backup resmi SI-SERTIF UPNVJ (.upnvjdats).',
      };
    }

    return {
      valid: true,
      payload: validation.payload,
      format: 'json-legacy',
    };
  } catch {
    return {
      valid: false,
      error:
        'File tidak dapat dibaca. Pastikan Anda memilih file backup .upnvjdats resmi dari SI-SERTIF UPNVJ.',
    };
  }
}

export async function readBackupFile(file: Blob): Promise<DecodeBackupResult> {
  if (file.size === 0) {
    return {
      valid: false,
      error:
        'File backup kosong. Pastikan Anda memilih file .upnvjdats yang benar.',
    };
  }

  const head = new Uint8Array(
    await file.slice(0, Math.min(16, file.size)).arrayBuffer()
  );

  // Stream v2 directly using Blob slices so 1 GB backups use minimal RAM
  if (hasMagicHeader(head) && head.length >= 9 && head[8] === ARCHIVE_VERSION_V2) {
    return decodeV2ArchiveBlob(file);
  }

  const buffer = await file.arrayBuffer();
  return decodeUpnvjdatsBytes(new Uint8Array(buffer));
}
