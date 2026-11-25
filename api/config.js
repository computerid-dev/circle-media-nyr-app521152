import { SECRETS } from '../lib/secrets.js';

// Config web Firebase memang publik; keamanan sebenarnya ada di Firestore Rules.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    apiKey: SECRETS.FIREBASE_WEB_API_KEY,
    authDomain: SECRETS.FIREBASE_AUTH_DOMAIN,
    projectId: SECRETS.FIREBASE_PROJECT_ID,
    appId: SECRETS.FIREBASE_APP_ID,
  });
}
