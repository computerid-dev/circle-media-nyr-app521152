import{initializeApp}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import{getFirestore,collection,doc,getDoc,setDoc,addDoc,deleteDoc,updateDoc,onSnapshot,query,orderBy,limit,where,arrayUnion,arrayRemove}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
export{collection,doc,getDoc,setDoc,addDoc,deleteDoc,updateDoc,onSnapshot,query,orderBy,limit,where,arrayUnion,arrayRemove,signInWithEmailAndPassword,onAuthStateChanged,signOut};
export const $=s=>document.querySelector(s);
export const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
// Di APK halaman dimuat dari dalam aplikasi (https://localhost), jadi panggilan /api/* diarahkan ke server Vercel
const NATIVE=!!(window.Capacitor&&((window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())||window.Capacitor.platform==='android'));
// Origin bawaan WebView (WebViewAssetLoader) juga dianggap APK, supaya /api/* tetap ke server Vercel
const IN_APP=NATIVE||location.hostname==='appassets.androidplatform.net';
export const API_BASE=IN_APP?'https://circle-media-nyr-app.vercel.app':'';
export let auth=null,db=null,cfgError='';
try{const r=await fetch(API_BASE+'/api/config'),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'HTTP '+r.status);auth=getAuth(initializeApp(d));db=getFirestore(auth.app)}catch(e){cfgError=e.message}
export const api=async(p,b)=>{const t=await auth.currentUser.getIdToken(),r=await fetch(API_BASE+p,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify(b||{})}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Permintaan gagal');return d};
export const urls=new Map();
export async function load(keys,names){const m=[...new Set(keys.filter(k=>k&&!urls.has(k)))];for(let i=0;i<m.length;i+=30){const part=m.slice(i,i+30),nm={};if(names)part.forEach(k=>{if(names[k])nm[k]=names[k]});try{const{urls:u}=await api('/api/download-url',{keys:part,names:nm});for(const k in u)urls.set(k,u[k])}catch(e){console.error(e)}}}
export async function upload(f,type){const ct=type||f.type||'application/octet-stream';const{key,uploadUrl}=await api('/api/upload-url',{contentType:ct,size:f.size});let r;try{r=await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':ct},body:f})}catch{throw Error('Upload gagal: koneksi terputus atau CORS bucket belum diatur')}if(!r.ok)throw Error('Upload gagal ('+r.status+'), cek CORS dan izin bucket');return key}
// Perkecil foto jadi persegi JPEG; foto kamera HP sering HEIC atau lebih dari 10 MB sehingga ditolak backend
export async function squareImage(f,size=512){const ok=['image/jpeg','image/png','image/webp','image/gif'];let bmp;try{bmp=await createImageBitmap(f)}catch{if(ok.includes(f.type)&&f.size<=10*1024*1024)return f;throw Error('Gambar tidak bisa dibaca, pakai format JPG atau PNG')}
const side=Math.min(bmp.width,bmp.height),cv=document.createElement('canvas');cv.width=cv.height=Math.min(size,side);cv.getContext('2d').drawImage(bmp,(bmp.width-side)/2,(bmp.height-side)/2,side,side,0,0,cv.width,cv.height);bmp.close?.();
const blob=await new Promise(res=>cv.toBlob(res,'image/jpeg',.88));if(!blob)throw Error('Gagal memproses gambar');return new File([blob],'avatar.jpg',{type:'image/jpeg'})}
// Gambar dan audio disimpan sebagai base64 langsung di Firestore (batas dokumen 1 MiB)
const readUrl=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(Error('File tidak bisa dibaca'));r.readAsDataURL(f)});
async function shrink(f,{max,square,tries,limit}){let bmp;try{bmp=await createImageBitmap(f)}catch{throw Error('Gambar tidak bisa dibaca, pakai JPG atau PNG')}
for(const[m,q]of tries){const side=Math.min(bmp.width,bmp.height),sw=square?side:bmp.width,sh=square?side:bmp.height,k=Math.min(1,m/Math.max(sw,sh)),cv=document.createElement('canvas');cv.width=Math.round(sw*k);cv.height=Math.round(sh*k);
cv.getContext('2d').drawImage(bmp,square?(bmp.width-side)/2:0,square?(bmp.height-side)/2:0,sw,sh,0,0,cv.width,cv.height);const url=cv.toDataURL('image/jpeg',q);if(url.length<=limit){bmp.close?.();return url}}
bmp.close?.();throw Error('Gambar terlalu besar untuk disimpan, pakai gambar lain')}
export const avatarData=f=>shrink(f,{square:true,limit:60000,tries:[[256,.8],[192,.7],[128,.6]]});
export const imageData=f=>shrink(f,{limit:700000,tries:[[1280,.8],[960,.7],[720,.6],[480,.5]]});
export async function audioData(f){const MAX=500*1024;if(!/\.mp3$/i.test(f.name)&&f.type!=='audio/mpeg')throw Error('Audio harus berformat MP3');if(f.size>MAX)throw Error('MP3 maksimal 500 KB (sekitar 30 detik). Kecilkan dulu bitrate/durasinya');return readUrl(f)}
const lum=c=>{const n=parseInt(c.slice(1),16);return((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000};
export const tag=(t,c='#7058ff')=>{const s=el('span','tag',t);s.style.background=c;s.style.color=lum(c)<140?'#fff':'#000';return s};
const P=p=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC={bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',chat:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',hash:'<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',dots:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
plus:'<path d="M12 5v14M5 12h14"/>',send:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
mega:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',chev:'<path d="m6 9 6 6 6-6"/>',vol:'<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',next:'<path d="m9 6 6 6-6 6"/>',play:'<path d="M7 4v16l13-8z" fill="currentColor"/>',pause:'<path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/>',file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',dl:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',image:'<rect x="3" y="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-5-5L5 21"/>'};
export const icon=(n,s=22)=>{const e=el('span','ic');e.innerHTML=P(IC[n]);const v=e.firstChild;v.setAttribute('width',s);v.setAttribute('height',s);return e};
export const isVerified=u=>!!u&&(u.role==='owner'||u.verified===true);
// Lencana: gambar ada di /badges/<id>.png. Hanya owner/admin yang bisa memberikannya ke member.
// Owner/admin sendiri boleh memakai lencana apa saja, tapi bawaannya tanpa lencana.
const BASE_BADGES=[{id:'executive',name:'Executive'},{id:'under-og',name:'Under OG'},{id:'bisnis-rp',name:'Bisnis RP'},{id:'pemimpin',name:'Pemimpin'},{id:'pettingi',name:'Pettingi'},{id:'agen',name:'Agen'}];
export const BADGES=[...BASE_BADGES];
export const badgeOf=id=>BADGES.find(b=>b.id===id);
export const isStaffRole=u=>!!u&&['owner','admin'].includes(u.role);
export const canWear=(u,id)=>!!badgeOf(id)&&(isStaffRole(u)||(u.badges||[]).includes(id));
export const badgeImg=(id,px=24)=>{const b=badgeOf(id),i=el('img','bdg');i.src=b?.img||'/badges/'+id+'.png';i.alt=b?.name||'Lencana';i.title=b?.name||'';i.height=px;i.loading='lazy';return i};
export function nameEl(u={}){const s=el('span','nm');s.append(el('span','',u.name||'?'));if(isVerified(u)){const v=el('span','vf');v.title='Terverifikasi';v.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="11" fill="#3b82f6"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';s.append(v)}if(u.badge&&canWear(u,u.badge))s.append(badgeImg(u.badge,24));return s}
export const online=u=>!!u&&Date.now()-(u.lastSeen||0)<150000;
export function av(u={},px=40){const w=el('div','avw'),a=el('div','av',(u.name||'?')[0].toUpperCase());a.style.width=a.style.height=px+'px';a.style.fontSize=Math.round(px*.42)+'px';
if(u.avatar){a.style.backgroundImage=`url("${u.avatar}")`;a.textContent=''}else if(u.avatarKey)load([u.avatarKey]).then(()=>{const s=urls.get(u.avatarKey);if(s){a.style.backgroundImage=`url("${s}")`;a.textContent=''}});
w.append(a);if(online(u))w.append(el('i','dot'));return w}
export const fld=(l,v='',t='text')=>{const lb=el('label','',l),i=el('input');i.type=t;i.value=v;lb.append(i);return[lb,i]};
export function ask(title,fields){return new Promise(ok=>{let d=$('#dlg');if(!d){d=el('dialog');d.id='dlg';d.append(el('form'));document.body.append(d)}const f=d.firstChild;f.replaceChildren(el('h3','',title));
fields.forEach(([n,l,t='text',v='',o=[]])=>{const lb=el('label','',l);let i;if(t==='select'){i=el('select');o.forEach(([a,b])=>{const op=el('option','',b);op.value=a;i.append(op)})}else{i=el('input');i.type=t;if(t==='checkbox')i.style.width='auto'}
i.name=n;if(t==='checkbox')i.checked=!!v;else i.value=v;lb.append(i);f.append(lb)});
const row=el('div','row'),c=el('button','w','Batal'),s=el('button','','Simpan');c.type='button';c.onclick=()=>{d.close();ok(null)};row.append(c,s);f.append(row);
d.oncancel=()=>ok(null);f.onsubmit=e=>{e.preventDefault();ok(Object.fromEntries(new FormData(f)));d.close()};d.showModal()})}


// Lembar bawah (bottom sheet): ditutup lewat tombol Tutup, ketuk area gelap, atau Esc
export function sheet(title,build){document.getElementById('sh')?.remove();const o=el('div','scrim'),s=el('div','sheet'),h=el('div','shh'),x=el('button','w mini','Tutup'),body=el('div','shb');o.id='sh';
x.onclick=()=>o.remove();h.append(el('b','',title),x);s.append(h,body);o.append(s);o.onclick=e=>{if(e.target===o)o.remove()};document.body.append(o);build(body,()=>o.remove());return o}
addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('sh')?.remove()});

export const S={bg:null,me:null,users:new Map(),comms:[],chans:[],roles:[],mems:new Map(),people:new Set(),access:new Map(),pending:new Map(),watchedAcc:new Set(),started:new Set(),opts:{},cid:null,chid:null,onChange:null};
const STAFF=['owner','admin'],stops={};
export const canManage=()=>!!S.cid&&(STAFF.includes(S.me.role)||S.comms.find(c=>c.id===S.cid)?.createdBy===S.me.uid||!!S.mems.get(S.me.uid)?.mod);
// Komunitas: owner/admin dan pembuatnya otomatis masuk, member lain harus disetujui dulu (true/false, undefined = belum diketahui)
export function isApproved(cid){if(!cid||!S.me)return false;if(STAFF.includes(S.me.role)||S.comms.find(c=>c.id===cid)?.createdBy===S.me.uid)return true;return S.access.has(cid)?S.access.get(cid):undefined}
export const inCommunity=uid=>isStaffRole(S.users.get(uid))||S.comms.find(c=>c.id===S.cid)?.createdBy===uid||S.people.has(uid);
export const requestJoin=cid=>setDoc(doc(db,`communities/${cid}/requests/${S.me.uid}`),{name:S.me.name,at:Date.now()});
export const cancelJoin=cid=>deleteDoc(doc(db,`communities/${cid}/requests/${S.me.uid}`));
const ago=t=>{const m=Math.max(1,Math.round((Date.now()-t)/60000));return m<60?m+' menit lalu':m<1440?Math.round(m/60)+' jam lalu':Math.round(m/1440)+' hari lalu'};
// Lihat profil orang lain (ketuk avatar atau nama)
export function viewProfile(uid){const u=S.users.get(uid);if(!u)return;
sheet('Profil',b=>{const top=el('div','pf'),t=el('div','grow'),n=nameEl(u);n.classList.add('big');t.append(n,el('div','muted','@'+(u.username||'-')+' - '+u.role));top.append(av(u,84),t);b.append(top);
if(u.bio)b.append(el('p','pbio',u.bio));
const mem=S.mems.get(uid);if(mem){const r=el('div','chips');r.append(tag(mem.roleName,mem.color));b.append(r)}
b.append(el('small','muted',online(u)?'Sedang online':(u.lastSeen?'Terakhir online '+ago(u.lastSeen):'Belum pernah online')));
if(uid!==S.me.uid){const act=el('div','row2');const dm=el('button','','Kirim pesan');dm.onclick=()=>go('/dm/index.html',{c:S.cid,u:uid});act.append(dm);
if(isStaffRole(S.me)&&!isStaffRole(u)){const bb=el('button','w','Kelola lencana');bb.onclick=()=>badgeSheet(uid);act.append(bb)}b.append(act)}
if(!isStaffRole(u)&&(u.badges||[]).length){b.append(el('small','sec','Lencana'));const g=el('div','bgrid');(u.badges||[]).filter(badgeOf).forEach(id=>{const c=el('div','bchoice'+(u.badge===id?' on':''));c.append(badgeImg(id,56),el('span','',badgeOf(id).name));g.append(c)});b.append(g)}
else if(isStaffRole(u)&&u.badge&&canWear(u,u.badge)){b.append(el('small','sec','Lencana dipakai'));const g=el('div','bgrid'),c=el('div','bchoice on');c.append(badgeImg(u.badge,56),el('span','',badgeOf(u.badge).name));g.append(c);b.append(g)}})}
// Lencana: owner/admin memberi atau mencabut lencana member
export function badgeSheet(uid){const u=S.users.get(uid);if(!u)return;
sheet('Lencana '+(u.name||''),b=>{
if(isStaffRole(u)){b.append(el('p','muted','Admin dan owner memilih lencananya sendiri di Pengaturan, menu Lencana saya.'));return}
b.append(el('p','muted','Ketuk untuk memberi atau mencabut. Member hanya bisa memakai lencana yang diberikan.'));
const grid=el('div','bgrid'),have=()=>S.users.get(uid)?.badges||[];
const draw=()=>{grid.replaceChildren();BADGES.forEach(x=>{const on=have().includes(x.id),t=el('button','bchoice'+(on?' on':''));t.append(badgeImg(x.id,56),el('span','',x.name),el('small','',on?'Diberikan':'Belum'));
t.onclick=async()=>{const next=on?have().filter(i=>i!==x.id):[...have(),x.id];try{await updateDoc(doc(db,'users',uid),{badges:next});const cur=S.users.get(uid);if(cur)cur.badges=next;draw()}catch(e){alert(e.message)}};grid.append(t)})};
draw();b.append(grid)})}
// Lencana saya: pakai atau lepas lencana sendiri (owner/admin boleh semua, member hanya yang diberikan)
export function myBadgeSheet(){sheet('Lencana saya',(b,close)=>{
const owned=isStaffRole(S.me)?BADGES.map(x=>x.id):(S.me.badges||[]).filter(badgeOf);
const set=async id=>{try{await updateDoc(doc(db,'users',S.me.uid),{badge:id});close()}catch(e){alert(e.message)}};
if(!owned.length){b.append(el('p','muted','Belum punya lencana. Lencana hanya bisa diberikan oleh owner atau admin.'));return}
b.append(el('p','muted',isStaffRole(S.me)?'Pilih lencana yang mau dipakai di belakang namamu, atau lepas kalau tidak mau pakai.':'Pilih lencana yang mau dipakai di belakang namamu.'));
const grid=el('div','bgrid'),none=el('button','bchoice'+(!S.me.badge?' on':''));none.append(el('span','','Lepas lencana'),el('small','',!S.me.badge?'Sedang tanpa lencana':''));none.onclick=()=>set(null);grid.append(none);
owned.forEach(id=>{const t=el('button','bchoice'+(S.me.badge===id?' on':''));t.append(badgeImg(id,56),el('span','',badgeOf(id).name),el('small','',S.me.badge===id?'Dipakai':''));t.onclick=()=>set(id);grid.append(t)});b.append(grid)})}
// Lencana buatan: owner/admin upload PNG, tersimpan di koleksi badges dan langsung tersedia untuk semua
export async function pngData(file){if(file.type!=='image/png')throw Error('Lencana harus berupa file PNG');
const url=URL.createObjectURL(file);try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(Error('Gambar tidak bisa dibaca'));i.src=url});
for(const px of [128,96,64]){const k=Math.min(1,px/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(img.width*k));cv.height=Math.max(1,Math.round(img.height*k));
cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);const d=cv.toDataURL('image/png');if(d.length<60000)return d}
throw Error('Gambar terlalu rumit, pakai PNG yang lebih sederhana')}finally{URL.revokeObjectURL(url)}}
export function addBadgeSheet(){if(!isStaffRole(S.me))return;
sheet('Lencana baru',(b,close)=>{let data=null;
const prev=el('img','bdg');prev.style.cssText='height:96px;margin:0 auto;display:none';prev.alt='';
const file=el('input');file.type='file';file.accept='image/png';file.hidden=true;
const pick=el('button','','Pilih gambar PNG'),nm=el('input'),fl=el('div','field'),ok=el('button','w','Simpan lencana');nm.placeholder='Nama lencana';nm.maxLength=30;fl.append(nm);
pick.onclick=()=>file.click();
file.onchange=async()=>{const x=file.files[0];file.value='';if(!x)return;try{data=await pngData(x);prev.src=data;prev.style.display='block'}catch(e){alert(e.message)}};
ok.onclick=async()=>{const name=nm.value.trim();if(!data||!name)return alert('Pilih gambar PNG dan isi nama lencana');ok.disabled=true;
try{await addDoc(collection(db,'badges'),{name,img:data,by:S.me.uid,at:Date.now()});close()}catch(e){alert(e.message);ok.disabled=false}};
b.append(el('p','muted','Upload PNG (yang transparan paling bagus). Gambar otomatis dikecilkan. Setelah disimpan, lencana langsung muncul dan bisa diberikan ke member.'),prev,pick,fl,ok,file)})}
// Owner/admin: daftar semua member untuk mengatur lencana
export function manageBadgesSheet(){sheet('Kelola lencana member',(b,close)=>{
const add=el('button','','+ Lencana baru (PNG)');add.onclick=()=>{close();addBadgeSheet()};b.append(add);
const customs=BADGES.filter(x=>x.custom);
if(customs.length){b.append(el('small','sec','Lencana buatan'));customs.forEach(x=>{const r=el('div','li static'),d=el('button','r mini','Hapus');
d.onclick=()=>{if(confirm('Hapus lencana '+x.name+'? Lencana ini hilang dari semua member.'))deleteDoc(doc(db,'badges',x.id)).then(close).catch(e=>alert(e.message))};r.append(badgeImg(x.id,36),el('b','grow',x.name),d);b.append(r)})}
const list=[...S.users].filter(([,u])=>!isStaffRole(u));
if(!list.length){b.append(el('p','empty','Belum ada member.'));return}
b.append(el('p','muted','Pilih member, lalu beri atau cabut lencananya.'));
list.forEach(([uid,u])=>{const r=el('button','li'),i=el('div','grow');i.append(nameEl(u),el('small','muted','@'+(u.username||'-')+' - '+((u.badges||[]).filter(badgeOf).length)+' lencana'));r.append(av(u,40),i,icon('next',18));r.onclick=()=>badgeSheet(uid);b.append(r)})})}
export const go=(path,p={})=>{const q=new URLSearchParams(Object.entries(p).filter(([,v])=>v));{const qs=q.toString();location.href=path+(qs?'?'+qs:'')}};
// Pemilih di layar Chat: chat komunitas atau pesan pribadi terenkripsi
export function chatSeg(active){const w=el('div','seg');[['c','Komunitas'],['p','Pribadi']].forEach(([k,l])=>{const b=el('button',k===active?'on':'',l);b.onclick=()=>{if(k===active)return;k==='c'?go('/chat/index.html',{c:S.cid,ch:textTarget()}):go('/dm/index.html',{c:S.cid})};w.append(b)});return w}
export const setTitle=(t,s='')=>{$('#title').textContent=t;$('#sub').textContent=s};
const isText=x=>(x?.type||'text')==='text';
// Channel teks tujuan tombol Chat: yang sedang dibuka, atau terakhir dibuka, atau yang pertama
export function textTarget(){const cur=S.chans.find(x=>x.id===S.chid);if(isText(cur)&&cur)return cur.id;if(!S.chans.length)return S.chid;
let id=null;try{id=localStorage.getItem('lt:'+S.cid)}catch{}if(S.chans.some(x=>x.id===id&&isText(x)))return id;return S.chans.find(isText)?.id||null}
export const rememberText=id=>{try{localStorage.setItem('lt:'+S.cid,id)}catch{}};
// Background aplikasi: satu pengaturan bersama (settings/app), owner dan admin yang boleh mengganti, semua anggota melihat
export const canBg=()=>['owner','admin'].includes(S.me?.role);
const BG={ungu:null,samudra:'linear-gradient(160deg,#0a2540,#0c0a1f 70%)',hutan:'linear-gradient(160deg,#0b2e22,#0c0a1f 70%)',anggur:'linear-gradient(160deg,#3a0f2a,#0c0a1f 70%)',senja:'linear-gradient(160deg,#3b1f0a,#1a0c2e 75%)',slate:'linear-gradient(160deg,#1f2937,#0b0f19)',hitam:'#050509'};
const BGN={ungu:'Ungu (bawaan)',samudra:'Samudra',hutan:'Hutan',anggur:'Anggur',senja:'Senja',slate:'Slate',hitam:'Hitam'};
export function applyBg(){const d=$('#bg');if(!d)return;const b=S.bg;let v='',img=false;
if(b?.kind==='preset'&&BG[b.value])v=BG[b.value];
else if(b?.kind==='color'&&/^#[0-9a-f]{6}$/i.test(b.value))v=b.value;
else if(b?.kind==='image'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.value)){v=`url("${b.value}") center/cover no-repeat`;img=true}
d.style.background=v;d.classList.toggle('img',img)}
export const bgData=f=>shrink(f,{limit:600000,tries:[[1280,.75],[960,.65],[720,.55],[540,.5]]});
export function bgSheet(){sheet('Background aplikasi',(b,close)=>{
const save=async bg=>{try{await setDoc(doc(db,'settings','app'),{bg,by:S.me.uid,at:Date.now()});close()}catch(e){msg.textContent=e.message}},msg=el('p','err');
b.append(el('p','muted','Berlaku untuk semua anggota. Owner dan admin bisa mengganti kapan saja.'));
if(S.bg?.by)b.append(el('small','muted','Terakhir diubah oleh '+(S.users.get(S.bg.by)?.name||'admin')));
b.append(el('small','sec','Pilihan warna'));const g=el('div','chips');
Object.keys(BG).forEach(k=>{const c=el('button','chip'+((S.bg?.kind==='preset'?S.bg.value:(S.bg?null:'ungu'))===k?' on':''),BGN[k]);if(BG[k])c.style.background=BG[k];c.onclick=()=>save({kind:'preset',value:k});g.append(c)});b.append(g);
b.append(el('small','sec','Warna sendiri'));const cr=el('div','row2'),ci=el('input');ci.type='color';ci.value=S.bg?.kind==='color'?S.bg.value:'#1a1440';ci.style.cssText='width:64px;padding:4px;height:46px';
const cb=el('button','w','Pakai warna ini');cb.onclick=()=>save({kind:'color',value:ci.value});cr.append(ci,cb);b.append(cr);
b.append(el('small','sec','Gambar'));const fi=el('input');fi.type='file';fi.accept='image/*';const ub=el('button','','Pakai gambar ini');
ub.onclick=async()=>{const f=fi.files[0];if(!f){msg.textContent='Pilih gambar dulu';return}ub.disabled=true;msg.textContent='Memproses...';
try{const url=await bgData(f);await save({kind:'image',value:url})}catch(e){msg.textContent=e.message}ub.disabled=false};b.append(fi,ub);
const rs=el('button','w','Kembalikan ke bawaan');rs.onclick=()=>save({kind:'preset',value:'ungu'});b.append(rs,msg)})}
export const hhmm=t=>new Date(t).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
export const RX={like:'👍',heart:'❤️',laugh:'😂',party:'🎉',pray:'🙏',fire:'🔥'};
const changed=()=>S.onChange&&S.onChange();
// Profil komunitas: nama dan foto, hanya owner dan admin
export function communitySheet(){const c=S.comms.find(x=>x.id===S.cid);if(!c||!isStaffRole(S.me))return;
sheet('Profil komunitas',(b,close)=>{
const img=el('img','clogo');img.style.cssText='width:96px;height:96px;margin:0 auto;display:block';img.src=c.avatar||'/logo.png';img.alt='';
const nm=el('h3','',c.name);nm.style.textAlign='center';
const file=el('input');file.type='file';file.accept='image/*';file.hidden=true;
const pick=el('button','','Ganti foto komunitas'),ren=el('button','w','Ganti nama komunitas'),del=el('button','w','Hapus foto (pakai logo COA)');
const save=async d=>{try{await updateDoc(doc(db,'communities',c.id),d);close()}catch(e){alert(e.message)}};
pick.onclick=()=>file.click();
file.onchange=async()=>{const f=file.files[0];if(!f)return;if(!f.type.startsWith('image/'))return alert('Foto harus berupa gambar');pick.disabled=true;pick.textContent='Memproses...';
try{await save({avatar:await avatarData(f)})}catch(e){alert(e.message);pick.disabled=false;pick.textContent='Ganti foto komunitas'}};
ren.onclick=async()=>{const v=await ask('Ganti nama komunitas',[['name','Nama komunitas','text',c.name]]);const n=v?.name.trim();if(n&&n!==c.name)save({name:n.slice(0,40)})};
del.onclick=()=>save({avatar:null});
b.append(img,nm,pick,ren,file);if(c.avatar)b.append(del)})}
export const canCreateCommunity=()=>isStaffRole(S.me);
export async function newCommunity(){if(!canCreateCommunity()){alert('Hanya owner dan admin yang boleh membuat komunitas');return}const v=await ask('Komunitas baru',[['name','Nama komunitas']]);if(v?.name.trim()){const r=await addDoc(collection(db,'communities'),{name:v.name.trim().slice(0,40),createdBy:S.me.uid,createdAt:Date.now()});go('/chat/index.html',{c:r.id})}}
export async function newChannel(){const v=await ask('Channel baru',[['name','Nama channel'],['type','Jenis','select','text',[['text','Teks'],['voice','Suara']]]]);if(v?.name.trim())await addDoc(collection(db,`communities/${S.cid}/channels`),{name:v.name.trim().slice(0,30),type:v.type,createdAt:Date.now()})}
function watchCommunity(id){S.cid=id;
stops.chans=onSnapshot(collection(db,`communities/${id}/channels`),s=>{S.chans=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.name.localeCompare(b.name));changed()});
stops.roles=onSnapshot(collection(db,`communities/${id}/roles`),s=>{S.roles=s.docs.map(d=>({id:d.id,...d.data()}));changed()});
stops.mems=onSnapshot(collection(db,`communities/${id}/members`),s=>{S.mems=new Map(s.docs.map(d=>[d.id,d.data()]));changed()});
stops.people=onSnapshot(collection(db,`communities/${id}/people`),s=>{S.people=new Set(s.docs.map(d=>d.id));changed()})}

