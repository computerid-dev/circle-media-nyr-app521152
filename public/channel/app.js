import{boot,S,el,icon,isApproved,canManage,canCreateCommunity,go,setTitle,newChannel,newCommunity,communitySheet,isStaffRole}from'/shared.js';
const c=await boot({needCommunity:true,tab:'channel'});c.classList.add('pad');
S.onChange=()=>{setTitle('Channel',S.comms.find(x=>x.id===S.cid)?.name||'');c.replaceChildren();
  const w=el('div','stack'),cs=el('div','chips');w.append(el('h3','','Komunitas'));
  S.comms.forEach(x=>{const b=el('button','chip'+(x.id===S.cid?' on':''),x.name+(isApproved(x.id)===false?' (belum bergabung)':''));b.onclick=()=>go('/channel/',{c:x.id});cs.append(b)});
  if(canCreateCommunity()){const n=el('button','chip','+ Baru');n.onclick=newCommunity;cs.append(n)}w.append(cs);
  const cur=S.comms.find(x=>x.id===S.cid);if(cur){const card=el('div','panel prof'),im=el('img','clogo'),t=el('div','grow');im.src=cur.avatar||'/logo.png';im.alt='';im.style.cssText='width:64px;height:64px';t.append(el('b','',cur.name));card.append(im,t);if(isStaffRole(S.me)){const e=el('button','w mini','Edit profil');e.onclick=communitySheet;card.append(e)}w.append(card)}
  if(S.cid){[['text','Channel teks','hash','/chat/'],['voice','Channel suara','vol','/voice/']].forEach(([t,l,ic,path])=>{w.append(el('h3','',l));const list=S.chans.filter(x=>(x.type||'text')===t);
    if(!list.length)w.append(el('p','muted','Belum ada.'));
    list.forEach(x=>{const r=el('button','li'+(x.id===S.chid?' on':''));r.append(icon(ic,22),el('b','grow',x.name),icon('next',18));r.onclick=()=>go(path,{c:S.cid,ch:x.id});w.append(r)})});
    if(canManage()){const b=el('button','','+ Buat channel');b.onclick=newChannel;w.append(b)}}
  else w.append(el('p','empty','Kamu belum bergabung ke komunitas mana pun. Pilih komunitas di atas, lalu minta bergabung dan tunggu persetujuan admin atau owner.'));
  c.append(w)};
S.onChange();
