// Push notification untuk APK (Capacitor + FCM). Di browser biasa semua fungsi di sini tidak melakukan apa-apa.
import{api}from'/shared.js';

const cap=window.Capacitor,P=cap?.Plugins?.PushNotifications;
const native=()=>!!cap?.isNativePlatform?.()&&!!P;
const KEY='coa_push_token';
// Server lokal Capacitor membuka index.html root untuk path tanpa ekstensi, jadi buat eksplisit
const fixUrl=u=>u.replace(/^\/(chat|dm|channel)\/(\?|$)/,'/$1/index.html$2');
let started=false;

// Dipanggil sekali setelah login (lewat boot di shared.js): minta izin notifikasi, buat channel, daftarkan token ke server
export async function initPush(){
  if(started||!native())return;started=true;
  try{
    let perm=await P.checkPermissions();
    if(perm.receive==='prompt'||perm.receive==='prompt-with-rationale')perm=await P.requestPermissions();
    if(perm.receive!=='granted')return;
    await P.createChannel({id:'coa_messages',name:'Pesan dan mention',description:'Notifikasi mention, @semua, dan chat pribadi',importance:5,visibility:1,vibration:true,sound:'default'});
    P.addListener('registration',t=>{localStorage.setItem(KEY,t.value);api('/api/push',{kind:'register',token:t.value}).catch(()=>{})});
    P.addListener('registrationError',e=>console.error('push register gagal',e));
    // Ketuk notifikasi: buka halaman tujuan (hanya path internal)
    P.addListener('pushNotificationActionPerformed',a=>{const u=a.notification?.data?.url;if(typeof u==='string'&&u.startsWith('/')&&!u.startsWith('//'))location.href=fixUrl(u)});
    await P.register();
  }catch(e){console.error('initPush',e)}
}

// Panggil SEBELUM signOut supaya HP ini berhenti menerima notifikasi akun yang keluar
export async function dropPush(){
  const t=localStorage.getItem(KEY);if(!t)return;
  try{await api('/api/push',{kind:'unregister',token:t})}catch{}
  localStorage.removeItem(KEY);
}

// Minta server kirim push setelah pesan berhasil tersimpan (gagal diam-diam, jangan ganggu pengiriman pesan)
export const sendPush=b=>api('/api/push',b).catch(()=>{});
