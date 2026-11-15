import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  BackupFilePayload,
  CertificateRecord,
  SerializedCertificateBackup,
} from '../types/certificate';

interface SiSertifDB extends DBSchema {
  certificates: {
    key: string;
    value: CertificateRecord;
    indexes: {
      'by-date': string;
      'by-created': string;
    };
  };
}

const DB_NAME = 'si_sertif_upnvj_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SiSertifDB>> | null = null;

function getDb(): Promise<IDBPDatabase<SiSertifDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SiSertifDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('certificates')) {
          const store = db.createObjectStore('certificates', { keyPath: 'id' });
          store.createIndex('by-date', 'tanggalDiperoleh');
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllCertificates(): Promise<CertificateRecord[]> {
  const db = await getDb();
  const items = await db.getAll('certificates');
  return items.sort(
    (a, b) =>
      b.tanggalDiperoleh.localeCompare(a.tanggalDiperoleh) ||
      b.createdAt.localeCompare(a.createdAt)
  );
}

export async function saveCertificate(record: CertificateRecord): Promise<void> {
  const db = await getDb();
  await db.put('certificates', record);
}

export async function deleteCertificateById(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('certificates', id);
}

export async function clearAllCertificates(): Promise<void> {
  const db = await getDb();
  await db.clear('certificates');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Gagal membaca file PDF menjadi base64.'));
        return;
      }
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca Blob.'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function exportBackupPayload(): Promise<BackupFilePayload> {
  const certs = await getAllCertificates();
  const serialized: SerializedCertificateBackup[] = await Promise.all(
    certs.map(async (c) => ({
      id: c.id,
      namaSertifikat: c.namaSertifikat,
      deskripsi: c.deskripsi,
      jenisSertifikat: c.jenisSertifikat,
      tanggalDiperoleh: c.tanggalDiperoleh,
      isSyaratSkripsi: c.isSyaratSkripsi,
      fileName: c.fileName,
      fileSize: c.fileSize,
      mimeType: c.mimeType || 'application/pdf',
      pdfBase64: await blobToBase64(c.pdfBlob),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  );

  return {
    app: 'SI-SERTIF-UPNVJ',
    version: 1,
    exportedAt: new Date().toISOString(),
    certificates: serialized,
  };
}

export async function restoreBackupPayload(
  payload: BackupFilePayload,
  mode: 'merge' | 'replace'
): Promise<number> {
  const db = await getDb();
  const tx = db.transaction('certificates', 'readwrite');

  if (mode === 'replace') {
    await tx.store.clear();
  }

  let count = 0;
  for (const item of payload.certificates) {
    const pdfBlob = base64ToBlob(
      item.pdfBase64,
      item.mimeType || 'application/pdf'
    );
    const record: CertificateRecord = {
      id: item.id,
      namaSertifikat: item.namaSertifikat,
      deskripsi: item.deskripsi || '',
      jenisSertifikat: item.jenisSertifikat || 'Lainnya',
      tanggalDiperoleh:
        item.tanggalDiperoleh || new Date().toISOString().slice(0, 10),
      isSyaratSkripsi: Boolean(item.isSyaratSkripsi),
      fileName: item.fileName || 'sertifikat.pdf',
      fileSize: item.fileSize || pdfBlob.size,
      mimeType: item.mimeType || 'application/pdf',
      pdfBlob,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    };
    await tx.store.put(record);
    count++;
  }

  await tx.done;
  return count;
}
