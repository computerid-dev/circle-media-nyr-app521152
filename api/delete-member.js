import { adminAuth, adminDb } from '../lib/admin.js';
import { applyCors, requireMember } from '../lib/auth.js';

// Hanya owner yang boleh menghapus akun. Owner tidak bisa dihapus, dan tidak bisa menghapus diri sendiri.
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }

  const callerUid = await requireMember(req, res);
  if (!callerUid) return;

  try {
    const caller = await adminDb.doc(`users/${callerUid}`).get();
    if (caller.data()?.role !== 'owner') {
      return res.status(403).json({ error: 'Hanya owner yang boleh menghapus akun' });
    }

    const { uid } = req.body || {};
    if (typeof uid !== 'string' || !uid) {
      return res.status(400).json({ error: 'UID akun tidak valid' });
    }
    if (uid === callerUid) {
      return res.status(400).json({ error: 'Akun sendiri tidak bisa dihapus' });
    }

    const target = await adminDb.doc(`users/${uid}`).get();
    if (target.data()?.role === 'owner') {
      return res.status(403).json({ error: 'Akun owner tidak bisa dihapus' });
    }

    try {
      await adminAuth.deleteUser(uid);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
    await adminDb.doc(`users/${uid}`).delete();
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('delete-member gagal:', error);
    return res.status(500).json({ error: 'Gagal menghapus akun' });
  }
}
