import{boot,S,$,el,icon,sheet,nameEl,av,hhmm,go,setTitle,chatSeg,viewProfile,db,collection,doc,setDoc,addDoc,deleteDoc,onSnapshot,query,orderBy,limit,where,load,urls,upload,imageData}from'/shared.js';
import{sendPush}from'/push.js';
import{unlock,tryLocal,keyReady,peerKey,enc,dec,encBytes,decBytes,fingerprint,pairId}from'/e2e.js';
const c=await boot({tab:'chat'});
const peer=new URLSearchParams(location.search).get('u');
const back=()=>go('/dm/',{c:S.cid});
const ago=t=>{const d=new Date(t),n=new Date();return d.toDateString()===n.toDateString()?hhmm(t):d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})};
let stop=null;

/* ===== Daftar percakapan pribadi ===== */
function listMode(){
  c.classList.add('chat');
  c.innerHTML='<div class="chbar" id="sw"></div><div id="msgs"></div>';$('#sw').append(chatSeg('p'));
  let convs=[],prev=new Map();
  const draw=()=>{const box=$('#msgs');box.replaceChildren();setTitle('Pesan pribadi','Terenkripsi end-to-end');
    const info=el('p','muted','Pesan pribadi dienkripsi di perangkat. Server dan owner tidak bisa membacanya.');box.append(info);
    if(!keyReady()){const b=el('button','w','Buka kunci chat untuk melihat isi pesan');b.onclick=async()=>{try{if(await unlock())fill()}catch(e){alert(e.message)}};box.append(b)}
    if(!convs.length){box.append(el('p','empty','Belum ada chat pribadi. Buka profil anggota di komunitas, lalu ketuk Kirim pesan.'));return}
    convs.forEach(d=>{const m=d.data(),other=m.members.find(x=>x!==S.me.uid),u=S.users.get(other)||{name:'Pengguna'},r=el('button','li'),i=el('div','grow'),top=el('div'),p=el('small','muted',prev.get(d.id)||'Pesan terenkripsi');
      top.append(nameEl(u));i.append(top,p);r.append(av(u,48),i,el('small','muted',ago(m.updatedAt||0)));r.onclick=()=>go('/dm/',{c:S.cid,u:other});box.append(r)})};
  async function fill(){for(const d of convs){const m=d.data(),other=m.members.find(x=>x!==S.me.uid),pub=S.users.get(other)?.pub;if(!m.last||!pub||!keyReady())continue;
    try{const t=await dec(await peerKey(pub),m.last.iv,m.last.ct);prev.set(d.id,(m.last.from===S.me.uid?'Kamu: ':'')+t.slice(0,60))}catch{}}draw()}
  onSnapshot(query(collection(db,'dms'),where('members','array-contains',S.me.uid)),s=>{convs=s.docs.sort((a,b)=>(b.data().updatedAt||0)-(a.data().updatedAt||0));tryLocal().then(fill)},e=>{$('#msgs').replaceChildren(el('p','empty','Gagal memuat: '+e.message))});
  S.onChange=()=>{if(!convs.length)draw();else tryLocal().then(fill)};draw()}

