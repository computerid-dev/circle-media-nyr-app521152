import{boot,S,el,fld,av,avatarData,BADGES,badgeOf,badgeImg,isStaffRole,setTitle,db,doc,updateDoc}from'/shared.js';
const c=await boot({tab:'settings'});c.classList.add('pad');setTitle('Edit profil','Pengaturan');
let drawn=false,bd=null;
const setBadge=id=>updateDoc(doc(db,'users',S.me.uid),{badge:id}).catch(e=>alert(e.message));
// Lencana yang dipakai di belakang nama: member hanya yang diberikan owner/admin, admin/owner boleh semua (bawaan: tanpa lencana)
function drawBadges(){bd.replaceChildren(el('h3','','Lencana saya'));
  const staff=isStaffRole(S.me),owned=staff?BADGES.map(x=>x.id):(S.me.badges||[]).filter(badgeOf);
  if(!owned.length){bd.append(el('p','muted','Belum punya lencana. Lencana hanya bisa diberikan oleh owner atau admin.'));return}
  bd.append(el('p','muted',staff?'Pilih lencana apa saja yang mau dipakai. Bawaannya tanpa lencana.':'Pilih lencana yang mau dipakai di belakang namamu.'));
  const grid=el('div','bgrid'),none=el('button','bchoice'+(!S.me.badge?' on':''));none.append(el('span','','Tanpa lencana'));none.onclick=()=>setBadge(null);grid.append(none);
  owned.forEach(id=>{const t=el('button','bchoice'+(S.me.badge===id?' on':''));t.append(badgeImg(id,56),el('span','',badgeOf(id).name));t.onclick=()=>setBadge(id);grid.append(t)});bd.append(grid)}
S.onChange=()=>{if(!drawn){drawn=true;
const f=el('form','panel'),[l1,n]=fld('Nama tampilan',S.me.name),[l2,b]=fld('Bio',S.me.bio||''),[l3,fi]=fld('Foto profil','','file'),msg=el('p','err'),btn=el('button','','Simpan'),box=el('div','prof');
let preview=av(S.me,84);box.append(preview,el('b','muted',`@${S.me.username} - ${S.me.role}`));
fi.accept='image/*';n.maxLength=40;b.maxLength=120;
f.append(box,l1,l2,l3,msg,btn);
f.onsubmit=async e=>{e.preventDefault();msg.className='err';msg.textContent='';btn.disabled=true;btn.textContent='Menyimpan...';
try{const d={name:n.value.trim().slice(0,40),bio:b.value.slice(0,120)};if(!d.name)throw Error('Nama wajib diisi');
const x=fi.files[0];if(x){if(!x.type.startsWith('image/'))throw Error('Foto harus berupa gambar');d.avatar=await avatarData(x)}
await updateDoc(doc(db,'users',S.me.uid),d);
const next=av({...S.me,...d},84);preview.replaceWith(next);preview=next;fi.value='';
msg.className='ok';msg.textContent='Profil tersimpan'}catch(x){msg.textContent=x.message}
btn.disabled=false;btn.textContent='Simpan'};
bd=el('div','panel');c.append(f,bd)}
drawBadges()};
S.onChange();
