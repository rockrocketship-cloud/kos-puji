const $ = id => document.getElementById(id);
const now = new Date();
const period = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit'}).format(now);
const money = n => 'Rp'+n.toLocaleString('id-ID');
const safe = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let page='Ringkasan', filter='Semua', editing=null;
const mode=$('mode'), month=$('month'), form=$('form');
mode.value='real';
month.value=month.max=period;
$('date').textContent=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Makassar'}).format(now);
function initial(){
 const rooms=mode.value==='real'?[]:['Dina Putri','Rizky Ahmad','','Fajar Hadi','Indah Sari',''].map((tenant,i)=>({id:String(i),name:String(101+i),rate:i<3?850000:1000000,tenant}));
 return {rooms,bills:{}};
}
function data(){
 const raw=mode.value==='demo'?localStorage.getItem('kos-puji-v1-demo'):null;
 const db=mode.value==='real'?structuredClone(cloudRecord.payload):(raw?JSON.parse(raw):initial());
 db.expenses??=[];
 if(!db.bills[period]){
  db.bills[period]=db.rooms.filter(r=>r.tenant).map((r,i)=>({...r,billId:crypto.randomUUID(),paid:mode.value==='demo'&&!raw&&i%2===0}));
  if(mode.value==='real')cloudRecord.payload.bills[period]=structuredClone(db.bills[period]);
  else localStorage.setItem('kos-puji-v1-demo',JSON.stringify(db));
 }
 return db;
}
const monthName=new Intl.DateTimeFormat('id-ID',{month:'short',timeZone:'UTC'}).format(new Date(period+'-01T00:00:00Z'));
let currentBills=[];
function rentLine(r){
 const b=currentBills.find(x=>x.id===r.id&&x.tenant===r.tenant);
 if(!b)return '';
 if(!b.paid)return '<small class="noDate">Sewa '+monthName+': belum lunas</small>';
 return '<small class="'+(b.paidAt?'paidOn':'noDate')+'">Sewa '+monthName+': '+(b.paidAt?'dibayar '+b.paidAt.split('-').reverse().join('/'):'lunas, tanggal belum dicatat')+'</small>';
}
function stat(label,value,detail){return '<div class="stat">'+label+'<strong>'+value+'</strong><small>'+detail+'</small></div>'}
function render(){
 showAccess();
 $('add').disabled=!cloudReady();
 if(!cloudReady())return;
 const db=data(), billing=page==='Pembayaran', selected=month.value||period, bills=db.bills[selected]||[];
 currentBills=db.bills[period]||[];
 const occupied=db.rooms.filter(r=>r.tenant).length;
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 const expensesPage=page==='Pengeluaran';
 $('add').textContent=expensesPage?'＋ Tambah pengeluaran':'＋ Tambah kamar';
 $('stats').classList.toggle('expenseStats',expensesPage);
 if(expensesPage)return renderExpenses(db,selected);
 $('title').textContent={Ringkasan:'Ringkasan kos',Kamar:'Daftar kamar',Pembayaran:'Pembayaran sewa'}[page];
 $('subtitle').textContent={Ringkasan:'Pantau hunian dan pembayaran sewa.',Kamar:'Kelola kamar, tarif, dan penghuni.',Pembayaran:'Catat pelunasan sewa per bulan.'}[page];
 $('stats').innerHTML=stat('Kamar terisi',occupied,'dari '+db.rooms.length+' kamar')+stat('Kamar kosong',db.rooms.length-occupied,'siap dihuni')+stat('Tagihan lunas',bills.filter(b=>b.paid).length,'dari '+bills.length+' tagihan');
 $('listTitle').textContent=billing?'Tagihan bulanan':'Daftar kamar';
 month.hidden=!billing;
 const choices=billing?['Semua','Lunas','Belum lunas']:['Semua','Terisi','Kosong'];
 $('filters').innerHTML=choices.map(s=>'<button class="'+(s===filter?'sel':'')+'">'+s+'</button>').join('');
 const records=billing?bills:db.rooms;
 const status=r=>billing?(r.paid?'Lunas':'Belum lunas'):(r.tenant?'Terisi':'Kosong');
 const rows=records.filter(r=>filter==='Semua'||status(r)===filter);
 $('count').textContent=rows.length+(billing?' tagihan':' kamar');
 $('rows').innerHTML=rows.map(r=>'<div class="row"><span class="tile" aria-hidden="true">⌂</span><div><b>Kamar '+safe(r.name)+'</b><small>'+safe(r.tenant||'Belum ada penghuni')+'</small>'+sinceLine(r,billing,selected)+(!billing&&r.tenant?rentLine(r):'')+(billing&&r.paid?'<small class="'+(r.paidAt?'paidOn':'noDate')+'">'+(r.paidAt?'Dibayar '+r.paidAt.split('-').reverse().join('/'):'Tanggal bayar belum dicatat')+'</small>':'')+'</div><span class="money">'+money(r.rate)+'</span><span class="pill '+(!r.paid&&billing?'due':'')+'">'+status(r)+'</span><button class="edit" data-id="'+safe(billing?r.billId:r.id)+'">'+(billing?(r.paid?'Batalkan lunas':'Catat lunas'):'Edit')+'</button>'+(billing&&r.paid?'<button class="edit dateBtn" data-pay="'+safe(r.billId)+'">'+(r.paidAt?'Ubah tanggal':'Isi tanggal')+'</button>':'')+'</div>').join('')||'<p class="empty">'+(billing?'Belum ada tagihan untuk pilihan ini.':'Belum ada kamar untuk pilihan ini.')+'</p>';
}
function editor(id=null){
 if(!cloudReady()||saving)return;
 editing=id;form.reset();const r=data().rooms.find(x=>x.id===id);
 $('formTitle').textContent=r?'Edit kamar':'Tambah kamar';
 if(r){form.room.value=r.name;form.rate.value=r.rate;form.tenant.value=r.tenant}

 form.since.value=r?.since||'';
 sinceVisibility();
 $('modal').showModal();
}
function sinceVisibility(){if(form.tenant.value.trim()&&!form.since.value)form.since.value=today}
form.tenant.addEventListener('input',sinceVisibility);
function sinceLine(r,billing,ym){
 if(!r.tenant||!r.since)return '';
 if(!billing)return '<small>Sewa sejak '+fmtDate(r.since)+' · jatuh tempo tiap tgl '+Number(r.since.slice(8))+'</small>';
 if(r.paid)return '';
 const due=dueDate(r.since,ym),late=due<today;
 return '<small class="'+(late?'late':'')+'">'+(late?'Terlambat · jatuh tempo ':'Jatuh tempo ')+fmtDate(due)+'</small>';
}
const fmtDate=d=>d.split('-').reverse().join('/');
function dueDate(since,ym){
 const day=Number(since.slice(8,10)),[y,m]=ym.split('-').map(Number);
 const last=new Date(Date.UTC(y,m,0)).getUTCDate();
 return ym+'-'+String(Math.min(day,last)).padStart(2,'0');
}
document.querySelector('nav').onclick=e=>{if(!e.target.dataset.page)return;page=e.target.dataset.page;filter='Semua';if(page!=='Pembayaran')month.value=period;render()};
$('filters').onclick=e=>{if(e.target.tagName==='BUTTON'){filter=e.target.textContent;render()}};
mode.onchange=()=>{filter='Semua';render();if(mode.value==='real')refreshCloud()};
month.onchange=render;$('add').onclick=()=>page==='Pengeluaran'?expenseEditor():editor();$('cancel').onclick=()=>$('modal').close();
$('rows').onclick=async e=>{
 if(!cloudReady()||saving)return;
 if(e.target.dataset.pay)return payEditor(e.target.dataset.pay);
 const id=e.target.dataset.id;if(!id)return;
 if(page==='Pengeluaran')return expenseEditor(id);
 if(page!=='Pembayaran')return editor(id);
 const db=data(),b=db.bills[month.value].find(x=>x.billId===id);
 if(!b.paid)return payEditor(id);
 if(confirm('Batalkan pelunasan untuk '+b.tenant+' sebesar '+money(b.rate)+'?')){b.paid=false;delete b.paidAt;if(await save(db))render()}
};
let payId=null;
function payEditor(id){
 if(!cloudReady()||saving)return;
 const b=data().bills[month.value]?.find(x=>x.billId===id);if(!b)return;
 payId=id;
 const input=$('payForm').elements.namedItem('paidAt');
 input.max=today;
 input.value=b.paidAt||(month.value===period?today:month.value+'-01');
 $('payInfo').textContent=b.tenant+' · Kamar '+b.name+' · '+money(b.rate);
 $('payTitle').textContent=b.paid?'Ubah tanggal bayar':'Catat pembayaran lunas';
 $('payModal').showModal();
}
$('payCancel').onclick=()=>$('payModal').close();
$('payForm').onsubmit=async e=>{
 e.preventDefault();if(!cloudReady()||saving)return;
 const day=$('payForm').elements.namedItem('paidAt').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return alert('Pilih tanggal pembayaran.');
 if(day>today)return alert('Tanggal bayar tidak boleh melewati hari ini.');
 const db=data(),b=db.bills[month.value]?.find(x=>x.billId===payId);if(!b)return;
 b.paid=true;b.paidAt=day;
 if(await save(db)){$('payModal').close();render()}
};
form.onsubmit=async e=>{
 e.preventDefault();if(!cloudReady()||saving)return;const db=data(),name=form.room.value.trim(),tenant=form.tenant.value.trim(),rate=Number(form.rate.value),since=tenant?form.since.value:'';
 if(tenant&&!/^\d{4}-\d{2}-\d{2}$/.test(since))return alert('Isi tanggal mulai sewa.');
 if(!name||db.rooms.some(r=>r.id!==editing&&r.name.toLowerCase()===name.toLowerCase()))return alert('Gunakan nama kamar yang unik.');
 const r={id:editing||crypto.randomUUID(),name,tenant,rate,since};
 const old=db.rooms.find(x=>x.id===editing);
 if(old)Object.assign(old,r);else db.rooms.push(r);
 const bills=db.bills[period],bill=bills.find(b=>b.id===r.id&&b.tenant===tenant);
 if(tenant&&!bill)bills.push({...r,billId:crypto.randomUUID(),paid:false});
 else if(bill&&!bill.paid)Object.assign(bill,r);
 if(await save(db)){$('modal').close();render();}
};
const expenseForm=$('expenseForm');
const field=name=>expenseForm.elements.namedItem(name);
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
let expenseId=null;
function renderExpenses(db,selected){
 const entries=db.expenses.filter(x=>x.day.startsWith(selected+'-')).sort((a,b)=>b.day.localeCompare(a.day));
 $('title').textContent='Pengeluaran kos';
 $('subtitle').textContent='Catat biaya operasional kos per bulan.';
 $('listTitle').textContent='Daftar pengeluaran';
 $('count').textContent=entries.length+' item';
 month.hidden=false;
 $('filters').replaceChildren();
 const total=entries.reduce((sum,x)=>sum+x.amount,0);
 $('stats').innerHTML=stat('Total pengeluaran',money(total),'Bulan yang dipilih');
 $('rows').innerHTML=entries.map(x=>'<div class="expenseRow"><div><b>'+safe(x.item)+'</b><small>'+safe(x.category)+' · '+x.day.split('-').reverse().join('/')+'</small></div><strong>'+money(x.amount)+'</strong><button class="edit" data-id="'+safe(x.id)+'">Edit</button></div>').join('')||'<p class="empty">Belum ada pengeluaran pada bulan ini.</p>';
}
function expenseEditor(id=null){
 if(!cloudReady()||saving)return;
 const entry=data().expenses.find(x=>x.id===id);
 expenseId=id;
 expenseForm.reset();
 field('day').max=today;
 const selected=month.value||period;
 field('day').value=selected===period?today:selected+'-01';
 if(entry)for(const key of ['item','category','day','amount'])field(key).value=entry[key];
 $('expenseTitle').textContent=id?'Edit pengeluaran':'Tambah pengeluaran';
 $('expenseModal').showModal();
}
$('expenseCancel').onclick=()=>$('expenseModal').close();
expenseForm.onsubmit=async e=>{
 e.preventDefault();if(!cloudReady()||saving)return;
 const item=field('item').value.trim(),amount=Number(field('amount').value),day=field('day').value;
 if(!item||!Number.isSafeInteger(amount)||amount<1)return alert('Periksa nama item dan jumlah pengeluaran.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return alert('Pilih tanggal pengeluaran.');
 const db=data();
 const entry={id:expenseId||crypto.randomUUID(),item,amount,category:field('category').value,day};
 const index=db.expenses.findIndex(x=>x.id===entry.id);
 if(index>=0)db.expenses[index]=entry;else db.expenses.push(entry);
 if(!await save(db))return;
 month.value=entry.day.slice(0,7);
 $('expenseModal').close();
 render();
};
window.addEventListener('storage',()=>{if(mode.value==='demo')render()});render();initCloud();
(()=>{
 const mine=document.querySelector('script[src^="app.js"]')?.getAttribute('src');
 let checking=false;
 async function checkUpdate(){
  if(checking||saving||document.querySelector('dialog[open]'))return;
  checking=true;
  try{
   const html=await fetch(location.pathname+'?u='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.text():'');
   const latest=html.match(/src="(app\.js\?v=[^"]+)"/)?.[1];
   if(latest&&mine&&latest!==mine)location.replace(location.pathname+'?v='+encodeURIComponent(latest.split('=')[1]));
  }catch{}finally{checking=false}
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate()});
 setTimeout(checkUpdate,3000);
})();