const TABS=[['chat','/chat/index.html','Chat','chat'],['channel','/channel/index.html','Channel','hash'],['members','/members/index.html','Anggota','users'],['settings','/settings/index.html','Pengaturan','cog']];
// Dipanggil tiap halaman: cek login, bangun kerangka (header, tab bawah), kembalikan area isi
export function boot(opts={}){return new Promise(resolve=>{
if(!auth){document.body.textContent='Backend belum siap: '+cfgError;return}
let started=false;
onAuthStateChanged(auth,async user=>{if(started)return;
if(!user){location.replace('/');return}started=true;
const s=await getDoc(doc(db,'users',user.uid));if(!s.exists()){await signOut(auth);location.replace('/');return}
S.opts=opts;S.me={uid:user.uid,...s.data()};const q=new URLSearchParams(location.search);S.cid=q.get('c');S.chid=q.get('ch');
document.body.innerHTML='<div id="app"><div id="bg"></div><header id="top"><button class="cbtn" id="cbtn" aria-label="Ganti komunitas"><img src="/logo.png" alt="Claude of Anarchy"></button><div class="ttl"><strong id="title"></strong><small id="sub"></small></div><div id="acts"></div></header><main id="content"></main><nav id="tabs"></nav></div>';
$('#tabs').append(...TABS.map(([k,p,l,i])=>{const b=el('button','tab'+(opts.tab===k?' on':''));b.append(icon(i,24),el('span','',l));b.onclick=()=>go(p,{c:S.cid,ch:k==='chat'?textTarget():null});return b}));
$('#cbtn').onclick=()=>sheet('Komunitas',(b,close)=>{S.comms.forEach(c=>{const r=el('button','li'+(c.id===S.cid?' on':'')),a=el('img','clogo');a.src=c.avatar||'/logo.png';a.alt='';r.append(a,el('b','grow',c.name));if(isApproved(c.id)===false)r.append(el('small','muted','Belum bergabung'));r.onclick=()=>go('/chat/index.html',{c:c.id});b.append(r)});
if(isStaffRole(S.me)){const n=el('button','','+ Komunitas baru');n.onclick=()=>{close();newCommunity()};b.append(n)}});
const drawC=()=>{$('#cbtn').title=S.comms.find(c=>c.id===S.cid)?.name||'Claude of Anarchy'};
function watchAccess(id){if(S.watchedAcc.has(id))return;S.watchedAcc.add(id);
onSnapshot(doc(db,`communities/${id}/people/${S.me.uid}`),d=>{S.access.set(id,d.exists());sync()},()=>{S.access.set(id,false);sync()});
onSnapshot(doc(db,`communities/${id}/requests/${S.me.uid}`),d=>{S.pending.set(id,d.exists());sync()},()=>{})}
function drawGate(){let g=$('#gate');const a=S.cid&&S.opts.needCommunity?isApproved(S.cid):true,c=S.comms.find(x=>x.id===S.cid);
if(a!==false||!c){g?.remove();return}
if(!g){g=el('div','gate');g.id='gate';$('#content').append(g)}
g.replaceChildren();const box=el('div','panel');
box.append(el('h3','',c.name),el('p','muted','Kamu belum menjadi anggota komunitas ini. Minta bergabung, lalu tunggu persetujuan admin atau owner.'));
if(S.pending.get(c.id)){const w=el('button','','Menunggu persetujuan');w.disabled=true;const x=el('button','w','Batalkan permintaan');x.onclick=()=>cancelJoin(c.id).catch(e=>alert(e.message));box.append(w,x)}
else{const r=el('button','','Minta bergabung');r.onclick=async()=>{r.disabled=true;try{await requestJoin(c.id)}catch(e){alert(e.message);r.disabled=false}};box.append(r)}
const o=el('button','w','Lihat komunitas lain');o.onclick=()=>go('/channel/index.html');box.append(o);g.append(box)}
// Mulai memantau komunitas hanya kalau sudah disetujui; kalau belum, tampilkan layar minta bergabung
function sync(){if(S.cid&&!S.started.has(S.cid)&&isApproved(S.cid)===true){S.started.add(S.cid);watchCommunity(S.cid)}
if(!S.cid&&S.opts.needCommunity){const f=S.comms.find(c=>isApproved(c.id)===true);if(f){history.replaceState(null,'','?c='+f.id);S.cid=f.id;S.started.add(f.id);watchCommunity(f.id)}}
drawGate();drawC();changed()}
// Penanda online: perbarui lastSeen tiap menit
const beat=()=>updateDoc(doc(db,'users',user.uid),{lastSeen:Date.now()}).catch(()=>{});beat();setInterval(beat,60000);import('/push.js').then(m=>m.initPush()).catch(()=>{});
onSnapshot(collection(db,'badges'),q=>{BADGES.length=0;BADGES.push(...BASE_BADGES,...q.docs.map(d=>({id:d.id,custom:true,...d.data()})).sort((a,b)=>(a.at||0)-(b.at||0)));changed()},()=>{});
// Notifikasi mention: hanya di website (bel di header + popup), tidak ada push ke luar
{let first=true;const baseTitle=document.title,bell=el('button','ib'),dot=el('span','ndot');bell.setAttribute('aria-label','Notifikasi');bell.append(icon('bell',24),dot);$('#acts').prepend(bell);S.notifs=[];
const viewing=n=>location.pathname.startsWith('/chat')&&S.cid===n.cid&&S.chid===n.chid&&document.visibilityState==='visible';
const openN=d=>{updateDoc(d.ref,{read:true}).catch(()=>{});const n=d.data();go('/chat/index.html',{c:n.cid,ch:n.chid})};
const head=n=>n.type==='all'?(n.fromName||'Seseorang')+' menyebut semua orang':(n.fromName||'Seseorang')+' menyebut kamu';
const toast=d=>{const n=d.data(),t=el('button','toast');t.append(el('b','',head(n)),el('small','','#'+(n.chName||'channel')+' - '+(n.text||'')));
t.onclick=()=>{t.remove();openN(d)};document.body.append(t);setTimeout(()=>t.classList.add('show'),20);setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300)},7000)};
bell.onclick=()=>sheet('Notifikasi',(b,close)=>{if(!S.notifs.length){b.append(el('p','empty','Belum ada notifikasi baru.'));return}
const all=el('button','w','Tandai semua dibaca');all.onclick=()=>{S.notifs.forEach(d=>updateDoc(d.ref,{read:true}).catch(()=>{}));close()};b.append(all);
S.notifs.forEach(d=>{const n=d.data(),r=el('button','li'),i=el('div','grow');i.append(el('b','',head(n)),el('small','muted','#'+(n.chName||'channel')+' - '+(n.text||'')));r.append(icon('bell',20),i);r.onclick=()=>{close();openN(d)};b.append(r)})});
onSnapshot(query(collection(db,`users/${user.uid}/notifs`),where('read','==',false),limit(50)),q=>{
const all=q.docs.sort((x,y)=>(y.data().createdAt||0)-(x.data().createdAt||0));all.filter(d=>viewing(d.data())).forEach(d=>updateDoc(d.ref,{read:true}).catch(()=>{}));
S.notifs=all.filter(d=>!viewing(d.data()));const n=S.notifs.length;dot.textContent=n>9?'9+':String(n);dot.style.display=n?'':'none';document.title=(n?'('+n+') ':'')+baseTitle;
if(!first)q.docChanges().forEach(c=>{if(c.type==='added'&&!viewing(c.doc.data()))toast(c.doc)});first=false},()=>{})}
onSnapshot(doc(db,'settings','app'),d=>{S.bg=d.exists()?d.data().bg||null:null;applyBg();changed()},()=>{});
onSnapshot(collection(db,'users'),q=>{S.users=new Map(q.docs.map(d=>[d.id,d.data()]));if(S.users.has(S.me.uid))S.me={uid:S.me.uid,...S.users.get(S.me.uid)};changed()});
onSnapshot(collection(db,'communities'),q=>{S.comms=q.docs.map(d=>({id:d.id,...d.data()}));S.comms.forEach(c=>watchAccess(c.id));sync()});
resolve($('#content'))})})}
