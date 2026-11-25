import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getBucket, getClient } from '../lib/b2.js';
import { applyCors, requireMember } from '../lib/auth.js';

const DOWNLOAD_URL_TTL_SECONDS = 3600;
const MAX_KEYS_PER_REQUEST = 30;
const KEY_PATTERN = /^uploads\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }

  const uid = await requireMember(req, res);
  if (!uid) return;

  const { keys } = req.body || {};
  const validList =
    Array.isArray(keys) &&
    keys.length > 0 &&
    keys.length <= MAX_KEYS_PER_REQUEST &&
    keys.every((key) => typeof key === 'string' && KEY_PATTERN.test(key));

  if (!validList) {
    return res.status(400).json({
      error: `Kirim keys berupa array 1-${MAX_KEYS_PER_REQUEST} key file yang valid`,
    });
  }

  try {
    const entries = await Promise.all(
      keys.map(async (key) => {
        const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
        const url = await getSignedUrl(getClient(), command, {
          expiresIn: DOWNLOAD_URL_TTL_SECONDS,
        });
        return [key, url];
      })
    );

    return res.status(200).json({
      urls: Object.fromEntries(entries),
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
    });
  } catch (error) {
    console.error('download-url gagal:', error);
    return res.status(500).json({ error: 'Gagal membuat link lihat' });
  }
}
