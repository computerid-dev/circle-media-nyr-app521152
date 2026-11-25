import{boot,S,$,el,icon,chatSeg,sheet,nameEl,tag,av,hhmm,RX,canManage,go,setTitle,newChannel,viewProfile,canBg,bgSheet,rememberText,load,urls,upload,imageData,audioData,db,collection,addDoc,deleteDoc,updateDoc,onSnapshot,query,orderBy,limit,arrayUnion,arrayRemove}from'/shared.js';
import{inCommunity,isStaffRole}from'/shared.js';
const c=await boot({needCommunity:true,tab:'chat'});
c.classList.add('chat');
c.innerHTML='<div class="chbar" id="sw"></div><div class="chbar" id="chbar"></div><div id="sbar" hidden><input id="q" placeholder="Cari pesan atau nama"></div><div id="msgs"></div><div id="drop" hidden>Lepas file di sini (gambar, MP3, video)</div><div id="picked" hidden><span id="pname" class="grow"></span><button type="button" class="w mini" id="pclear" aria-label="Batalkan file">x</button></div><form class="send" id="send"><button type="button" class="rbtn" id="attach" aria-label="Lampirkan file"></button><div class="field"><input id="text" placeholder="Kirim pesan..." autocomplete="off"><button type="button" class="ibtn" id="emo" aria-label="Emoji"></button></div><button class="fab" id="sendBtn" aria-label="Kirim"></button></form><input id="file" type="file" accept="image/*,audio/mpeg,.mp3,video/*" hidden>';
$('#sw').append(chatSeg('c'));$('#attach').append(icon('plus',26));$('#emo').append(icon('smile',26));$('#sendBtn').append(icon('send',24));
const sb=el('button','ib');sb.setAttribute('aria-label','Cari pesan');sb.append(icon('search',24));
sb.onclick=()=>{$('#sbar').hidden=!$('#sbar').hidden;if(!$('#sbar').hidden)$('#q').focus();else{$('#q').value='';render()}};$('#acts').append(sb);
$('#q').oninput=()=>render();
let watching=null,stop=null,last=[],picked=null,ready=false;

const kb=n=>n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1)+' MB';
const kind=f=>f.type.startsWith('image/')?'image':(f.type.startsWith('audio/')||/\.mp3$/i.test(f.name))?'audio':f.type.startsWith('video/')?'video':'';
function setPicked(f){
  if(f&&!kind(f)){alert('Format tidak didukung. Pakai gambar, MP3, atau video.');return}
  picked=f||null;$('#file').value='';
  $('#picked').hidden=!picked;$('#pname').textContent=picked?`${picked.name} (${kb(picked.size)})`:'';
}
function setEnabled(on){ready=on;['#text','#attach','#sendBtn','#emo'].forEach(s=>$(s).disabled=!on);$('#text').placeholder=on?'Kirim pesan...':'Pilih channel teks dulu'}
const showEmpty=t=>$('#msgs').replaceChildren(el('p','empty',t));
const cname=()=>S.comms.find(x=>x.id===S.cid)?.name||'Claude of Anarchy';

function banner(){const h=el('div','hello'),i=el('div','hi'),t=el('div');i.append(icon('mega',46));t.append(el('span','','Selamat datang di'),el('b','acc',cname()),el('small','','Senang bisa melihat kamu di sini'));h.append(i,t);return h}
function toggle(d,k){const has=(d.data().reactions?.[k]||[]).includes(S.me.uid);updateDoc(d.ref,{['reactions.'+k]:has?arrayRemove(S.me.uid):arrayUnion(S.me.uid)}).catch(e=>alert(e.message))}
function rxRow(d,m){const row=el('div','rx'),rx=m.reactions||{};
  Object.entries(RX).forEach(([k,e])=>{const a=rx[k]||[];if(!a.length)return;const b=el('button','pill'+(a.includes(S.me.uid)?' on':''));b.append(el('span','',e),el('b','',String(a.length)));b.onclick=()=>toggle(d,k);row.append(b)});
  const add=el('button','pill');add.setAttribute('aria-label','Beri reaksi');add.append(icon('smile',20));
  add.onclick=()=>sheet('Reaksi',(b,close)=>{const g=el('div','chips');Object.entries(RX).forEach(([k,e])=>{const x=el('button','chip',e);x.style.fontSize='24px';x.onclick=()=>{toggle(d,k);close()};g.append(x)});b.append(g)});
  row.append(add);return row}
