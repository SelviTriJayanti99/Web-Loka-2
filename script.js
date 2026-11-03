(function(){
'use strict';
const $=id=>document.getElementById(id);
const rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
const dt=s=>new Date(String(s).replace(' ','T'));
const fmt=s=>dt(s).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'});
const OSTAT=['baru','diproses','selesai','dibatalkan'],BSTAT=['menunggu','dikonfirmasi','selesai','dibatalkan'];
let user=null,hist={orders:[],bookings:[]},editId=null,gEditId=null,curTab='orders',pending=null;

function el(t,txt,cls){const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e}
function msg(id,t,ok){const m=$(id);m.className='msg '+(ok?'ok':'err');m.textContent=t}
function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>{e.hidden=true},3500)}
function tag(t,s){return el('span',t,'tag s-'+s)}
function addRow(tb,cells){const tr=document.createElement('tr');cells.forEach(c=>{const td=document.createElement('td');td.appendChild(c instanceof Node?c:document.createTextNode(String(c)));tr.appendChild(td)});tb.appendChild(tr)}
function sel(opts,cur,fn){
  const s=el('select',null,'sm');
  opts.forEach(o=>{const p=el('option',o);p.value=o;s.appendChild(p)});
  s.value=cur;
  s.onchange=async()=>{try{await fn(s.value);cur=s.value;loadStats().catch(()=>{})}catch(e){s.value=cur;toast(e.message)}};
  return s;
}

async function api(file,action,data){
  const o={credentials:'same-origin'};
  if(data!==undefined){o.method='POST';o.headers={'Content-Type':'application/json'};o.body=JSON.stringify(data)}
  let res;
  try{res=await fetch('api/'+file+'.php?action='+action,o)}
  catch(e){throw new Error('Server tidak terjangkau. Buka lewat http://localhost/loka-web/ dan pastikan Apache & MySQL menyala.')}
  let j={};try{j=await res.json()}catch(e){}
  if(res.status===401&&user){user=null;show('login');throw new Error('Sesi berakhir, silakan masuk lagi.')}
  if(!res.ok)throw new Error(j.error||'Terjadi kesalahan ('+res.status+'). Pastikan file dijalankan lewat PHP (XAMPP).');
  return j;
}

