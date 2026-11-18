import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface ExtractRequestBody {
  extractedText?: string;
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
}

export interface ExtractHandlerResult {
  status: number;
  body:
    | { namaSertifikat: string; deskripsi: string }
    | { error: string; code: string };
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

export async function extractCertificateFromPayload(
  rawBody: ExtractRequestBody | null | undefined
): Promise<ExtractHandlerResult> {
  try {
    const body = rawBody || {};
    const extractedText = (body.extractedText || '').trim();
    const imageBase64 = (body.imageBase64 || '').trim();
    const mimeType = body.mimeType || 'image/jpeg';
    const fileName = (body.fileName || '').trim();

    const ai = getGeminiClient();
    if (!ai) {
      return {
        status: 503,
        body: {
          error:
            'Layanan AI belum dikonfigurasi pada server. Pastikan GEMINI_API_KEY sudah diatur.',
          code: 'AI_UNAVAILABLE',
        },
      };
    }

    if (!extractedText && !imageBase64) {
      return {
        status: 400,
        body: {
          error: 'Data teks atau gambar sertifikat tidak ditemukan.',
          code: 'INVALID_INPUT',
        },
      };
    }

    const instruction = [
      'Anda adalah asisten akademik UPN Veteran Jakarta yang mengekstrak informasi inti dari dokumen sertifikat mahasiswa.',
      'Tugas Anda: hasilkan JSON dengan dua field berbahasa Indonesia yang rapi, akurat, dan formal:',
      '1. "namaSertifikat": Nama resmi sertifikat, judul kegiatan, pelatihan, seminar, lomba, atau sertifikasi (singkat & jelas, maksimal 120 karakter, tanpa tanda kutip berlebih).',
      '2. "deskripsi": Deskripsi ringkas sebanyak 1 sampai 3 kalimat dalam bahasa Indonesia yang menjelaskan kegiatan apa ini, diselenggarakan oleh siapa, dan atas nama siapa apabila tercantum pada sertifikat.',
      'Jangan mengarang informasi yang tidak ada di dokumen. Jika sebagian detail tidak terlihat, tuliskan sebatas fakta yang terbaca.',
    ].join('\n');

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
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
      ? `Teks PDF sertifikat (file: "${fileName}"):\n${extractedText.slice(0, 4500)}`
      : `Sertifikat hasil pindai (gambar halaman 1 terlampir, file: "${fileName}"). Baca teks di gambar dengan cermat.`;

    parts.push({ text: contextText });

    const callModel = async (
      model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen',
      thinkingLevel: ThinkingLevel
    ) =>
      ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          thinkingConfig: {
            thinkingLevel,
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

    const maxAttempts = 2;
    let response;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        try {
          response = await callModel(
            'gemini-3.1-flash-lite',
            ThinkingLevel.MINIMAL
          );
        } catch (primaryErr) {
          const primaryMsg =
            primaryErr instanceof Error
              ? primaryErr.message
              : String(primaryErr);
          if (
            primaryMsg.includes('NOT_FOUND') ||
            primaryMsg.includes('404')
          ) {
            response = await callModel('gemini-4-hydrogen', ThinkingLevel.LOW);
          } else {
            throw primaryErr;
          }
        }
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
      return {
        status: 502,
        body: {
          error: 'Respons AI kosong saat membaca sertifikat.',
          code: 'EMPTY_RESPONSE',
        },
      };
    }

    const parsed = JSON.parse(rawText) as {
      namaSertifikat?: string;
      deskripsi?: string;
    };

    return {
      status: 200,
      body: {
        namaSertifikat: (parsed.namaSertifikat || '').trim(),
        deskripsi: (parsed.deskripsi || '').trim(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Certificate extraction error:', error);

    if (
      message.includes('API_KEY_INVALID') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('API key not valid') ||
      message.includes('403')
    ) {
      return {
        status: 401,
        body: {
          error:
            'Kunci API Gemini tidak valid atau belum memiliki izin. Periksa GEMINI_API_KEY di Environment Variables / Secrets server.',
          code: 'API_KEY_INVALID',
        },
      };
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      return {
        status: 429,
        body: {
          error:
            'Kuota permintaan AI sementara penuh. Tunggu sebentar lalu coba unggah ulang, atau isi detail secara manual.',
          code: 'RATE_LIMITED',
        },
      };
    }

    return {
      status: 500,
      body: {
        error: 'Gagal mengekstrak metadata sertifikat melalui AI.',
        code: 'EXTRACTION_FAILED',
      },
    };
  }
}