// ---- Mention: @semua (owner/admin) dan @nama, seperti WhatsApp ----
const escRx=t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const cands=()=>[...S.users].filter(([id])=>inCommunity(id)).map(([id,u])=>({id,name:u.name||'',un:u.username||''}));
const canAll=()=>isStaffRole(S.me);
function mctx(){const tk=[{k:'all',s:'semua'},{k:'all',s:'all'}];cands().forEach(p=>{if(p.name)tk.push({k:p.id,s:p.name});if(p.un)tk.push({k:p.id,s:p.un})});
tk.sort((a,b)=>b.s.length-a.s.length);return{tk,rx:new RegExp('@('+tk.map(x=>escRx(x.s)).join('|')+')(?![\\p{L}\\p{N}_])','giu')}}
let MC=mctx();
const tokOf=(ctx,w)=>ctx.tk.find(x=>x.s.toLowerCase()===w.toLowerCase());
function found(text){const ctx=mctx(),ids=new Set();let all=false;for(const m of text.matchAll(ctx.rx)){const t=tokOf(ctx,m[1]);if(!t)continue;t.k==='all'?all=true:ids.add(t.k)}return{ids,all}}
function rich(text,m){const p=el('p','');let i=0;for(const x of text.matchAll(MC.rx)){const t=tokOf(MC,x[1]);if(!t)continue;const isAll=t.k==='all';if(isAll&&!m.mentionAll)continue;
p.append(text.slice(i,x.index));p.append(el('span','mention'+(isAll||t.k===S.me.uid?' me':''),x[0]));i=x.index+x[0].length}
p.append(text.slice(i));return p}
async function notify(mm,text){const ch=S.chans.find(x=>x.id===S.chid),targets=mm.all?[...S.users.keys()].filter(id=>id!==S.me.uid&&inCommunity(id)):[...mm.ids];if(!targets.length)return;
const n={type:mm.all?'all':'mention',cid:S.cid,chid:S.chid,chName:ch?.name||'',from:S.me.uid,fromName:S.me.name||'',text:text.slice(0,100),read:false,createdAt:Date.now()};
await Promise.allSettled(targets.map(id=>addDoc(collection(db,`users/${id}/notifs`),n)))}
const sug=el('div','sug');sug.hidden=true;$('#send').before(sug);
$('#text').addEventListener('input',()=>{const t=$('#text'),pos=t.selectionStart,m=/(^|\s)@([^\s@]*)$/.exec(t.value.slice(0,pos));if(!m){sug.hidden=true;return}
const q=m[2].toLowerCase(),list=[];if(canAll()&&('semua'.startsWith(q)||'all'.startsWith(q)))list.push({label:'@semua',sub:'Notifikasi ke semua anggota',ins:'semua'});
cands().filter(p=>p.id!==S.me.uid&&((p.name||'').toLowerCase().includes(q)||(p.un||'').toLowerCase().includes(q))).slice(0,6).forEach(p=>list.push({label:p.name||p.un,sub:p.un?'@'+p.un:'',ins:p.name||p.un}));
if(!list.length){sug.hidden=true;return}
sug.replaceChildren(...list.map(x=>{const b=el('button','li');b.type='button';b.append(el('b','',x.label),el('small','muted',x.sub));b.onmousedown=e=>e.preventDefault();
b.onclick=()=>{const before=t.value.slice(0,pos).replace(/@([^\s@]*)$/,'@'+x.ins+' ');t.value=before+t.value.slice(pos);t.focus();t.setSelectionRange(before.length,before.length);sug.hidden=true};return b}));sug.hidden=false});
function msgEl(d){const m=d.data(),u=S.users.get(m.uid)||{name:m.name},mem=S.mems.get(m.uid),row=el('div','msg'+((m.mentionAll||(m.mentions||[]).includes(S.me.uid))?' tome':'')),body=el('div','mb'),h=el('div','mh'),n=nameEl(u);
  n.classList.add('who');h.append(n);if(mem)h.append(tag(mem.roleName,mem.color));h.append(el('small','',hhmm(m.createdAt)));
  if(m.uid===S.me.uid||canManage()){const x=el('button','lnk','Hapus');x.onclick=()=>confirm('Hapus pesan ini?')&&deleteDoc(d.ref);h.append(x)}
  body.append(h);const bub=el('div','bub');let has=false;
  if(m.text){bub.append(rich(m.text,m));has=true}
  if(m.fileData){const au=(m.fileType||'').startsWith('audio'),e=el(au?'audio':'img');e.src=m.fileData;if(au)e.controls=true;else e.alt='Lampiran';bub.append(e);has=true}
  if(m.fileKey&&urls.get(m.fileKey)){const v=(m.fileType||'').startsWith('video'),e=el(v?'video':'img');e.src=urls.get(m.fileKey);if(v)e.controls=true;else e.alt='Lampiran';bub.append(e);has=true}
  if(has)body.append(bub);body.append(rxRow(d,m));const a=av(u,52);a.classList.add('clk');a.onclick=n.onclick=()=>viewProfile(m.uid);n.classList.add('clk');row.append(a,body);return row}
