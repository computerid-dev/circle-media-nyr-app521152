import { applyCors, requireMember } from '../lib/auth.js';
import { SECRETS } from '../lib/secrets.js';

// Server STUN publik; TURN opsional dari lib/secrets.js (untuk jaringan seluler yang ketat)
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }
  if (!(await requireMember(req, res))) return;

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const { TURN_URL, TURN_USERNAME, TURN_CREDENTIAL } = SECRETS;
  if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    iceServers.push({
      urls: TURN_URL.split(',').map((u) => u.trim()),
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ iceServers });
}
