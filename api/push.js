import { createHash } from 'node:crypto';
import { getMessaging } from 'firebase-admin/messaging';
import { adminDb } from '../lib/admin.js';
import { applyCors, requireMember } from '../lib/auth.js';

// Satu endpoint untuk semua urusan push (FCM):
//   kind: 'register'   -> simpan token FCM perangkat milik user yang login
//   kind: 'unregister' -> hapus token (dipanggil sebelum logout)
//   kind: 'channel'    -> kirim push mention / @semua untuk pesan channel yang BARU dikirim
//   kind: 'dm'         -> kirim push "Pesan baru" untuk chat pribadi (isi pesan tidak pernah dikirim, karena E2E)
// Token disimpan di koleksi pushTokens (tidak ada rules untuk koleksi ini, jadi client tidak bisa baca/tulis langsung).

const MAX_TOKENS_PER_USER = 8;
const FRESH_MESSAGE_MS = 10 * 60 * 1000; // push hanya boleh menyusul pesan asli yang baru dikirim pengirimnya
const MAX_MENTIONS = 50;
const ID_PATTERN = /^[^/]{1,100}$/;
const ANDROID_CHANNEL = 'coa_messages';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const isStaff = (u) => !!u && ['owner', 'admin'].includes(u.role);
const isId = (v) => typeof v === 'string' && ID_PATTERN.test(v);
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function getUser(uid) {
  const s = await adminDb.doc(`users/${uid}`).get();
  return s.exists ? s.data() : null;
}

// Sama persis dengan fungsi isIn() di firestore.rules: owner/admin, pembuat komunitas, atau sudah disetujui
async function inCommunity(cid, comm, uid, user) {
  if (isStaff(user) || comm.createdBy === uid) return true;
  const p = await adminDb.doc(`communities/${cid}/people/${uid}`).get();
  return p.exists;
}

// ---------- token ----------
async function registerToken(uid, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new HttpError(400, 'Token push tidak valid');
  }
  // Doc id = hash token, jadi satu token hanya bisa milik satu akun (login akun lain di HP yang sama menimpa)
  await adminDb.doc(`pushTokens/${hashToken(token)}`).set({ uid, token, at: Date.now() });

  const mine = await adminDb.collection('pushTokens').where('uid', '==', uid).get();
  if (mine.size > MAX_TOKENS_PER_USER) {
    const old = mine.docs
      .sort((a, b) => (a.data().at || 0) - (b.data().at || 0))
      .slice(0, mine.size - MAX_TOKENS_PER_USER);
    await Promise.all(old.map((d) => d.ref.delete()));
  }
}

async function unregisterToken(uid, token) {
  if (typeof token !== 'string' || !token) return;
  const ref = adminDb.doc(`pushTokens/${hashToken(token)}`);
  const s = await ref.get();
  if (s.exists && s.data().uid === uid) await ref.delete();
}

// ---------- kirim ----------
async function sendToUsers(uids, { title, body, data, tag }) {
  const ids = [...new Set(uids)];
  if (!ids.length) return 0;

  const docs = [];
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await adminDb.collection('pushTokens').where('uid', 'in', ids.slice(i, i + 30)).get();
    docs.push(...snap.docs);
  }
  if (!docs.length) return 0;

  const messaging = getMessaging();
  let sent = 0;
  for (let i = 0; i < docs.length; i += 500) {
    const part = docs.slice(i, i + 500);
    const res = await messaging.sendEachForMulticast({
      tokens: part.map((d) => d.data().token),
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        ttl: 24 * 60 * 60 * 1000,
        notification: { channelId: ANDROID_CHANNEL, sound: 'default', tag },
      },
    });
    sent += res.successCount;

    // Buang token yang sudah mati (app di-uninstall, token kedaluwarsa)
    const dead = [];
    res.responses.forEach((r, idx) => {
      const code = r.error?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        dead.push(part[idx].ref.delete());
      }
    });
    await Promise.all(dead);
  }
  return sent;
}

