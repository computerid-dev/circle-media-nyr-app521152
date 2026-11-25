import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getBucket, getClient } from '../lib/b2.js';
import { applyCors, requireMember } from '../lib/auth.js';

const MB = 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 600;

const FILE_RULES = {
  'image/jpeg': { ext: 'jpg', maxBytes: 10 * MB },
  'image/png': { ext: 'png', maxBytes: 10 * MB },
  'image/webp': { ext: 'webp', maxBytes: 10 * MB },
  'image/gif': { ext: 'gif', maxBytes: 10 * MB },
  'video/mp4': { ext: 'mp4', maxBytes: 50 * MB },
  'video/webm': { ext: 'webm', maxBytes: 50 * MB },
  'video/quicktime': { ext: 'mov', maxBytes: 50 * MB },
};

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }

  const uid = await requireMember(req, res);
  if (!uid) return;

  const { contentType, size } = req.body || {};
  const rule = FILE_RULES[contentType];

  if (!rule) {
    return res.status(400).json({ error: 'Tipe file tidak didukung' });
  }
  if (!Number.isInteger(size) || size <= 0 || size > rule.maxBytes) {
    const limitMb = rule.maxBytes / MB;
    return res.status(400).json({ error: `Ukuran file maksimal ${limitMb} MB` });
  }

  try {
    const key = `uploads/${uid}/${randomUUID()}.${rule.ext}`;
    const command = new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(getClient(), command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      signableHeaders: new Set(['content-type']),
    });

    return res.status(200).json({ key, uploadUrl, expiresIn: UPLOAD_URL_TTL_SECONDS });
  } catch (error) {
    console.error('upload-url gagal:', error);
    return res.status(500).json({ error: 'Gagal membuat link upload' });
  }
}
