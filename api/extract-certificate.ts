import type { IncomingMessage, ServerResponse } from 'http';
import {
  extractCertificateFromPayload,
  type ExtractRequestBody,
} from '../server/extractCertificate.ts';

interface VercelRequestLike extends IncomingMessage {
  body?: unknown;
}

interface VercelResponseLike extends ServerResponse {
  status?: (code: number) => VercelResponseLike;
  json?: (payload: unknown) => void;
}

async function readJsonBody(req: VercelRequestLike): Promise<ExtractRequestBody> {
  if (req.body && typeof req.body === 'object') {
    return req.body as ExtractRequestBody;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as ExtractRequestBody;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as ExtractRequestBody;
}

function sendJson(
  res: VercelResponseLike,
  statusCode: number,
  payload: unknown
) {
  if (typeof res.status === 'function') {
    const scopedRes = res.status(statusCode);
    if (typeof scopedRes?.json === 'function') {
      scopedRes.json(payload);
      return;
    }
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, {
      error: 'Metode tidak diizinkan. Gunakan POST.',
      code: 'METHOD_NOT_ALLOWED',
    });
    return;
  }

  let body: ExtractRequestBody;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, {
      error: 'Format JSON permintaan tidak valid.',
      code: 'INVALID_JSON',
    });
    return;
  }

  const result = await extractCertificateFromPayload(body);
  sendJson(res, result.status, result.body);
}