// ---------- channel ----------
async function pushChannel(uid, b) {
  const { cid, chid } = b;
  if (!isId(cid) || !isId(chid)) throw new HttpError(400, 'Data channel tidak valid');

  const [me, commSnap, chSnap] = await Promise.all([
    getUser(uid),
    adminDb.doc(`communities/${cid}`).get(),
    adminDb.doc(`communities/${cid}/channels/${chid}`).get(),
  ]);
  if (!me || !commSnap.exists || !chSnap.exists) throw new HttpError(404, 'Channel tidak ditemukan');
  const comm = commSnap.data();
  if (!(await inCommunity(cid, comm, uid, me))) throw new HttpError(403, 'Kamu bukan anggota komunitas ini');

  // Pastikan memang ada pesan baru dari pengirim (anti-spam: tidak bisa kirim push tanpa pesan)
  const recent = await adminDb
    .collection(`communities/${cid}/channels/${chid}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(8)
    .get();
  const fresh = recent.docs.some((d) => {
    const m = d.data();
    return m.uid === uid && Date.now() - (m.createdAt || 0) < FRESH_MESSAGE_MS;
  });
  if (!fresh) throw new HttpError(400, 'Tidak ada pesan baru dari kamu di channel ini');

  const wantsAll = b.all === true;
  if (wantsAll && !isStaff(me)) throw new HttpError(403, '@semua hanya untuk owner dan admin');

  let targets = new Set();
  if (wantsAll) {
    const [people, staff] = await Promise.all([
      adminDb.collection(`communities/${cid}/people`).get(),
      adminDb.collection('users').where('role', 'in', ['owner', 'admin']).get(),
    ]);
    people.docs.forEach((d) => targets.add(d.id));
    staff.docs.forEach((d) => targets.add(d.id));
    if (comm.createdBy) targets.add(comm.createdBy);
  } else {
    const list = Array.isArray(b.mentions) ? b.mentions.filter(isId).slice(0, MAX_MENTIONS) : [];
    const checked = await Promise.all(
      [...new Set(list)].map(async (id) => {
        const u = await getUser(id);
        return u && (await inCommunity(cid, comm, id, u)) ? id : null;
      })
    );
    checked.forEach((id) => id && targets.add(id));
  }
  targets.delete(uid);
  if (!targets.size) return 0;

  const chName = clip(chSnap.data().name, 40) || 'channel';
  const who = clip(me.name, 40) || 'Seseorang';
  const text = clip(b.text, 100);
  return sendToUsers([...targets], {
    title: wantsAll ? `${who} menyebut semua di #${chName}` : `${who} menyebut kamu di #${chName}`,
    body: text || 'Pesan baru',
    tag: `ch_${chid}`,
    data: {
      type: wantsAll ? 'all' : 'mention',
      url: `/chat/?${new URLSearchParams({ c: cid, ch: chid })}`,
    },
  });
}

// ---------- chat pribadi ----------
async function pushDm(uid, b) {
  const { pid } = b;
  if (!isId(pid)) throw new HttpError(400, 'Data chat tidak valid');

  const dmSnap = await adminDb.doc(`dms/${pid}`).get();
  const members = dmSnap.exists ? dmSnap.data().members : null;
  if (!Array.isArray(members) || !members.includes(uid)) throw new HttpError(403, 'Bukan chat milikmu');
  const peer = members.find((m) => m !== uid);
  if (!peer) return 0;

  const recent = await adminDb
    .collection(`dms/${pid}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(3)
    .get();
  const fresh = recent.docs.some((d) => {
    const m = d.data();
    return m.from === uid && Date.now() - (m.createdAt || 0) < FRESH_MESSAGE_MS;
  });
  if (!fresh) throw new HttpError(400, 'Tidak ada pesan baru dari kamu');

  const me = await getUser(uid);
  const params = new URLSearchParams({ u: uid });
  if (isId(b.cid)) params.set('c', b.cid);
  return sendToUsers([peer], {
    title: clip(me?.name, 40) || 'Pesan pribadi',
    body: 'Pesan pribadi baru',
    tag: `dm_${pid}`,
    data: { type: 'dm', url: `/dm/?${params}` },
  });
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Gunakan metode POST' });
  }

  const uid = await requireMember(req, res);
  if (!uid) return;

  const b = req.body || {};
  try {
    if (b.kind === 'register') {
      await registerToken(uid, b.token);
      return res.status(200).json({ ok: true });
    }
    if (b.kind === 'unregister') {
      await unregisterToken(uid, b.token);
      return res.status(200).json({ ok: true });
    }
    if (b.kind === 'channel') {
      return res.status(200).json({ sent: await pushChannel(uid, b) });
    }
    if (b.kind === 'dm') {
      return res.status(200).json({ sent: await pushDm(uid, b) });
    }
    return res.status(400).json({ error: 'kind tidak dikenal' });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    console.error('push gagal:', error);
    return res.status(500).json({ error: 'Gagal mengirim push' });
  }
}
