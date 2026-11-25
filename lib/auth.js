import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isAllowedOrigin } from '../proxy/proxy.js';
import { SECRETS } from './secrets.js';

const FIREBASE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

// Return true kalau request sudah selesai ditangani (preflight atau origin ditolak)
export function applyCors(req, res) {
  const origin = req.headers.origin;

  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ error: 'link tidak resmi! Tidak dapat dibuka!' });
    return true;
  }

  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

// Return uid member kalau token valid, selain itu balas 401 dan return null
export async function requireMember(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    res.status(401).json({ error: 'Token login tidak ada' });
    return null;
  }

  try {
    const projectId = SECRETS.FIREBASE_PROJECT_ID;
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return payload.sub;
  } catch {
    res.status(401).json({ error: 'Token login tidak valid atau sudah kedaluwarsa' });
    return null;
  }
}
