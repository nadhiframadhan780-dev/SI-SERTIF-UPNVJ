import * as pdfjsLib from 'pdfjs-dist';
import { formatTitleFromFilename } from './certificateLogic';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface PdfExtractionResult {
  extractedText: string;
  imageBase64?: string;
  mimeType?: string;
  numPages: number;
}

export interface AiCertificateAnalysis {
  namaSertifikat: string;
  deskripsi: string;
  isFallback: boolean;
  message?: string;
}

export async function loadPdfDocument(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });
  return loadingTask.promise;
}

export async function extractPdfContentForAi(
  blob: Blob
): Promise<PdfExtractionResult> {
  const pdf = await loadPdfDocument(blob);
  const numPages = pdf.numPages;
  const maxPagesToRead = Math.min(numPages, 3);
  const textChunks: string[] = [];

  for (let pageNum = 1; pageNum <= maxPagesToRead; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) {
      textChunks.push(pageText);
    }
  }

  const extractedText = textChunks.join('\n').trim();

  // If PDF is scanned (very little or no selectable text), render first page as JPEG image
  if (extractedText.length < 25) {
    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await firstPage.render({
        canvasContext: ctx,
        canvas,
        viewport,
      }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const imageBase64 = dataUrl.split(',')[1] || '';
      return {
        extractedText,
        imageBase64,
        mimeType: 'image/jpeg',
        numPages,
      };
    }
  }

  return {
    extractedText,
    numPages,
  };
}

export async function analyzeCertificatePdf(
  blob: Blob,
  fileName: string,
  externalSignal?: AbortSignal
): Promise<AiCertificateAnalysis> {
  const fallbackTitle = formatTitleFromFilename(fileName);

  try {
    const extracted = await extractPdfContentForAi(blob);

    if (!extracted.extractedText && !extracted.imageBase64) {
      return {
        namaSertifikat: fallbackTitle,
        deskripsi: '',
        isFallback: true,
        message:
          'Isi dokumen tidak terbaca otomatis. Nama sertifikat diisi dari nama file.',
      };
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 65000);
    const onExternalAbort = () => controller.abort();
    externalSignal?.addEventListener('abort', onExternalAbort);

    let response: Response;
    try {
      response = await fetch('/api/extract-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          extractedText: extracted.extractedText,
          imageBase64: extracted.imageBase64,
          mimeType: extracted.mimeType,
          fileName,
        }),
      });
    } finally {
      window.clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return {
        namaSertifikat: fallbackTitle,
        deskripsi: '',
        isFallback: true,
        message:
          errData.error ||
          'Pengisian otomatis AI gagal. Nama sertifikat diisi dari nama file.',
      };
    }

    const data = (await response.json()) as {
      namaSertifikat?: string;
      deskripsi?: string;
    };

    const nama = (data.namaSertifikat || '').trim();
    const deskripsi = (data.deskripsi || '').trim();

    if (!nama) {
      return {
        namaSertifikat: fallbackTitle,
        deskripsi,
        isFallback: true,
        message:
          'AI tidak menemukan judul sertifikat. Nama sertifikat diisi dari nama file.',
      };
    }

    return {
      namaSertifikat: nama,
      deskripsi,
      isFallback: false,
    };
  } catch {
    return {
      namaSertifikat: fallbackTitle,
      deskripsi: '',
      isFallback: true,
      message:
        'Pengisian otomatis gagal (periksa koneksi). Nama sertifikat diisi dari nama file.',
    };
  }
}

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Creates a valid minimal PDF 1.4 document Blob in-memory for demo/sample certificates.
 */
export function createSamplePdfBlob(params: {
  title: string;
  organizer: string;
  recipient: string;
  dateLabel: string;
  category: string;
}): Blob {
  const lines = [
    'BT',
    '/F1 14 Tf',
    '72 740 Td',
    `(UNIVERSITAS PEMBANGUNAN NASIONAL "VETERAN" JAKARTA) Tj`,
    '0 -28 Td',
    '/F1 22 Tf',
    `(SERTIFIKAT PENGHARGAAN) Tj`,
    '0 -32 Td',
    '/F1 12 Tf',
    `(Diberikan kepada: ${escapePdfText(params.recipient)}) Tj`,
    '0 -26 Td',
    '/F1 14 Tf',
    `(${escapePdfText(params.title)}) Tj`,
    '0 -24 Td',
    '/F1 11 Tf',
    `(Kategori: ${escapePdfText(params.category)}) Tj`,
    '0 -20 Td',
    `(Penyelenggara: ${escapePdfText(params.organizer)}) Tj`,
    '0 -20 Td',
    `(Tanggal Diperoleh: ${escapePdfText(params.dateLabel)}) Tj`,
    'ET',
  ].join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${lines.length} >>\nstream\n${lines}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
