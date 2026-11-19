import type { BackupFilePayload } from '../types/certificate';
import { validateBackupPayload } from './certificateLogic';

export const UPNVJDATS_EXTENSION = '.upnvjdats';
export const UPNVJDATS_MAGIC = new Uint8Array([
  0x55, 0x50, 0x4e, 0x56, 0x4a, 0x44, 0x54, 0x53,
]); // "UPNVJDTS"
const ARCHIVE_FORMAT_VERSION = 1;
const HEADER_SIZE = 18; // 8 magic + 1 version + 1 flag + 4 crc32 + 4 uncompressedLength
const FLAG_RAW = 0;
const FLAG_GZIP = 1;

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

export function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
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

  const archive = new Uint8Array(HEADER_SIZE + bodyBytes.byteLength);
  archive.set(UPNVJDATS_MAGIC, 0);

  const view = new DataView(archive.buffer);
  view.setUint8(8, ARCHIVE_FORMAT_VERSION);
  view.setUint8(9, compressionFlag);
  view.setUint32(10, crc32, false);
  view.setUint32(14, uncompressedLength, false);

  archive.set(bodyBytes, HEADER_SIZE);
  return archive;
}

export async function createUpnvjdatsBlob(
  payload: BackupFilePayload
): Promise<Blob> {
  const bytes = await encodeUpnvjdatsArchive(payload);
  // application/octet-stream prevents mobile/desktop browsers from appending .json to .upnvjdats
  return new Blob([toArrayBuffer(bytes)], {
    type: 'application/octet-stream',
  });
}

export interface DecodeBackupResult {
  valid: boolean;
  payload?: BackupFilePayload;
  format?: 'upnvjdats' | 'json-legacy';
  error?: string;
}

export async function decodeUpnvjdatsBytes(
  rawBytes: Uint8Array
): Promise<DecodeBackupResult> {
  if (rawBytes.byteLength === 0) {
    return {
      valid: false,
      error: 'File backup kosong. Pastikan Anda memilih file .upnvjdats yang benar.',
    };
  }

  if (hasMagicHeader(rawBytes)) {
    if (rawBytes.byteLength < HEADER_SIZE) {
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
    const formatVersion = view.getUint8(8);
    if (formatVersion !== ARCHIVE_FORMAT_VERSION) {
      return {
        valid: false,
        error: `Versi arsip .upnvjdats (v${formatVersion}) tidak didukung oleh aplikasi ini.`,
      };
    }

    const compressionFlag = view.getUint8(9);
    const expectedCrc32 = view.getUint32(10, false);
    const expectedLength = view.getUint32(14, false);
    const bodyBytes = rawBytes.subarray(HEADER_SIZE);

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
  const buffer = await file.arrayBuffer();
  return decodeUpnvjdatsBytes(new Uint8Array(buffer));
}
