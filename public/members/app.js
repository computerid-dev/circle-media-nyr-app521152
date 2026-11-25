import{boot,S,el,ask,tag,av,nameEl,sheet,isStaffRole,badgeSheet,inCommunity,viewProfile,canManage,canBg,setTitle,db,collection,doc,setDoc,addDoc,deleteDoc,updateDoc,onSnapshot}from'/shared.js';
const c=await boot({needCommunity:true,tab:'members'});c.classList.add('pad');
let reqs=[],reqStop=null,reqFor=null;
const fail=e=>alert(e.message);
async function assign(uid,rid){const r=S.roles.find(x=>x.id===rid),ref=doc(db,`communities/${S.cid}/members/${uid}`);try{if(!r)await deleteDoc(ref);else await setDoc(ref,{roleId:r.id,roleName:r.name,color:r.color,mod:!!r.mod})}catch(e){alert(e.message)}}
async function delRole(r){if(!confirm(`Hapus role ${r.name}?`))return;for(const[u,m]of S.mems)if(m.roleId===r.id)await deleteDoc(doc(db,`communities/${S.cid}/members/${u}`));await deleteDoc(doc(db,`communities/${S.cid}/roles/${r.id}`))}
// Persetujuan join: admin/owner (atau moderator komunitas) menyetujui atau menolak permintaan
const approve=async uid=>{try{await setDoc(doc(db,`communities/${S.cid}/people/${uid}`),{at:Date.now(),by:S.me.uid});await deleteDoc(doc(db,`communities/${S.cid}/requests/${uid}`))}catch(e){fail(e)}};
const reject=uid=>deleteDoc(doc(db,`communities/${S.cid}/requests/${uid}`)).catch(fail);
const kick=async(uid,name)=>{if(confirm(`Keluarkan ${name} dari komunitas ini?`))await deleteDoc(doc(db,`communities/${S.cid}/people/${uid}`)).catch(fail)};
function watchReq(){if(!S.cid||!canManage()||reqFor===S.cid)return;reqFor=S.cid;reqStop?.();
  reqStop=onSnapshot(collection(db,`communities/${S.cid}/requests`),s=>{reqs=s.docs.map(d=>({id:d.id,...d.data()}));S.onChange()},()=>{})}
S.onChange=()=>{setTitle('Anggota',S.comms.find(x=>x.id===S.cid)?.name||'');c.replaceChildren();
  if(!S.cid){c.append(el('p','empty','Kamu belum bergabung ke komunitas. Buka tab Channel untuk meminta bergabung.'));return}
  watchReq();
  const w=el('div','stack');
  if(canManage()){
    const list=el('div','stack');w.append(el('h3','',`Permintaan bergabung (${reqs.length})`),list);
    if(!reqs.length)list.append(el('p','muted','Tidak ada permintaan.'));
    reqs.forEach(r=>{const row=el('div','li static'),i=el('div','grow'),u=S.users.get(r.id)||{name:r.name};i.append(nameEl(u),el('small','muted','@'+(u.username||r.id)));
      const ok=el('button','mini','Setujui'),no=el('button','r mini','Tolak');ok.onclick=()=>approve(r.id);no.onclick=()=>reject(r.id);row.append(av(u,44),i,ok,no);list.append(row)});
    if(canBg()){const all=el('button','w','Masukkan semua akun ke komunitas ini');all.onclick=async()=>{const todo=[...S.users.keys()].filter(id=>!inCommunity(id));if(!todo.length){alert('Semua akun sudah jadi anggota');return}
      if(!confirm(`Masukkan ${todo.length} akun langsung tanpa persetujuan?`))return;await Promise.all(todo.map(id=>setDoc(doc(db,`communities/${S.cid}/people/${id}`),{at:Date.now(),by:S.me.uid}))).catch(fail)};w.append(all)}}
  w.append(el('h3','','Role'));const cl=el('div','chips');
  S.roles.forEach(r=>{const t=tag(r.name+(r.mod?' (mod)':''),r.color);if(canManage()){const x=el('button','r mini','x');x.style.marginLeft='6px';x.onclick=()=>delRole(r);t.append(x)}cl.append(t)});
  if(!S.roles.length)cl.append(el('span','muted','Belum ada role'));w.append(cl);
  if(canManage()){const b=el('button','','+ Role');b.onclick=async()=>{const v=await ask('Role baru',[['name','Nama role'],['color','Warna','color','#c4264f'],['mod','Boleh moderasi (hapus pesan, kelola channel)','checkbox']]);if(v?.name.trim())await addDoc(collection(db,`communities/${S.cid}/roles`),{name:v.name.trim().slice(0,24),color:v.color,mod:!!v.mod})};w.append(b)}
  const people=[...S.users].filter(([uid])=>inCommunity(uid));
  w.append(el('h3','',`Anggota (${people.length})`));
  people.forEach(([uid,u])=>{const row=el('div','li static'),i=el('div','grow clk'),m=S.mems.get(uid),top=el('div'),a=av(u,46);top.append(nameEl(u));if(m)top.append(' ',tag(m.roleName,m.color));
    i.append(top,el('small','muted',`@${u.username} - ${u.role}`));a.classList.add('clk');a.onclick=i.onclick=()=>viewProfile(uid);row.append(a,i);
    if(canBg()&&!isStaffRole(u)){const lb=el('button','w mini','Lencana');lb.onclick=()=>badgeSheet(uid);row.append(lb)}
    if(canManage()&&S.roles.length){const s=el('select'),o0=el('option','','Tanpa role');o0.value='';s.append(o0);S.roles.forEach(r=>{const o=el('option','',r.name);o.value=r.id;s.append(o)});s.value=m?.roleId||'';s.style.width='auto';s.onchange=()=>assign(uid,s.value);row.append(s)}
    if(canManage()&&uid!==S.me.uid&&!isStaffRole(u)&&S.people.has(uid)){const k=el('button','r mini','Keluarkan');k.onclick=()=>kick(uid,u.name);row.append(k)}
    w.append(row)});
  c.append(w)};
S.onChange();
