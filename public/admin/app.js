import{boot,S,el,fld,tag,api,av,nameEl,setTitle,db,doc,updateDoc}from'/shared.js';
const c=await boot({tab:'settings'});c.classList.add('pad');setTitle('Kelola akun','Khusus owner');
if(S.me.role!=='owner'){c.append(el('p','empty','Hanya owner yang boleh mengelola akun'))}
else{const f=el('form','panel'),[l1,u]=fld('Username (huruf kecil, angka, _)'),[l2,pw]=fld('Password'),[l3,nm]=fld('Nama tampilan'),l4=el('label','','Role'),rs=el('select'),msg=el('p','err'),gen=el('button','w','Acak password'),out=el('div','stack'),list=el('div','stack');
u.pattern='[a-z0-9_]{3,20}';u.oninput=()=>{u.value=u.value.toLowerCase()};u.autocapitalize='none';u.required=pw.required=true;pw.minLength=6;gen.type='button';
[['member','Member'],['admin','Admin']].forEach(([a,t])=>{const o=el('option','',t);o.value=a;rs.append(o)});l4.append(rs);
gen.onclick=()=>{const k='abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';pw.value=Array.from(crypto.getRandomValues(new Uint8Array(10)),x=>k[x%k.length]).join('')};
f.append(el('h3','','Buat akun member'),l1,l2,gen,l3,l4,msg,el('button','','Buat akun'));
f.onsubmit=async e=>{e.preventDefault();msg.className='err';msg.textContent='';try{const d=await api('/api/create-member',{username:u.value.trim(),password:pw.value,name:nm.value.trim(),role:rs.value});
const r=el('div','li static'),i=el('div','grow',`${d.username} / ${pw.value}`),b=el('button','w mini','Salin');b.onclick=async()=>{await navigator.clipboard.writeText(`Username: ${d.username}\nPassword: ${pw.value}`);b.textContent='Tersalin'};r.append(i,tag(d.role),b);out.prepend(r);msg.className='ok';msg.textContent='Akun dibuat, salin password sekarang';f.reset()}catch(x){msg.textContent=x.message}};
c.append(f,out,el('h3','','Semua akun'),list);
S.onChange=()=>{list.replaceChildren();[...S.users].forEach(([uid,x])=>{const r=el('div','li static'),i=el('div','grow'),top=el('div');top.append(nameEl(x));i.append(top,el('small','muted',`@${x.username} - ${x.role}`));r.append(av(x,44),i);
  if(x.role!=='owner'&&uid!==S.me.uid){const v=el('button','w mini',x.verified?'Cabut centang':'Beri centang'),d=el('button','r mini','Hapus');
    v.onclick=()=>updateDoc(doc(db,'users',uid),{verified:!x.verified}).catch(e=>alert(e.message));
    d.onclick=async()=>{if(!confirm(`Hapus akun ${x.name} (@${x.username})? Tidak bisa dibatalkan.`))return;d.disabled=true;try{await api('/api/delete-member',{uid})}catch(e){alert(e.message);d.disabled=false}};
    r.append(v,d)}
  list.append(r)})};S.onChange()}
