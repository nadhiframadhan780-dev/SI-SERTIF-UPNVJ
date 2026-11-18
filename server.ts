import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface ExtractRequestBody {
  extractedText?: string;
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.post('/api/extract-certificate', async (req, res) => {
    try {
      const body = (req.body || {}) as ExtractRequestBody;
      const extractedText = (body.extractedText || '').trim();
      const imageBase64 = (body.imageBase64 || '').trim();
      const mimeType = body.mimeType || 'image/jpeg';
      const fileName = (body.fileName || '').trim();

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'Layanan AI belum dikonfigurasi pada server.',
          code: 'AI_UNAVAILABLE',
        });
        return;
      }

      if (!extractedText && !imageBase64) {
        res.status(400).json({
          error: 'Data teks atau gambar sertifikat tidak ditemukan.',
          code: 'INVALID_INPUT',
        });
        return;
      }

      const instruction = [
        'Anda adalah asisten akademik UPN Veteran Jakarta yang mengekstrak informasi inti dari dokumen sertifikat mahasiswa.',
        'Tugas Anda: hasilkan JSON dengan dua field berbahasa Indonesia yang rapi, akurat, dan formal:',
        '1. "namaSertifikat": Nama resmi sertifikat, judul kegiatan, pelatihan, seminar, lomba, atau sertifikasi (singkat & jelas, maksimal 120 karakter, tanpa tanda kutip berlebih).',
        '2. "deskripsi": Deskripsi ringkas sebanyak 1 sampai 3 kalimat dalam bahasa Indonesia yang menjelaskan kegiatan apa ini, diselenggarakan oleh siapa, dan atas nama siapa apabila tercantum pada sertifikat.',
        'Jangan mengarang informasi yang tidak ada di dokumen. Jika sebagian detail tidak terlihat, tuliskan sebatas fakta yang terbaca.',
      ].join('\n');

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        });
      }

      const contextText = extractedText
        ? `Berikut teks yang diekstrak dari PDF sertifikat (nama file: "${fileName}"):\n\n${extractedText.slice(0, 12000)}`
        : `Dokumen ini merupakan sertifikat hasil pindai (gambar halaman pertama terlampir). Nama file asli: "${fileName}". Mohon baca teks di gambar sertifikat ini dengan cermat.`;

      parts.push({ text: contextText });

      const maxAttempts = 2;
      let response;
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: { parts },
            config: {
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
              systemInstruction: instruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  namaSertifikat: {
                    type: Type.STRING,
                    description: 'Nama resmi sertifikat atau kegiatan.',
                  },
                  deskripsi: {
                    type: Type.STRING,
                    description:
                      'Deskripsi singkat 1-3 kalimat mengenai kegiatan, penyelenggara, dan penerima sertifikat.',
                  },
                },
                required: ['namaSertifikat', 'deskripsi'],
              },
            },
          });
          break;
        } catch (err) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isTransient =
            msg.includes('429') ||
            msg.includes('503') ||
            msg.includes('UNAVAILABLE') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('ECONNRESET') ||
            msg.includes('ETIMEDOUT');
          if (attempt < maxAttempts && isTransient) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          throw err;
        }
      }

      if (!response) {
        throw lastError ?? new Error('No response from Gemini API');
      }

      const rawText = (response.text || '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      if (!rawText) {
        res.status(502).json({
          error: 'Respons AI kosong saat membaca sertifikat.',
          code: 'EMPTY_RESPONSE',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as {
        namaSertifikat?: string;
        deskripsi?: string;
      };

      res.json({
        namaSertifikat: (parsed.namaSertifikat || '').trim(),
        deskripsi: (parsed.deskripsi || '').trim(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Certificate extraction error:', error);

      if (
        message.includes('API_KEY_INVALID') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('API key not valid') ||
        message.includes('403')
      ) {
        res.status(401).json({
          error:
            'Kunci API Gemini tidak valid atau belum memiliki izin. Periksa GEMINI_API_KEY di Settings > Secrets atau file .env server.',
          code: 'API_KEY_INVALID',
        });
        return;
      }

      if (
        message.includes('RESOURCE_EXHAUSTED') ||
        message.includes('429')
      ) {
        res.status(429).json({
          error:
            'Kuota permintaan AI sementara penuh. Tunggu sebentar lalu coba unggah ulang, atau isi detail secara manual.',
          code: 'RATE_LIMITED',
        });
        return;
      }

      res.status(500).json({
        error: 'Gagal mengekstrak metadata sertifikat melalui AI.',
        code: 'EXTRACTION_FAILED',
      });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => {
        lastInsertedStyle = undefined;
      }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document
      .querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]')
      .forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
const noop = () => {};
export function createHotContext() {
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (search ? "&" + search.slice(1) : "") + (hash || "");
}
export class ErrorOverlay extends (typeof HTMLElement !== "undefined" ? HTMLElement : Object) {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SI-SERTIF UPNVJ server running on http://localhost:${PORT}`);
  });
}

startServer();
