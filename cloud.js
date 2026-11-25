const cloud = window.supabase.createClient(
 'https://kwhtqqrzeifmntdtugvg.supabase.co',
 'sb_publishable_JGQ9jpXgEb3IMl0YjY3Txg_cQKy02Fs',
 {auth:{storageKey:'kos-puji-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}
);
let cloudRecord=null;
let session=null;
let saving=false;
let loading=false;
let cloudError='';
let authGeneration=0;

function notice(message){
 $('syncStatus').textContent=message;
}
function cloudReady(){
 return mode.value==='demo'||Boolean(session&&cloudRecord);
}
function showAccess(){
 const real=mode.value==='real';
 $('loginPanel').hidden=!real||Boolean(session);
 $('workspace').hidden=real&&!cloudRecord;
 $('logout').hidden=!session;
 $('changePassword').hidden=!session;
 $('account').textContent=session?.user?.email||'Pengelola';
 $('account').title=session?.user?.email||'';
 document.body.classList.toggle('signedOut',real&&!session);
 $('refresh').hidden=!real||!session;
 $('importLocal').hidden=!real||!cloudRecord||!localStorage.getItem('kos-puji-v1-real');
 if(real)notice(cloudError||(!session?'Masuk untuk mengakses data Kos Puji.':!cloudRecord?'Memuat data…':'Tersimpan di Supabase'));
 else notice('Mode contoh · tersimpan di browser ini');
}
function authMessage(error){
 const code=error?.code||'', msg=(error?.message||'').toLowerCase(), status=error?.status;
 if(!navigator.onLine||msg.includes('failed to fetch')||msg.includes('network'))return 'Tidak ada koneksi internet. Periksa sinyal lalu coba lagi.';
 if(status===429||code==='over_request_rate_limit'||msg.includes('rate limit'))return 'Terlalu banyak percobaan. Tunggu sekitar 5 menit lalu coba lagi.';
 if(code==='invalid_credentials'||msg.includes('invalid login'))return 'Email atau kata sandi salah. Perhatikan huruf besar/kecil pada kata sandi.';
 if(code==='email_not_confirmed'||msg.includes('not confirmed'))return 'Email akun ini belum dikonfirmasi. Buka email konfirmasi dari Supabase terlebih dahulu.';
 if(code==='same_password')return 'Kata sandi baru harus berbeda dari kata sandi lama.';
 if(code==='weak_password'||msg.includes('password should'))return 'Kata sandi baru terlalu lemah. Gunakan minimal 8 karakter campuran huruf dan angka.';
 return error?.message||'Terjadi kesalahan. Coba lagi.';
}
async function refreshCloud(){
 if(loading||saving||document.querySelector('dialog[open]'))return;
 loading=true;
 const generation=authGeneration;
 try{
  const result=await cloud.auth.getSession();
  if(result.error)throw result.error;
  if(generation!==authGeneration)return;
  session=result.data.session;
  if(!session){cloudRecord=null;return}
  const {data:row,error}=await cloud.from('kos_puji_data').select('*').eq('user_id',session.user.id).maybeSingle();
  if(error)throw error;
  if(generation!==authGeneration)return;
  if(!row)throw new Error('Akun ini belum memiliki akses owner Kos Puji. Gunakan akun owner Kos Puji yang terdaftar.');
  cloudRecord=row;
  cloudError='';
 }catch(error){
  cloudError=error.message&&!/fetch|network/i.test(error.message)?error.message:'Gagal memuat data. Periksa koneksi lalu tekan Muat ulang.';
 }finally{
  loading=false;
  showAccess();
  render();
 }
}
async function save(db){
 if(saving)return false;
 saving=true;
 document.querySelectorAll('form button[type="submit"], form button.primary').forEach(b=>b.disabled=true);
 const isCloud=mode.value==='real';
 try{
  if(!isCloud){
   localStorage.setItem('kos-puji-v1-demo',JSON.stringify(db));
   return true;
  }
  if(!session||!cloudRecord)throw new Error('Masuk sebagai owner terlebih dahulu.');
  notice('Menyimpan…');
  const revision=cloudRecord.revision;
  const {data:rows,error}=await cloud.from('kos_puji_data')
   .update({payload:db,revision:revision+1,updated_at:new Date().toISOString()})
   .eq('user_id',session.user.id).eq('revision',revision).select('*');
  if(error)throw error;
  if(rows.length!==1){
   throw new Error('Data berubah di perangkat lain. Tutup formulir, tekan Muat ulang, lalu ulangi perubahan.');
  }
  cloudRecord=rows[0];
  cloudError='';
  notice('Tersimpan di Supabase');
  return true;
 }catch(error){
  notice('Perubahan belum tersimpan');
  alert(error.message||'Gagal menyimpan. Periksa koneksi lalu coba lagi.');
  return false;
 }finally{
  saving=false;
  document.querySelectorAll('form button[type="submit"], form button.primary').forEach(b=>b.disabled=false);
 }
}
async function initCloud(){
 $('loginForm').onsubmit=async e=>{
  e.preventDefault();
  const f=e.currentTarget;
  const button=f.querySelector('button');
  button.disabled=true;
  $('loginError').textContent='';
  try{
   const {error}=await cloud.auth.signInWithPassword({
    email:f.elements.email.value.trim().toLowerCase(),password:f.elements.password.value
   });
   if(error)throw error;
   f.elements.password.value='';
   await refreshCloud();
  }catch(error){
   $('loginError').textContent=authMessage(error);
  }finally{button.disabled=false}
 };
 $('logout').onclick=async()=>{
  if(saving)return;
  const {error}=await cloud.auth.signOut({scope:'local'});
  if(error){alert('Gagal keluar. Coba lagi.');return}
  authGeneration++;
  session=null;cloudRecord=null;cloudError='';
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  showAccess();render();
 };
 $('refresh').onclick=refreshCloud;
 document.addEventListener('click',e=>{
  const b=e.target.closest('.showPw');if(!b)return;
  const input=b.previousElementSibling,show=input.type==='password';
  input.type=show?'text':'password';b.textContent=show?'Tutup':'Lihat';
 });
 const pf=$('passwordForm');
 $('changePassword').onclick=()=>{
  if(!session||saving)return;
  pf.reset();$('passwordError').textContent='';
  pf.querySelectorAll('.showPw').forEach(b=>{b.textContent='Lihat';b.previousElementSibling.type='password'});
  $('passwordAccount').textContent='Akun: '+session.user.email;
  $('passwordModal').showModal();
 };
 $('passwordCancel').onclick=()=>$('passwordModal').close();
 pf.onsubmit=async e=>{
  e.preventDefault();
  const f=pf.elements,button=pf.querySelector('button[type="submit"]'),out=$('passwordError');
  out.textContent='';
  if(!f.current.value)return out.textContent='Isi kata sandi saat ini.';
  if(f.next.value.length<8)return out.textContent='Kata sandi baru minimal 8 karakter.';
  if(f.next.value!==f.confirm.value)return out.textContent='Ulangan kata sandi baru tidak sama.';
  if(f.next.value===f.current.value)return out.textContent='Kata sandi baru harus berbeda dari kata sandi lama.';
  button.disabled=true;
  try{
   const email=session.user.email;
   const check=await cloud.auth.signInWithPassword({email,password:f.current.value});
   if(check.error){
    throw check.error.code==='invalid_credentials'||/invalid login/i.test(check.error.message)
     ?new Error('Kata sandi saat ini salah.'):check.error;
   }
   const {error}=await cloud.auth.updateUser({password:f.next.value});
   if(error)throw error;
   pf.reset();
   $('passwordModal').close();
   alert('Kata sandi berhasil diganti. Gunakan kata sandi baru saat masuk berikutnya.');
  }catch(error){
   out.textContent=error.message==='Kata sandi saat ini salah.'?error.message:authMessage(error);
  }finally{button.disabled=false}
 };
 $('importLocal').onclick=async()=>{
  if(saving||!cloudRecord)return;
  const current=cloudRecord.payload;
  if(current.rooms.length||current.expenses.length||Object.values(current.bills).some(x=>x.length)){
   alert('Data Supabase sudah terisi. Impor otomatis hanya tersedia saat data masih kosong agar catatan tidak tertimpa.');
   return;
  }
  try{
   const old=JSON.parse(localStorage.getItem('kos-puji-v1-real'));
   old.expenses??=[];
   if(!validLegacy(old))throw new Error('Format data lama tidak valid.');
   if(!confirm('Salin data Kos Puji dari browser ini ke akun owner di Supabase?'))return;
   if(await save(old)){render();showAccess();alert('Data lama berhasil disalin ke Supabase.')}
  }catch(error){alert(error.message)}
 };
 cloud.auth.onAuthStateChange((event,next)=>{
  if(event==='SIGNED_OUT'){
   authGeneration++;
   session=null;cloudRecord=null;
   document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   showAccess();render();
  }else if(event==='SIGNED_IN'){
   setTimeout(refreshCloud,0);
  }
 });
 await refreshCloud();
 setInterval(()=>{if(mode.value==='real')refreshCloud()},60000);
 window.addEventListener('focus',()=>{if(mode.value==='real')refreshCloud()});
}
function validLegacy(db){
 const room=r=>r&&typeof r.id==='string'&&typeof r.name==='string'
  &&typeof r.tenant==='string'&&Number.isSafeInteger(r.rate)&&r.rate>0;
 return db&&Array.isArray(db.rooms)&&db.rooms.every(room)
  &&db.bills&&typeof db.bills==='object'&&!Array.isArray(db.bills)
  &&Object.entries(db.bills).every(([month,rows])=>/^\d{4}-\d{2}$/.test(month)
   &&Array.isArray(rows)&&rows.every(r=>room(r)&&typeof r.billId==='string'&&typeof r.paid==='boolean'))
  &&Array.isArray(db.expenses)&&db.expenses.every(e=>e&&typeof e.id==='string'
   &&typeof e.item==='string'&&typeof e.category==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.day)
   &&Number.isSafeInteger(e.amount)&&e.amount>0);
}