/* ===== Satu percakapan ===== */
const MAXF=25*1024*1024,MAXVN=170,INLINE=560*1024;
const toB64=u=>{let r='';for(let i=0;i<u.length;i+=0x8000)r+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(r)};
const fromB64=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const fmt=n=>n<1024?n+' B':n<1048576?Math.round(n/1024)+' KB':(n/1048576).toFixed(1)+' MB';
const mmss=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
function threadMode(){
  c.classList.add('chat');
  c.innerHTML='<div class="chbar" id="sw"></div><div id="msgs"></div><form class="send" id="send"><button type="button" class="ib" id="att" aria-label="Kirim file"></button><input type="file" id="file" hidden><div class="field"><input id="text" placeholder="Tulis pesan terenkripsi..." autocomplete="off" maxlength="1000"></div><button type="button" class="ib" id="mic" aria-label="Rekam VN"></button><button type="button" class="w mini" id="cancel" hidden>Batal</button><button class="fab" id="sendBtn" aria-label="Kirim"></button></form>';
  $('#sw').append(chatSeg('p'));$('#sendBtn').append(icon('send',24));$('#att').append(icon('plus',26));$('#mic').append(icon('mic',24));
  const pid=pairId(S.me.uid,peer);let ready=false,unlocked=false,docs=[],rendering=0,busy=false,rec=null;const opened=new Map();
  const peerU=()=>S.users.get(peer);
  const bk=el('button','ib');bk.setAttribute('aria-label','Kembali');bk.append(icon('next',24));bk.firstChild.style.transform='rotate(180deg)';bk.onclick=back;$('#acts').append(bk);
  const lk=el('button','ib');lk.setAttribute('aria-label','Info enkripsi');lk.append(icon('shield',24));
  lk.onclick=()=>sheet('Enkripsi end-to-end',async b=>{b.append(el('p','muted','Pesan, VN, dan file dienkripsi di perangkatmu dan hanya bisa dibuka oleh kamu dan lawan bicara. Bandingkan kode keamanan ini dengan lawan bicara. Kalau sama, chat kalian aman.'));
    const a=S.me.pub||S.users.get(S.me.uid)?.pub,p=peerU()?.pub;if(!a||!p){b.append(el('p','empty','Kode keamanan belum tersedia karena salah satu belum mengaktifkan chat terenkripsi.'));return}
    const code=el('div','panel');code.style.cssText='text-align:center;font:700 20px/1.5 ui-monospace,monospace;letter-spacing:1px';code.textContent=await fingerprint(a,p);b.append(code)});
  $('#acts').append(lk);
  const showPeer=()=>{const u=peerU();setTitle(u?.name||'Pesan pribadi','Terenkripsi end-to-end')};
  const lock=()=>{const off=!ready||busy||!!rec;['#att','#mic'].forEach(s=>$(s).disabled=!ready||busy||!!rec);$('#text').disabled=off;$('#sendBtn').disabled=!ready||busy};
  const setReady=(on,ph)=>{ready=on;lock();if(!rec)$('#text').placeholder=ph||'Tulis pesan terenkripsi...'};

  // Lampiran terenkripsi: file dan VN dibuka (diunduh dan didekripsi) hanya saat diketuk
  async function openAtt(m,meta,key){let buf;
    if(m.fd)buf=fromB64(m.fd).buffer;
    else{await load([m.fk]);const u=urls.get(m.fk);if(!u)throw Error('Link file tidak tersedia');
      const r=await fetch(u).catch(()=>{throw Error('Gagal mengunduh, cek CORS bucket (izinkan GET)')});if(!r.ok)throw Error('Gagal mengunduh ('+r.status+')');buf=await r.arrayBuffer()}
    return new Blob([await decBytes(key,meta.fiv,buf)],{type:meta.type||'application/octet-stream'})}
  function attBox(d,meta,key){const m=d.data(),box=el('div','att'),vn=meta.t==='vn';
    const showOpened=url=>{if(vn){const a=el('audio');a.controls=true;a.src=url;box.replaceChildren(a);return a}
      if((meta.type||'').startsWith('image/')){const i=el('img');i.src=url;i.alt=meta.name||'Gambar';box.replaceChildren(i);return i}
      const l=el('a','',(meta.name||'file')+' - simpan lagi');l.href=url;l.download=meta.name||'file';box.replaceChildren(l);return l};
    const label=vn?'Putar VN ('+mmss(meta.dur||0)+')':(meta.name||'File')+' ('+fmt(meta.size||0)+')';
    const btn=el('button','w',label);box.append(btn);
    btn.onclick=async()=>{btn.disabled=true;btn.textContent='Membuka...';
      try{if(!key)throw Error('Kunci tidak tersedia');let url=opened.get(d.id);if(!url){url=URL.createObjectURL(await openAtt(m,meta,key));opened.set(d.id,url)}
        const x=showOpened(url);if(vn)x.play().catch(()=>{});else if(!(meta.type||'').startsWith('image/'))x.click()}
      catch(e){btn.disabled=false;btn.textContent=label;alert(e.message)}};
    if(opened.has(d.id))showOpened(opened.get(d.id));return box}

  const bubble=(d,text,key)=>{const m=d.data(),mine=m.from===S.me.uid,u=mine?S.me:(peerU()||{name:'?'}),row=el('div','msg'),body=el('div','mb'),h=el('div','mh'),n=nameEl(u);n.classList.add('who');h.append(n,el('small','',hhmm(m.createdAt)));
    if(mine){const x=el('button','lnk','Hapus');x.onclick=()=>confirm('Hapus pesan ini untuk kedua pihak?')&&deleteDoc(d.ref).catch(e=>alert(e.message));h.append(x)}
    body.append(h);const bub=el('div','bub');
    let meta=null;if(m.fk||m.fd){try{meta=JSON.parse(text)}catch{}}
    if(meta)bub.append(attBox(d,meta,key));else bub.append(el('p','',text));
    body.append(bub);const a=av(u,48);a.classList.add('clk');a.onclick=()=>viewProfile(mine?S.me.uid:peer);row.append(a,body);return row};
  async function render(){const my=++rendering,box=$('#msgs'),near=box.scrollHeight-box.scrollTop-box.clientHeight<140||!box.childElementCount;
    if(!unlocked){box.replaceChildren(el('p','empty','Buka kunci chat dulu untuk membaca pesan.'));return}
    const p=peerU()?.pub;let key=null;try{if(p)key=await peerKey(p)}catch{}
    const kids=[];for(const d of docs){let t;try{t=key?await dec(key,d.data().iv,d.data().ct):'Pesan tidak bisa dibuka'}catch{t='Pesan tidak bisa dibuka (kunci berbeda)'}kids.push(bubble(d,t,key))}
    if(my!==rendering)return;if(!kids.length)kids.push(el('p','empty','Belum ada pesan. Pesan, VN, dan file kamu akan terenkripsi end-to-end.'));
    box.replaceChildren(...kids);if(near)box.scrollTop=box.scrollHeight}
  async function start(){setReady(false,'Membuka kunci...');
    try{unlocked=await unlock()}catch(e){alert(e.message)}
    if(!unlocked){setReady(false,'Kunci belum dibuka');const b=el('button','','Buka kunci chat');b.onclick=()=>{b.remove();start()};$('#msgs').replaceChildren(b);return}
    stop=onSnapshot(query(collection(db,`dms/${pid}/messages`),orderBy('createdAt'),limit(200)),s=>{docs=s.docs;render()},e=>{$('#msgs').replaceChildren(el('p','empty','Gagal memuat: '+e.message))});
    S.onChange()}
  S.onChange=()=>{showPeer();if(!peerU()){if(S.users.size)setReady(false,'Pengguna tidak ditemukan');return}
    if(!unlocked)return;
    if(!peerU().pub){setReady(false,peerU().name+' belum mengaktifkan chat terenkripsi');return}
    setReady(true);render()};

  // Kirim: teks sandi (iv + ct) ke Firestore; isi file/VN dienkripsi lalu diunggah sebagai blob acak
  async function post(plain,preview,extra){const key=await peerKey(peerU().pub),x=await enc(key,plain),p=preview===plain?x:await enc(key,preview),now=Date.now();
    await setDoc(doc(db,'dms',pid),{members:[S.me.uid,peer].sort(),updatedAt:now,last:{from:S.me.uid,iv:p.iv,ct:p.ct}});
    await addDoc(collection(db,`dms/${pid}/messages`),{from:S.me.uid,iv:x.iv,ct:x.ct,createdAt:now,...(extra||{})});
    sendPush({kind:'dm',pid,cid:S.cid||''})}
  // Lampiran <= 560 KB (VN, gambar, file kecil) disimpan terenkripsi langsung di Firestore; yang lebih besar lewat bucket
  async function sendAtt(blob,meta,preview){busy=true;lock();const old=$('#text').placeholder;$('#text').placeholder='Mengenkripsi dan mengirim...';
    try{if((blob.type||'').startsWith('image/')&&blob.type!=='image/gif'&&blob.size>300*1024){try{const du=await imageData(blob);blob=await(await fetch(du)).blob();meta.type=blob.type;meta.size=blob.size;meta.name=(meta.name||'foto').replace(/\.[^.]+$/,'')+'.jpg'}catch{}}
      if(blob.size>MAXF)throw Error('Ukuran maksimal '+fmt(MAXF));
      const key=await peerKey(peerU().pub),e=await encBytes(key,await blob.arrayBuffer());meta.fiv=e.iv;
      if(e.data.length<=INLINE)await post(JSON.stringify(meta),preview,{fd:toB64(e.data)});
      else{let fk;try{fk=await upload(new File([e.data],'e.mp4',{type:'video/mp4'}))}catch(x){if(String(x.message).startsWith('Upload gagal'))throw Error('File ini lebih dari 560 KB jadi harus lewat bucket penyimpanan, dan bucket belum bisa diakses (CORS belum diatur). Kirim file yang lebih kecil, atau minta owner mengatur CORS bucket.');throw x}
        await post(JSON.stringify(meta),preview,{fk})}}
    catch(x){alert(x.message)}finally{busy=false;$('#text').placeholder=old;lock()}}

  $('#att').onclick=()=>$('#file').click();
  $('#file').onchange=()=>{const f=$('#file').files[0];$('#file').value='';if(!f||!ready)return;if(f.size>MAXF)return alert('File terlalu besar, maksimal '+fmt(MAXF));
    sendAtt(f,{t:'file',name:f.name.slice(0,100),type:f.type||'application/octet-stream',size:f.size},'[File] '+f.name.slice(0,60))};

  // VN: rekam lewat mikrofon, ketuk kirim untuk mengirim, Batal untuk membuang
  const endRec=()=>{$('#cancel').hidden=true;$('#mic').hidden=false;$('#text').placeholder='Tulis pesan terenkripsi...';lock()};
  $('#mic').onclick=async()=>{if(rec||!ready||busy)return;let stream;
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch{return alert('Mikrofon tidak bisa diakses, cek izin browser')}
    if(!window.MediaRecorder){stream.getTracks().forEach(t=>t.stop());return alert('Browser ini belum mendukung rekam suara')}
    const mt=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t))||'',mr=new MediaRecorder(stream,{...(mt?{mimeType:mt}:{}),audioBitsPerSecond:24000}),chunks=[],t0=Date.now();
    mr.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    const r=rec={mr,cancel:false,timer:setInterval(()=>{const s=(Date.now()-t0)/1000;$('#text').placeholder='Merekam '+mmss(s)+' - ketuk kirim';if(s>=MAXVN)mr.stop()},300)};
    mr.onstop=()=>{clearInterval(r.timer);stream.getTracks().forEach(t=>t.stop());rec=null;endRec();if(r.cancel)return;
      const type=(mr.mimeType||mt||'audio/webm').split(';')[0],blob=new Blob(chunks,{type}),dur=Math.round((Date.now()-t0)/1000);if(dur<1)return;
      sendAtt(blob,{t:'vn',type,dur,size:blob.size,name:'vn'},'[VN] '+mmss(dur))};
    mr.start();$('#mic').hidden=true;$('#cancel').hidden=false;$('#text').value='';lock();$('#sendBtn').disabled=false};
  $('#cancel').onclick=()=>{if(rec){rec.cancel=true;rec.mr.stop()}};
  addEventListener('pagehide',()=>{if(rec){rec.cancel=true;rec.mr.stop()}});

  $('#send').onsubmit=async e=>{e.preventDefault();if(rec){rec.mr.stop();return}if(!ready||busy)return;const text=$('#text').value.trim();if(!text)return;$('#sendBtn').disabled=true;
    try{await post(text,text);$('#text').value=''}catch(x){alert(x.message)}lock()};
  showPeer();start()}

peer&&peer!==S.me.uid?threadMode():listMode();