function show(v){
  ['home','register','login','dash','admin'].forEach(n=>{$('v-'+n).hidden=(n!==v)});
  const nav=$('nav');nav.innerHTML='';
  const b=(t,cls,fn)=>{const e=el('button',t,cls);e.onclick=fn;nav.appendChild(e)};
  b('Katalog','ghost',goCatalog);
  if(user)b('Keluar','ghost',logout);
  else{b('Masuk','ghost',()=>show('login'));b('Daftar','',()=>show('register'))}
  $('h-reg').hidden=$('h-log').hidden=!!user;$('h-dash').hidden=!user;
  window.scrollTo(0,0);
}
async function enter(){
  if(user.role==='admin'){show('admin');await renderAdmin()}
  else{show('dash');await renderDash();applyPending()}
}
function applyPending(){
  if(!pending)return;
  const p=pending;pending=null;
  tab(p.tab);
  if(p.menu&&mById(p.menu))cartSet(p.menu,1);
}
function goCatalog(){
  if($('v-home').hidden)show('home');
  requestAnimationFrame(()=>$('catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
}
async function logout(){
  try{await api('auth','logout',{})}catch(e){}
  user=null;pending=null;cart.clear();show('home');
}

$('h-reg').onclick=$('to-reg').onclick=()=>show('register');
$('h-log').onclick=$('to-login').onclick=()=>show('login');
$('h-cat').onclick=goCatalog;
$('h-dash').onclick=()=>{if(user)enter()};
document.querySelector('.logo').onclick=()=>{if(user)enter();else show('home')};

$('f-reg').onsubmit=async e=>{
  e.preventDefault();
  const name=$('r-name').value.trim(),email=$('r-email').value.trim().toLowerCase(),phone=$('r-phone').value.trim(),password=$('r-pass').value;
  if(!name||!email||!phone||!password)return msg('r-msg','Lengkapi semua kolom.');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return msg('r-msg','Format email belum benar.');
  if(!/^[0-9+][0-9\s-]{8,15}$/.test(phone))return msg('r-msg','Nomor WhatsApp belum benar.');
  if(password.length<6)return msg('r-msg','Kata sandi minimal 6 karakter.');
  if(password!==$('r-pass2').value)return msg('r-msg','Kata sandi tidak sama.');
  try{const r=await api('auth','register',{name,email,phone,password});user=r.user;$('f-reg').reset();msg('r-msg','',true);enter()}
  catch(err){msg('r-msg',err.message)}
};
$('f-log').onsubmit=async e=>{
  e.preventDefault();
  const email=$('l-email').value.trim().toLowerCase(),password=$('l-pass').value;
  if(!email||!password)return msg('l-msg','Isi email dan kata sandi.');
  try{const r=await api('auth','login',{email,password});user=r.user;$('f-log').reset();msg('l-msg','',true);enter()}
  catch(err){msg('l-msg',err.message)}
};

/* ---------- Dashboard pelanggan ---------- */
$('b-date').min=$('b-date').value=new Date().toLocaleDateString('en-CA');
function tab(t){
  document.querySelectorAll('#v-dash .tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));
  ['order','book','hist','prof'].forEach(n=>{$('t-'+n).hidden=(n!==t)});
}
document.querySelectorAll('#v-dash .tabs button').forEach(b=>{b.onclick=()=>tab(b.dataset.t)});

async function renderDash(){
  $('d-hi').textContent='Halo, '+user.name.split(' ')[0]+'!';
  $('s-since').textContent=dt(user.created_at).toLocaleDateString('id-ID',{month:'short',year:'numeric'});
  $('p-name').value=user.name;$('p-email').value=user.email;$('p-phone').value=user.phone;
  if(!shopMenu.length)skeleton($('s-grid'),6);
  try{
    const [m,h]=await Promise.all([api('user','menu'),api('user','history')]);
    setShopMenu(m.menu);
    hist=h;
    $('s-ord').textContent=h.orders.length;$('s-book').textContent=h.bookings.length;
    renderHist();
  }catch(e){toast(e.message)}
}
function renderHist(){
  const rows=[];
  hist.orders.forEach(o=>rows.push({t:o.created_at,k:'Pesanan',d:o.qty+'x '+o.item_name,i:rp(o.total),s:o.status,can:o.status==='baru',type:'order',id:o.id}));
  hist.bookings.forEach(b=>rows.push({t:b.created_at,k:'Booking',d:b.booking_date+' pukul '+String(b.booking_time).slice(0,5),i:b.people+' orang',s:b.status,can:b.status==='menunggu',type:'booking',id:b.id}));
  rows.sort((a,b)=>a.t<b.t?1:a.t>b.t?-1:0);
  const tb=$('h-body');tb.innerHTML='';
  rows.forEach(r=>{
    let act='';
    if(r.can){
      act=el('button','Batalkan','ghost sm');
      act.onclick=async()=>{
        if(!confirm('Batalkan '+r.k.toLowerCase()+' ini?'))return;
        try{await api('user','cancel',{type:r.type,id:r.id});await renderDash()}catch(e){toast(e.message)}
      };
    }
    addRow(tb,[tag(r.k,'diproses'),r.d,r.i,tag(r.s,r.s),fmt(r.t),act]);
  });
  $('h-empty').hidden=rows.length>0;
}
$('b-btn').onclick=async()=>{
  const date=$('b-date').value,time=$('b-time').value,people=parseInt($('b-ppl').value,10);
  if(!date||!time||!people||people<1||people>12)return msg('b-msg','Isi tanggal, jam, dan jumlah orang (1-12).');
  try{const r=await api('user','booking',{date,time,people});msg('b-msg','Meja dibooking untuk '+r.people+' orang, '+r.date+' pukul '+r.time+'. Menunggu konfirmasi admin.',true);await renderDash()}
  catch(e){msg('b-msg',e.message)}
};
$('p-btn').onclick=async()=>{
  const name=$('p-name').value.trim(),phone=$('p-phone').value.trim();
  if(!name||!phone)return msg('p-msg','Nama dan nomor tidak boleh kosong.');
  try{const r=await api('user','profile',{name,phone});user=r.user;msg('p-msg','Profil disimpan.',true);$('d-hi').textContent='Halo, '+user.name.split(' ')[0]+'!'}
  catch(e){msg('p-msg',e.message)}
};

/* ---------- Dashboard admin ---------- */
async function loadStats(){
  const s=await api('admin','stats');
  $('st-users').textContent=s.users;$('st-orders').textContent=s.orders;$('st-books').textContent=s.bookings;
  $('st-rev').textContent=rp(s.revenue);$('st-new').textContent=s.orders_new;$('st-pend').textContent=s.bookings_pending;$('st-login').textContent=s.logins_today;
}
async function loadOrders(){
  const r=await api('admin','orders'),tb=$('ao-body');tb.innerHTML='';
  r.orders.forEach(o=>addRow(tb,['#'+o.id,o.user_name+' ('+o.user_email+')',o.qty+'x '+o.item_name,rp(o.total),
    sel(OSTAT,o.status,v=>api('admin','order_status',{id:o.id,status:v})),fmt(o.created_at)]));
  if(!r.orders.length)addRow(tb,['','Belum ada pesanan.','','','','']);
}
async function loadBooks(){
  const r=await api('admin','bookings'),tb=$('ab-body');tb.innerHTML='';
  r.bookings.forEach(b=>addRow(tb,['#'+b.id,b.user_name+' ('+b.user_phone+')',b.booking_date+' pukul '+String(b.booking_time).slice(0,5),b.people,
    sel(BSTAT,b.status,v=>api('admin','booking_status',{id:b.id,status:v}))]));
  if(!r.bookings.length)addRow(tb,['','Belum ada booking.','','','']);
}
function resetMenuForm(){editId=null;$('m-name').value='';$('m-price').value='';$('m-cat').value='Makanan';$('m-desc').value='';$('m-img').value='';$('m-active').checked=true;$('m-btn').textContent='Tambah menu';$('m-cancel').hidden=true}
async function loadMenu(){
  const r=await api('admin','menu'),tb=$('am-body');tb.innerHTML='';
  r.menu.forEach(m=>{
    const on=+m.is_active===1,act=el('div',null,'acts2');
    const e=el('button','Ubah','ghost sm');
    e.onclick=()=>{editId=m.id;$('m-name').value=m.name;$('m-price').value=m.price;$('m-cat').value=m.category;$('m-desc').value=m.description||'';$('m-img').value=m.image_url||'';$('m-active').checked=on;$('m-btn').textContent='Simpan perubahan';$('m-cancel').hidden=false;$('m-name').focus()};
    const d=el('button','Hapus','danger sm');
    d.onclick=async()=>{
      if(!confirm('Hapus menu "'+m.name+'"?'))return;
      try{await api('admin','menu_delete',{id:m.id});if(editId===m.id)resetMenuForm();loadMenu();loadCatalog()}catch(x){toast(x.message)}
    };
    act.append(e,d);
    addRow(tb,[m.name,m.category,rp(m.price),tag(on?'Aktif':'Nonaktif',on?'selesai':'dibatalkan'),act]);
  });
}
$('m-cancel').onclick=resetMenuForm;
$('m-btn').onclick=async()=>{
  const name=$('m-name').value.trim(),price=parseInt($('m-price').value,10);
  if(!name||!price||price<1)return toast('Isi nama dan harga menu dengan benar.');
  try{await api('admin','menu_save',{id:editId,name,price,category:$('m-cat').value,description:$('m-desc').value.trim(),image_url:$('m-img').value.trim(),active:$('m-active').checked});toast('Menu disimpan.');resetMenuForm();loadMenu();loadCatalog()}
  catch(e){toast(e.message)}
};
async function loadUsers(){
  const r=await api('admin','users'),tb=$('au-body');tb.innerHTML='';
  r.users.forEach(u=>{
    let act='';
    if(u.role==='user'){
      act=el('button','Hapus','danger sm');
      act.onclick=async()=>{
        if(!confirm('Hapus akun '+u.name+' beserta pesanan dan booking-nya?'))return;
        try{await api('admin','user_delete',{id:u.id});loadUsers();loadStats().catch(()=>{})}catch(x){toast(x.message)}
      };
    }
    addRow(tb,[u.name,u.email,u.phone,tag(u.role,u.role==='admin'?'selesai':'diproses'),u.orders,u.bookings,act]);
  });
}
function devUA(u){
  u=String(u||'');
  const b=/Edg\//.test(u)?'Edge':/OPR\//.test(u)?'Opera':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'Lainnya';
  const o=/Windows/.test(u)?'Windows':/Android/.test(u)?'Android':/iPhone|iPad/.test(u)?'iOS':/Mac OS/.test(u)?'macOS':/Linux/.test(u)?'Linux':'?';
  return b+' / '+o;
}
const LSTAT={berhasil:'selesai',gagal:'dibatalkan',keluar:'diproses'};
async function loadLogins(){
  const r=await api('admin','logins'),tb=$('al-body');tb.innerHTML='';
  r.logins.forEach(l=>addRow(tb,[fmt(l.created_at),l.user_name||'-',l.email,tag(l.status,LSTAT[l.status]),l.ip_address||'-',devUA(l.user_agent)]));
  if(!r.logins.length)addRow(tb,['','Belum ada riwayat login.','','','','']);
}
/* ---------- Admin: kelola boardgame ---------- */
function resetGameForm(){
  gEditId=null;
  ['gm-title','gm-genre','gm-desc'].forEach(i=>{$(i).value=''});
  $('gm-min').value=2;$('gm-max').value=4;$('gm-dur').value=30;$('gm-diff').value='mudah';
  $('gm-avail').checked=true;$('gm-active').checked=true;
  $('gm-btn').textContent='Tambah game';$('gm-cancel').hidden=true;
}
async function loadGames(){
  const r=await api('admin','games'),tb=$('ag-body');tb.innerHTML='';
  const dl=$('gm-genres');dl.innerHTML='';
  [...new Set(r.games.map(g=>g.genre))].sort().forEach(x=>{const o=document.createElement('option');o.value=x;dl.appendChild(o)});
  r.games.forEach(g=>{
    const act=el('div',null,'acts2');
    const e=el('button','Ubah','ghost sm');
    e.onclick=()=>{
      gEditId=g.id;$('gm-title').value=g.title;$('gm-genre').value=g.genre;
      $('gm-min').value=g.min_players;$('gm-max').value=g.max_players;$('gm-dur').value=g.duration;
      $('gm-diff').value=g.difficulty;$('gm-desc').value=g.description;
      $('gm-avail').checked=+g.is_available===1;$('gm-active').checked=+g.is_active===1;
      $('gm-btn').textContent='Simpan perubahan';$('gm-cancel').hidden=false;$('gm-title').focus();
    };
    const d=el('button','Hapus','danger sm');
    d.onclick=async()=>{
      if(!confirm('Hapus game "'+g.title+'"?'))return;
      try{await api('admin','game_delete',{id:g.id});if(gEditId===g.id)resetGameForm();loadGames();loadCatalog()}catch(x){toast(x.message)}
    };
    act.append(e,d);
    const st=+g.is_active!==1?tag('Disembunyikan','dibatalkan'):(+g.is_available===1?tag('Tersedia','selesai'):tag('Dipakai','diproses'));
    addRow(tb,[g.title,g.genre,playersTxt(g),g.duration+' mnt',g.difficulty,st,act]);
  });
  if(!r.games.length)addRow(tb,['Belum ada game.','','','','','','']);
}
$('gm-cancel').onclick=resetGameForm;
$('gm-btn').onclick=async()=>{
  const d={
    id:gEditId,title:$('gm-title').value.trim(),genre:$('gm-genre').value.trim(),
    min_players:parseInt($('gm-min').value,10),max_players:parseInt($('gm-max').value,10),
    duration:parseInt($('gm-dur').value,10),difficulty:$('gm-diff').value,
    description:$('gm-desc').value.trim(),available:$('gm-avail').checked,active:$('gm-active').checked
  };
  if(!d.title||!d.genre)return toast('Isi judul dan genre game.');
  if(!(d.min_players>=1)||!(d.max_players>=d.min_players)||d.max_players>20)return toast('Jumlah pemain belum benar.');
  if(!(d.duration>=5&&d.duration<=480))return toast('Durasi harus 5-480 menit.');
  try{await api('admin','game_save',d);toast('Game disimpan.');resetGameForm();loadGames();loadCatalog()}
  catch(e){toast(e.message)}
};
const LOADERS={orders:loadOrders,books:loadBooks,menu:loadMenu,games:loadGames,users:loadUsers,logins:loadLogins};
async function loadTab(t){try{await LOADERS[t]()}catch(e){toast(e.message)}}
function atab(t){
  curTab=t;
  document.querySelectorAll('#v-admin .tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.a===t));
  ['orders','books','menu','games','users','logins'].forEach(n=>{$('ap-'+n).hidden=(n!==t)});
  loadTab(t);
}
document.querySelectorAll('#v-admin .tabs button').forEach(b=>{b.onclick=()=>atab(b.dataset.a)});
async function renderAdmin(){
  $('a-hi').textContent='Masuk sebagai '+user.name+' ('+user.email+')';
  loadStats().catch(e=>toast(e.message));
  atab(curTab);
}

/* ---------- Katalog publik ---------- */
const NS_ICON=(inner)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+inner+'</svg>';
const GENRE_ICON={
  strategi:'<path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/>',
  keluarga:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  party:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>',
  kooperatif:'<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
  abstrak:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  _:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none"/>'
};
const I_USERS='<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
const I_CLOCK='<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
const I_CUP='<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>';
const I_FORK='<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>';
const DIFF={mudah:1,sedang:2,sulit:3};
let games=[],menuList=[],gf={q:'',genre:'',ppl:'',sort:'title'};

const slug=g=>String(g).toLowerCase().replace(/[^a-z0-9]/g,'');
function ico(inner,cls){const s=el('span',null,cls);s.innerHTML=NS_ICON(inner);return s}
function playersTxt(g){return +g.min_players===+g.max_players?g.min_players+' pemain':g.min_players+'-'+g.max_players+' pemain'}
function metaItem(inner,txt,cls){const li=el('li',null,cls);li.innerHTML=NS_ICON(inner);li.appendChild(document.createTextNode(txt));return li}
function skeleton(grid,n){grid.innerHTML='';for(let i=0;i<n;i++)grid.appendChild(el('div',null,'skel'))}

function gameCard(g){
  const on=+g.is_available===1,sl=slug(g.genre);
  const c=el('article',null,'gcard'+(on?'':' off'));
  const cover=el('div',null,'cover g-'+sl);
  cover.append(ico(GENRE_ICON[sl]||GENRE_ICON._,'cover-ic'),el('span',g.genre,'ctag'),el('span',on?'Tersedia':'Sedang dipakai','avail '+(on?'on':'off')));
  const body=el('div',null,'cbody');
  body.appendChild(el('h4',g.title));
  if(g.description)body.appendChild(el('p',g.description));
  const meta=el('ul',null,'meta');
  meta.append(metaItem(I_USERS,playersTxt(g)),metaItem(I_CLOCK,g.duration+' mnt'));
  const lv=el('li',null,'lv');lv.title='Kesulitan: '+g.difficulty;
  const dots=el('span',null,'dots');dots.setAttribute('aria-hidden','true');
  for(let i=1;i<=3;i++)dots.appendChild(el('i',null,i<=(DIFF[g.difficulty]||1)?'on':''));
  lv.append(dots,document.createTextNode(g.difficulty));
  meta.appendChild(lv);
  body.appendChild(meta);
  c.append(cover,body);
  return c;
}
function needAccount(p,txt){
  if(user&&user.role==='admin'){toast('Akun admin tidak bisa memesan atau booking.');return}
  pending=p;
  if(user)enter();
  else{toast(txt);show('register')}
}

function renderGames(){
  const q=gf.q.trim().toLowerCase(),n=+gf.ppl||0;
  const r=games.filter(g=>(!gf.genre||g.genre===gf.genre)
    &&(!q||(g.title+' '+g.genre).toLowerCase().includes(q))
    &&(!n||(+g.min_players<=n&&+g.max_players>=n)));
  const by={title:(a,b)=>a.title.localeCompare(b.title,'id')};
  by.duration=(a,b)=>a.duration-b.duration||by.title(a,b);
  by.diff=(a,b)=>(DIFF[a.difficulty]||0)-(DIFF[b.difficulty]||0)||by.title(a,b);
  by.players=(a,b)=>b.max_players-a.max_players||by.title(a,b);
  r.sort(by[gf.sort]||by.title);
  const grid=$('g-grid');grid.innerHTML='';
  r.forEach(g=>grid.appendChild(gameCard(g)));
  const filtered=!!(gf.q||gf.genre||gf.ppl);
  $('g-empty').hidden=r.length>0;
  $('g-empty-t').textContent=games.length?'Tidak ada game yang cocok dengan filter ini.':'Belum ada game di katalog.';
  $('g-reset').hidden=!filtered;
  $('g-count').textContent=games.length?'Menampilkan '+r.length+' dari '+games.length+' game':'';
}
function buildChips(){
  const box=$('g-chips');box.innerHTML='';
  const counts={};games.forEach(g=>{counts[g.genre]=(counts[g.genre]||0)+1});
  const mk=(label,val,n)=>{
    const b=el('button',label,'chip');b.type='button';b.dataset.g=val;
    b.setAttribute('aria-pressed',String(gf.genre===val));
    b.appendChild(el('small',n));
    b.onclick=()=>{gf.genre=val;syncChips();renderGames()};
    box.appendChild(b);
  };
  if(!games.length)return;
  mk('Semua','',games.length);
  Object.keys(counts).sort((a,b)=>a.localeCompare(b,'id')).forEach(k=>mk(k,k,counts[k]));
}
function syncChips(){document.querySelectorAll('#g-chips .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.g===gf.genre)))}
function renderMenuList(){
  const grid=$('m-grid');grid.innerHTML='';
  sortMenu(menuList).forEach(m=>grid.appendChild(productCard(m,false)));
  $('m-empty').hidden=menuList.length>0;
}
async function loadCatalog(){
  $('c-err').hidden=true;
  skeleton($('g-grid'),6);skeleton($('m-grid'),6);
  try{
    const [g,m]=await Promise.all([api('catalog','games'),api('catalog','menu')]);
    games=g.games;menuList=m.menu;
    $('cc-games').textContent=games.length;$('cc-menu').textContent=menuList.length;
    buildChips();renderGames();renderMenuList();
  }catch(e){
    $('g-grid').innerHTML='';$('m-grid').innerHTML='';$('g-count').textContent='';
    $('c-err-t').textContent=e.message;$('c-err').hidden=false;
  }
}
function resetFilters(){
  gf={q:'',genre:'',ppl:'',sort:gf.sort};
  $('g-q').value='';$('g-ppl').value='';syncChips();renderGames();
}
$('g-q').oninput=e=>{gf.q=e.target.value;renderGames()};
$('g-ppl').onchange=e=>{gf.ppl=e.target.value;renderGames()};
$('g-sort').onchange=e=>{gf.sort=e.target.value;renderGames()};
$('g-reset').onclick=resetFilters;
$('c-retry').onclick=loadCatalog;
$('c-cta').onclick=()=>needAccount({tab:'book'},'Masuk atau daftar dulu untuk booking meja.');
document.querySelectorAll('.seg button').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-selected',String(x===b)));
    $('cp-games').hidden=b.dataset.c!=='games';$('cp-menu').hidden=b.dataset.c!=='menu';
  };
});

/* ---------- Katalog menu: kartu produk + keranjang ---------- */
const CAT_ORDER=['Makanan','Minuman','Cemilan'];
const I_COOKIE='<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>';
const CAT_ICON={Makanan:I_FORK,Minuman:I_CUP,Cemilan:I_COOKIE};
const catRank=c=>{const i=CAT_ORDER.indexOf(c);return i<0?99:i};
const sortMenu=l=>l.slice().sort((a,b)=>catRank(a.category)-catRank(b.category)||a.name.localeCompare(b.name,'id'));
const cart=new Map(),cartLi=new Map();
let shopMenu=[],sf={q:'',cat:''};
const mById=id=>shopMenu.find(x=>+x.id===+id);
const cartQty=id=>cart.get(+id)||0;

function menuMedia(m){
  const box=el('div',null,'pimg c-'+slug(m.category||''));
  const art=()=>box.prepend(ico(CAT_ICON[m.category]||I_FORK,'pimg-ic'));
  if(m.image_url){
    const im=document.createElement('img');
    im.src=String(m.image_url).replace(/ /g,'%20');im.alt=m.name;im.loading='lazy';
    im.onerror=()=>{im.remove();art()};
    box.appendChild(im);
  }else art();
  box.appendChild(el('span',m.category||'Menu','ctag'));
  return box;
}
function stepper(id){
  const w=el('div',null,'step');
  const mi=el('button','\u2212','step-b'),pl=el('button','+','step-b');
  mi.type=pl.type='button';
  mi.setAttribute('aria-label','Kurangi');pl.setAttribute('aria-label','Tambah');
  mi.onclick=()=>cartSet(id,cartQty(id)-1);
  pl.onclick=()=>cartSet(id,cartQty(id)+1);
  w.append(mi,el('span',String(cartQty(id)),'step-n'),pl);
  return w;
}
function fillCtl(box,m){
  const q=cartQty(m.id),st=box.querySelector('.step');
  if(q>0&&st){st.querySelector('.step-n').textContent=q;return}
  const had=box.contains(document.activeElement);
  box.innerHTML='';
  if(q>0)box.appendChild(stepper(m.id));
  else{const b=el('button','Tambah','sm add');b.type='button';b.onclick=()=>cartSet(m.id,1);box.appendChild(b)}
  if(had)(box.querySelector('.step-b:last-of-type')||box.querySelector('.add')).focus();
}
function productCard(m,shop){
  const c=el('article',null,'pcard');
  const body=el('div',null,'pbody');
  body.appendChild(el('h4',m.name));
  if(m.description)body.appendChild(el('p',m.description));
  const foot=el('div',null,'pfoot');
  foot.appendChild(el('b',rp(m.price),'price'));
  if(shop){const box=el('div',null,'ctl');box.dataset.ctl=m.id;fillCtl(box,m);foot.appendChild(box)}
  else{
    const b=el('button','Pesan','ghost sm');b.type='button';
    b.onclick=()=>needAccount({tab:'order',menu:m.id},'Masuk atau daftar dulu untuk memesan. Pilihanmu akan disimpan.');
    foot.appendChild(b);
  }
  body.appendChild(foot);
  c.append(menuMedia(m),body);
  return c;
}

function cartSet(id,q){
  id=+id;q=Math.max(0,Math.min(50,q));
  if(q)cart.set(id,q);else cart.delete(id);
  const m=mById(id);
  if(m)document.querySelectorAll('[data-ctl="'+id+'"]').forEach(b=>fillCtl(b,m));
  renderCart();
}
function cartItem(m){
  const li=el('li',null,'ci');
  li.append(el('b',m.name),el('span',null,'ci-sub'),el('small',rp(m.price)+' / porsi'),stepper(m.id));
  return li;
}
function renderCart(){
  const list=$('cart-list');
  cartLi.forEach((li,id)=>{if(!cart.has(id)){li.remove();cartLi.delete(id)}});
  let n=0,total=0;
  cart.forEach((q,id)=>{
    const m=mById(id);
    if(!m){cart.delete(id);return}
    n+=q;total+=q*m.price;
    let li=cartLi.get(id);
    if(!li){li=cartItem(m);cartLi.set(id,li);list.appendChild(li)}
    li.querySelector('.step-n').textContent=q;
    li.querySelector('.ci-sub').textContent=rp(q*m.price);
  });
  $('cart-empty').hidden=n>0;$('cart-foot').hidden=n===0;$('cart-bar').hidden=n===0;
  $('cart-total').textContent=rp(total);$('cb-n').textContent=n;$('cb-t').textContent=rp(total);
  if(n===0)closeCart();
}
function openCart(){$('cart').classList.add('open');$('cart-bd').hidden=false}
function closeCart(){$('cart').classList.remove('open');$('cart-bd').hidden=true}
$('cart-bar').onclick=openCart;$('cart-x').onclick=closeCart;$('cart-bd').onclick=closeCart;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart()});

function buildShopChips(){
  const box=$('s-chips');box.innerHTML='';
  const counts={};shopMenu.forEach(m=>{counts[m.category]=(counts[m.category]||0)+1});
  if(sf.cat&&!counts[sf.cat])sf.cat='';
  if(!shopMenu.length)return;
  const mk=(label,val,n)=>{
    const b=el('button',label,'chip');b.type='button';b.dataset.g=val;
    b.setAttribute('aria-pressed',String(sf.cat===val));
    b.appendChild(el('small',n));
    b.onclick=()=>{sf.cat=val;document.querySelectorAll('#s-chips .chip').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.g===sf.cat)));renderShop()};
    box.appendChild(b);
  };
  mk('Semua','',shopMenu.length);
  Object.keys(counts).sort((a,b)=>catRank(a)-catRank(b)||a.localeCompare(b,'id')).forEach(k=>mk(k,k,counts[k]));
}
function renderShop(){
  const q=sf.q.trim().toLowerCase();
  const r=shopMenu.filter(m=>(!sf.cat||m.category===sf.cat)&&(!q||(m.name+' '+(m.description||'')).toLowerCase().includes(q)));
  const grid=$('s-grid');grid.innerHTML='';
  r.forEach(m=>grid.appendChild(productCard(m,true)));
  $('s-empty').hidden=r.length>0;
}
function setShopMenu(list){
  shopMenu=sortMenu(list);
  buildShopChips();renderShop();renderCart();
}
$('s-q').oninput=e=>{sf.q=e.target.value;renderShop()};
$('o-btn').onclick=async()=>{
  if(!cart.size)return;
  const items=[...cart].map(([menu_id,qty])=>({menu_id,qty})),btn=$('o-btn');
  btn.disabled=true;
  try{
    const r=await api('user','order_batch',{items});
    msg('o-msg','',true);
    cart.clear();renderCart();
    toast('Pesanan terkirim: '+r.items+' menu, total '+rp(r.total)+'. Lihat statusnya di Riwayat.');
    await renderDash();
  }catch(e){msg('o-msg',e.message)}
  finally{btn.disabled=false}
};

(async function boot(){
  loadCatalog();
  try{user=(await api('auth','me')).user}
  catch(e){const b=$('boot-err');b.textContent=e.message;b.hidden=false}
  if(user)enter();else show('home');
})();
})();