function render(){MC=mctx();const b=$('#msgs'),q=$('#q').value.trim().toLowerCase(),near=b.scrollHeight-b.scrollTop-b.clientHeight<140||!b.childElementCount;
  const docs=q?last.filter(d=>{const m=d.data();return(m.text||'').toLowerCase().includes(q)||(S.users.get(m.uid)?.name||m.name||'').toLowerCase().includes(q)}):last;
  const kids=docs.map(msgEl);if(!q)kids.unshift(banner());b.replaceChildren(...kids);if(near)b.scrollTop=b.scrollHeight}

function drawBar(ch){const bar=$('#chbar');bar.replaceChildren();if(!S.cid)return;
  const p=el('button','chpill');p.append(icon('hash',22),el('b','',ch?ch.name:'pilih channel'),icon('chev',18));
  p.onclick=()=>sheet('Channel',(b,close)=>{[['text','Teks'],['voice','Suara']].forEach(([t,l])=>{const list=S.chans.filter(x=>(x.type||'text')===t);if(!list.length)return;b.append(el('small','sec',l));
    list.forEach(x=>{const r=el('button','li'+(x.id===S.chid?' on':''));r.append(icon(t==='text'?'hash':'vol',20),el('b','grow',x.name));r.onclick=()=>go(t==='voice'?'/voice/':'/chat/',{c:S.cid,ch:x.id});b.append(r)})});
    if(!S.chans.length)b.append(el('p','empty','Belum ada channel.'));if(canManage()){const n=el('button','w','+ Channel baru');n.onclick=()=>{close();newChannel()};b.append(n)}});
  const mb=el('button','ib'),more=el('button','ib');mb.setAttribute('aria-label','Anggota');more.setAttribute('aria-label','Menu');mb.append(icon('users',24));more.append(icon('dots',24));
  mb.onclick=()=>go('/members/',{c:S.cid});
  more.onclick=()=>sheet('Menu',(b,close)=>{const a=el('button','li');a.append(icon('hash',20),el('b','grow','Semua channel dan komunitas'));a.onclick=()=>go('/channel/',{c:S.cid});b.append(a);
    if(canBg()){const g=el('button','li');g.append(icon('image',20),el('b','grow','Ganti background'));g.onclick=()=>{close();bgSheet()};b.append(g)}
    if(canManage()){const n=el('button','li');n.append(icon('plus',20),el('b','grow','Buat channel'));n.onclick=()=>{close();newChannel()};b.append(n)}});
  bar.append(p,el('span','grow'),mb,more)}

