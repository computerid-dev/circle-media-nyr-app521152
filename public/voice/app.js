import{boot,S,$,el,api,av,nameEl,icon,go,textTarget,viewProfile,setTitle,db,collection,doc,setDoc,addDoc,deleteDoc,onSnapshot,query,where}from'/shared.js';
const c=await boot({needCommunity:true,tab:'channel'});
c.classList.add('pad');
c.innerHTML='<div class="vhero"><div class="hi" id="vic"></div><h3 id="vtitle">Ruang suara</h3><p class="muted" id="vempty">Belum ada yang di room ini.</p></div><div id="vlist" class="stack"></div><div class="row2"><button id="vchat" class="w">Ke chat teks</button><button id="vjoin" class="g">Gabung suara</button><button id="vmute" class="w" hidden>Mute</button><button id="vleave" class="r" hidden>Keluar room</button></div><p id="verr" class="err"></p><div id="vsw" class="stack"></div><p class="muted">Pindah ke layar lain akan memutus suara.</p>';
$('#vic').append(icon('vol',48));
const toText=()=>go('/chat/index.html',{c:S.cid,ch:textTarget()});$('#vchat').onclick=toText;
const tb=el('button','ib');tb.setAttribute('aria-label','Kembali ke chat teks');tb.append(icon('chat',24));tb.onclick=toText;$('#acts').append(tb);
function drawSwitch(){const box=$('#vsw');box.replaceChildren();
  [['text','Pindah ke channel teks','hash','/chat/index.html'],['voice','Channel suara lain','vol','/voice/index.html']].forEach(([t,l,ic,path])=>{const list=S.chans.filter(x=>(x.type||'text')===t&&x.id!==S.chid);if(!list.length)return;
    box.append(el('small','sec',l));list.forEach(x=>{const r=el('button','li');r.append(icon(ic,20),el('b','grow',x.name),icon('next',18));r.onclick=()=>go(path,{c:S.cid,ch:x.id});box.append(r)})})}
let ch=null,vc=null,watching=null;
S.onChange=()=>{ch=S.chans.find(x=>x.id===S.chid);drawSwitch();if(!ch){setTitle('Suara',S.comms.find(x=>x.id===S.cid)?.name||'');$('#vempty').textContent='Pilih channel suara dari tab Channel.';return}
if(ch.type!=='voice')return go('/chat/index.html',{c:S.cid,ch:ch.id});
setTitle(ch.name,'Ruang suara');$('#vtitle').textContent=ch.name;
if(watching!==ch.id){watching=ch.id;onSnapshot(collection(db,`communities/${S.cid}/channels/${ch.id}/voice`),s=>{$('#vempty').hidden=s.size>0;$('#vlist').replaceChildren(...s.docs.map(d=>{const u=S.users.get(d.id)||{},r=el('div','vu');r.append(av(u,44),nameEl(u.name?u:{name:d.id}));r.classList.add('clk');r.onclick=()=>viewProfile(d.id);return r}))})}};
S.onChange();
const sig=(to,type,data)=>addDoc(collection(db,`${vc.base}/signals`),{from:S.me.uid,to,type,data:JSON.stringify(data),at:Date.now()});
function peer(id){let p=vc.peers.get(id);if(p)return p;const pc=new RTCPeerConnection({iceServers:vc.ice});vc.stream.getTracks().forEach(t=>pc.addTrack(t,vc.stream));
pc.onicecandidate=e=>e.candidate&&sig(id,'ice',e.candidate.toJSON());
pc.onconnectionstatechange=()=>{const st=pc.connectionState,nm=S.users.get(id)?.name||'temanmu';if(st==='connected')$('#verr').textContent='';else if(st==='failed'){$('#verr').textContent='Gagal tersambung ke '+nm+'. Biasanya jaringan (data seluler atau WiFi tertentu) memblokir koneksi langsung dan butuh server TURN. Minta owner mengisi TURN_URL, TURN_USERNAME, dan TURN_CREDENTIAL.';try{pc.restartIce()}catch{}}};
pc.ontrack=e=>{let a=document.getElementById('a-'+id);if(!a){a=el('audio');a.id='a-'+id;a.autoplay=true;document.body.append(a)}a.srcObject=e.streams[0];a.play?.().catch(()=>{})};
p={pc,q:[]};vc.peers.set(id,p);return p}
const flush=async p=>{while(p.q.length)await p.pc.addIceCandidate(p.q.shift()).catch(()=>{})};
async function call(id){const{pc}=peer(id),o=await pc.createOffer();await pc.setLocalDescription(o);sig(id,'offer',{type:o.type,sdp:o.sdp})}
async function onSig(m){if(!vc)return;const p=peer(m.from),pc=p.pc,d=JSON.parse(m.data);
if(m.type==='offer'){await pc.setRemoteDescription(d);await flush(p);const a=await pc.createAnswer();await pc.setLocalDescription(a);sig(m.from,'answer',{type:a.type,sdp:a.sdp})}
else if(m.type==='answer'){await pc.setRemoteDescription(d);await flush(p)}
else if(pc.remoteDescription)pc.addIceCandidate(d).catch(()=>{});else p.q.push(d)}
function drop(id){const p=vc?.peers.get(id);if(p){p.pc.close();vc.peers.delete(id)}document.getElementById('a-'+id)?.remove()}
const ui=on=>{$('#vjoin').hidden=on;$('#vmute').hidden=!on;$('#vleave').hidden=!on};
$('#vjoin').onclick=async()=>{$('#verr').textContent='';if(vc||!ch)return;$('#vjoin').disabled=true;
try{const stream=await navigator.mediaDevices.getUserMedia({audio:true}).catch(()=>{throw Error('Mikrofon tidak bisa diakses, cek izin')});
const{iceServers}=await api('/api/ice-servers').catch(e=>{stream.getTracks().forEach(t=>t.stop());throw e});
const base=`communities/${S.cid}/channels/${ch.id}`,at=Date.now();vc={stream,base,ice:iceServers,peers:new Map(),unsubs:[],muted:false};
await setDoc(doc(db,`${base}/voice/${S.me.uid}`),{joinedAt:at});
vc.unsubs.push(onSnapshot(collection(db,`${base}/voice`),s=>s.docChanges().forEach(x=>{if(x.doc.id===S.me.uid)return;if(x.type==='added'&&at>x.doc.data().joinedAt)call(x.doc.id);if(x.type==='removed')drop(x.doc.id)})));
vc.unsubs.push(onSnapshot(query(collection(db,`${base}/signals`),where('to','==',S.me.uid)),s=>s.docChanges().forEach(x=>{if(x.type!=='added')return;const m=x.doc.data();deleteDoc(x.doc.ref);onSig(m)})));
ui(true)}catch(e){$('#verr').textContent=e.message;vc=null}
$('#vjoin').disabled=false};
async function leave(){if(!vc)return;const v=vc;vc=null;v.unsubs.forEach(f=>f());v.peers.forEach(p=>p.pc.close());document.querySelectorAll('audio[id^=a-]').forEach(a=>a.remove());v.stream.getTracks().forEach(t=>t.stop());await deleteDoc(doc(db,`${v.base}/voice/${S.me.uid}`)).catch(()=>{});ui(false)}
$('#vleave').onclick=leave;
$('#vmute').onclick=()=>{vc.muted=!vc.muted;vc.stream.getAudioTracks().forEach(t=>t.enabled=!vc.muted);$('#vmute').textContent=vc.muted?'Unmute':'Mute'};
addEventListener('pagehide',()=>{if(vc)deleteDoc(doc(db,`${vc.base}/voice/${S.me.uid}`))});
