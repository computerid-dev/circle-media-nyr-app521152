import { SECRETS } from '../lib/secrets.js';

// Config web Firebase memang publik; keamanan sebenarnya ada di Firestore Rules.
// APK memanggil endpoint ini dari origin https://localhost, jadi origin resmi perlu diizinkan CORS.
export default function handler(req, res) {
  // Config web Firebase publik, jadi aman dibuka dari origin mana pun. Memakai '*' juga mencegah
  // respons yang di-cache CDN (tanpa header Origin) dipakai ulang tanpa header CORS oleh APK.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    apiKey: SECRETS.FIREBASE_WEB_API_KEY,
    authDomain: SECRETS.FIREBASE_AUTH_DOMAIN,
    projectId: SECRETS.FIREBASE_PROJECT_ID,
    appId: SECRETS.FIREBASE_APP_ID,
  });
}
