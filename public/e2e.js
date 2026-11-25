// Chat pribadi end-to-end terenkripsi.
// - Tiap user punya sepasang kunci ECDH P-256. Kunci publik disimpan di users/{uid}.pub, kunci privat TIDAK pernah dikirim mentah.
// - Cadangan kunci privat disimpan di vaults/{uid} dalam keadaan terenkripsi (AES-GCM) dengan kunci turunan dari kata sandi enkripsi
//   yang dibuat user sendiri (PBKDF2). Server dan owner tidak tahu kata sandi ini.
// - Tiap pesan dienkripsi AES-GCM 256 dengan kunci bersama hasil ECDH(kunci privat saya, kunci publik lawan bicara).
import{S,db,doc,getDoc,setDoc,updateDoc,ask}from'/shared.js';

const enc8=new TextEncoder(),dec8=new TextDecoder();
const b64=u=>{let s='';new Uint8Array(u).forEach(x=>s+=String.fromCharCode(x));return btoa(s)};
const unb64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const ALG={name:'ECDH',namedCurve:'P-256'};

// Penyimpanan kunci di perangkat (IndexedDB), kunci privat disimpan sebagai CryptoKey yang tidak bisa diekspor
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('coa-e2e',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const idbGet=async k=>{const d=await idb();return new Promise((ok,no)=>{const r=d.transaction('keys').objectStore('keys').get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})};
const idbSet=async(k,v)=>{const d=await idb();return new Promise((ok,no)=>{const t=d.transaction('keys','readwrite');t.objectStore('keys').put(v,k);t.oncomplete=()=>ok();t.onerror=()=>no(t.error)})};

const wrapKey=async(pass,salt,usage)=>{const base=await crypto.subtle.importKey('raw',enc8.encode(pass),'PBKDF2',false,['deriveKey']);
return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,usage)};
const pubStr=jwk=>JSON.stringify({kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y});

let session=null;// {priv,pub}
export const keyReady=()=>!!session;

// Cek apakah kunci di perangkat ini sudah ada dan cocok dengan kunci publik di akun
export async function tryLocal(){if(session)return true;
try{const rec=await idbGet(S.me.uid),me=S.users.get(S.me.uid)||S.me;if(rec&&rec.pub&&rec.pub===me.pub){session={priv:rec.priv,pub:rec.pub};return true}}catch{}
return false}

async function createKeys(){
const v=await ask('Aktifkan chat terenkripsi',[['p1','Buat kata sandi enkripsi (min. 6 karakter)','password'],['p2','Ulangi kata sandi enkripsi','password']]);
if(!v)return false;if(v.p1.length<6){alert('Kata sandi enkripsi minimal 6 karakter');return false}if(v.p1!==v.p2){alert('Kedua kata sandi tidak sama');return false}
const pair=await crypto.subtle.generateKey(ALG,true,['deriveKey','deriveBits']);
const pkcs8=await crypto.subtle.exportKey('pkcs8',pair.privateKey),pub=pubStr(await crypto.subtle.exportKey('jwk',pair.publicKey));
const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
const wrapped=await crypto.subtle.encrypt({name:'AES-GCM',iv},await wrapKey(v.p1,salt,['encrypt']),pkcs8);
await setDoc(doc(db,'vaults',S.me.uid),{salt:b64(salt),iv:b64(iv),wrapped:b64(wrapped),at:Date.now()});
await updateDoc(doc(db,'users',S.me.uid),{pub});
const priv=await crypto.subtle.importKey('pkcs8',pkcs8,ALG,false,['deriveKey','deriveBits']);
await idbSet(S.me.uid,{priv,pub});session={priv,pub};return true}

async function openVault(vault){
const v=await ask('Buka chat terenkripsi',[['p','Kata sandi enkripsi kamu','password']]);if(!v)return false;
try{const pkcs8=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(vault.iv)},await wrapKey(v.p,unb64(vault.salt),['decrypt']),unb64(vault.wrapped));
const priv=await crypto.subtle.importKey('pkcs8',pkcs8,ALG,false,['deriveKey','deriveBits']),pub=(S.users.get(S.me.uid)||S.me).pub;
await idbSet(S.me.uid,{priv,pub});session={priv,pub};return true}
catch{if(confirm('Kata sandi enkripsi salah.\n\nLupa kata sandinya? Kamu bisa membuat kunci baru, tapi pesan lama tidak akan bisa dibuka lagi.\n\nBuat kunci baru sekarang?'))return createKeys();return false}}

// Pastikan kunci siap (minta kata sandi enkripsi kalau perlu). Mengembalikan true kalau siap dipakai.
export async function unlock(){if(await tryLocal())return true;
const s=await getDoc(doc(db,'vaults',S.me.uid));
return s.exists()?openVault(s.data()):createKeys()}

const shared=new Map();
export async function peerKey(peerPub){if(!session)throw Error('Kunci belum dibuka');let k=shared.get(peerPub);if(k)return k;
const pk=await crypto.subtle.importKey('jwk',JSON.parse(peerPub),ALG,false,[]);
k=await crypto.subtle.deriveKey({name:'ECDH',public:pk},session.priv,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);shared.set(peerPub,k);return k}
export async function enc(key,text){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc8.encode(text));return{iv:b64(iv),ct:b64(ct)}}
export async function dec(key,iv,ct){return dec8.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},key,unb64(ct)))}

export async function encBytes(key,buf){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,buf);return{iv:b64(iv),data:new Uint8Array(ct)}}
export const decBytes=(key,iv,buf)=>crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},key,buf);

// Kode keamanan: harus sama di kedua perangkat, kalau beda berarti ada yang menyela kunci
export async function fingerprint(pubA,pubB){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',enc8.encode([pubA,pubB].sort().join('|'))));
const hex=[...h.slice(0,10)].map(x=>x.toString(16).padStart(2,'0')).join('');return hex.match(/.{1,4}/g).join(' ')}
export const pairId=(a,b)=>[a,b].sort().join('_');