S.onChange=()=>{
  if(S.cid&&!S.chid){const t=S.chans.find(x=>(x.type||'text')==='text');if(t){S.chid=t.id;history.replaceState(null,'',`?c=${S.cid}&ch=${t.id}`)}}
  const ch=S.cid?S.chans.find(x=>x.id===S.chid):null;
  if(ch?.type==='voice')return go('/voice/',{c:S.cid,ch:ch.id});
  if(ch)rememberText(ch.id);
  setTitle(S.cid?cname():'Claude of Anarchy','Server Komunitas');drawBar(ch);setEnabled(!!ch);
  if(!ch){watching=null;stop?.();stop=null;last=[];showEmpty(S.cid?'Belum ada channel teks. Buka tab Channel untuk membuatnya.':'Kamu belum bergabung ke komunitas mana pun. Ketuk huruf di pojok kiri atas atau buka tab Channel untuk meminta bergabung.');return}
  if(watching!==ch.id){watching=ch.id;stop?.();
    stop=onSnapshot(query(collection(db,`communities/${S.cid}/channels/${ch.id}/messages`),orderBy('createdAt'),limit(100)),async s=>{await load(s.docs.map(d=>d.data().fileKey));last=s.docs;render()})}
  else render()};
S.onChange();

$('#send').onsubmit=async e=>{e.preventDefault();if(!ready)return;
  const text=$('#text').value.trim(),f=picked;if(!text&&!f)return;
  $('#sendBtn').disabled=true;
  try{const m={uid:S.me.uid,name:S.me.name,text,createdAt:Date.now()};
    if(f){const k=kind(f);
      if(k==='image'){m.fileData=await imageData(f);m.fileType='image/jpeg'}
      else if(k==='audio'){m.fileData=await audioData(f);m.fileType='audio/mpeg'}
      else{m.fileKey=await upload(f);m.fileType=f.type}}
    const mm=found(text);if(mm.all&&!canAll())mm.all=false;mm.ids.delete(S.me.uid);if(mm.ids.size)m.mentions=[...mm.ids];if(mm.all)m.mentionAll=true;
    await addDoc(collection(db,`communities/${S.cid}/channels/${S.chid}/messages`),m);
    notify(mm,text).catch(()=>{});
    $('#text').value='';sug.hidden=true;setPicked(null)}catch(x){alert(x.message)}
  $('#sendBtn').disabled=!ready};
$('#emo').onclick=()=>sheet('Emoji',(b,close)=>{const g=el('div','chips');['😀','😂','😍','😎','🥳','👍','🙏','🔥','❤️','😢','😡','🤔','👏','🎉','🙌','💯'].forEach(x=>{const t=el('button','chip',x);t.style.fontSize='24px';t.onclick=()=>{$('#text').value+=x;close();$('#text').focus()};g.append(t)});b.append(g)});
$('#attach').onclick=()=>$('#file').click();
$('#file').onchange=()=>setPicked($('#file').files[0]);
$('#pclear').onclick=()=>setPicked(null);
$('#text').addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])][0];if(f){e.preventDefault();setPicked(f)}});
let depth=0;const hasFiles=e=>[...(e.dataTransfer?.types||[])].includes('Files');
c.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();depth++;if(ready)$('#drop').hidden=false});
c.addEventListener('dragover',e=>{if(hasFiles(e))e.preventDefault()});
c.addEventListener('dragleave',e=>{if(!hasFiles(e))return;if(--depth<=0){depth=0;$('#drop').hidden=true}});
c.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();depth=0;$('#drop').hidden=true;if(ready&&e.dataTransfer.files[0])setPicked(e.dataTransfer.files[0])});
