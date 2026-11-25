import { S3Client } from '@aws-sdk/client-s3';
import { SECRETS } from './secrets.js';

let cachedClient;

export function getClient() {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: SECRETS.B2_REGION,
      endpoint: SECRETS.B2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: SECRETS.B2_KEY_ID,
        secretAccessKey: SECRETS.B2_APPLICATION_KEY,
      },
      // B2 belum cocok dengan checksum otomatis SDK versi baru
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return cachedClient;
}

export function getBucket() {
  return SECRETS.B2_BUCKET;
}
