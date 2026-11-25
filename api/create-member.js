import { adminAuth, adminDb } from '../lib/admin.js';
import { applyCors, requireMember } from '../lib/auth.js';
import { SECRETS } from '../lib/secrets.js';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const MEMBER_ROLES = ['admin', 'member'];

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }

  const { username, password, name, role, setupSecret } = req.body || {};
  let finalRole = role;

  // Akun owner pertama dibuat sekali lewat setupSecret, selanjutnya harus login sebagai owner
  const isBootstrap = Boolean(setupSecret) && setupSecret !== 'ISI_SENDIRI' && setupSecret === SECRETS.OWNER_SETUP_SECRET;

  if (isBootstrap) {
    finalRole = 'owner';
  } else {
    const callerUid = await requireMember(req, res);
    if (!callerUid) return;
    const caller = await adminDb.doc(`users/${callerUid}`).get();
    if (caller.data()?.role !== 'owner') {
      return res.status(403).json({ error: 'Hanya owner yang boleh membuat akun' });
    }
    if (!MEMBER_ROLES.includes(finalRole)) finalRole = 'member';
  }

  if (!USERNAME_PATTERN.test(username || '')) {
    return res.status(400).json({ error: 'Username 3-20 karakter: huruf kecil, angka, underscore' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter' });
  }

  try {
    const displayName = (name || username).toString().slice(0, 40);
    const user = await adminAuth.createUser({
      email: `${username}@circle.local`,
      password,
      displayName,
    });
    await adminDb.doc(`users/${user.uid}`).set({
      username,
      name: displayName,
      bio: '',
      role: finalRole,
      createdAt: Date.now(),
    });
    return res.status(200).json({ uid: user.uid, username, role: finalRole });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Username sudah dipakai' });
    }
    console.error('create-member gagal:', error);
    return res.status(500).json({ error: 'Gagal membuat akun' });
  }
}
