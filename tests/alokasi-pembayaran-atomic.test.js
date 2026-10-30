// Regression 5.7.1: kegagalan di tengah posting atau saat sinkronisasi tidak boleh meninggalkan batch setengah jadi.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const rd=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function env({gagalPostingPada=0,gagalSync=false}={}){
 const fields={},alerts=[],journals=[];let postCount=0;
 const ctx={console,JSON,Date,Math,isFinite,isNaN,Promise,Set,Map,Number,String,Array,parseFloat,setTimeout:()=>{},
  localStorage:{getItem:()=>null,setItem:()=>{}},
  invoiceList:[
   {id:'I1',noInvoice:'INV-001',tanggal:'2026-10-01',total:100000,sisaTagihan:100000,status:'terkirim',akunPiutang:'1201'},
   {id:'I2',noInvoice:'INV-002',tanggal:'2026-10-02',total:200000,sisaTagihan:200000,status:'terkirim',akunPiutang:'1201'}
  ],billList:[],akuns:[{kode:'1101',nama:'Kas'},{kode:'1201',nama:'Piutang'}],jurnalEntries:journals,
  currentCompany:gagalSync?{id:'C1'}:null,guardHanyaBaca:()=>false,guardPeriode:()=>true,
  document:{getElementById:id=>fields[id]||(fields[id]={value:'',innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){},remove(){}}})},
  showAlert:x=>alerts.push(String(x)),openModal:()=>{},closeModal:()=>{},confirm:()=>true,
  rp:n=>'Rp'+Number(n||0).toLocaleString('id-ID'),escapeHtml:x=>String(x),escapeForJsAttr:x=>String(x),
  upgradeFormPickers:()=>{},renderInvoiceList:()=>{},renderInvoiceKPI:()=>{},cekNotifikasi:()=>{},auditLog:()=>{},saveToStorage:()=>{},
  postJurnalLegacy:j=>{postCount++;if(gagalPostingPada===postCount)return null;j.no='JRN-'+postCount;journals.push(j);return j;},
  buatJurnalPembalik:(asal,opsi)=>{const rev={no:'REV-'+asal.no,tanggal:opsi.tanggal,reversalOf:asal.no,lines:asal.lines.map(l=>({akun:l.akun,debit:l.kredit,kredit:l.debit}))};journals.push(rev);return rev;},
  cloudSyncRecords:()=>Promise.resolve(!gagalSync)
 };
 vm.createContext(ctx);vm.runInContext(rd('js/31-pembayaran.js'),ctx);vm.runInContext(rd('js/32-pembayaran-ui.js'),ctx);
 ctx.openModalAlokasiPembayaran();ctx.tambahBarisAlokasi();ctx.ubahAlokasiInvoice(0,'dokId','I1');ctx.ubahAlokasiInvoice(0,'jumlah',75000);ctx.ubahAlokasiInvoice(1,'dokId','I2');ctx.ubahAlokasiInvoice(1,'jumlah',125000);
 fields['alokasi-inv-tgl'].value='2026-10-30';fields['alokasi-inv-jumlah'].value='200000';fields['alokasi-inv-akun'].value='1101';
 return {ctx,alerts,journals};
}
(async()=>{
 // Posting invoice kedua gagal: jurnal invoice pertama langsung dinetralkan, tidak ada alokasi yang dicatat.
 {
  const e=env({gagalPostingPada:2});e.ctx.simpanAlokasiPembayaran();
  assert.equal(vm.runInContext('pembayaranList.length',e.ctx),0);
  assert.equal(e.ctx.invoiceList[0].sisaTagihan,100000);assert.equal(e.ctx.invoiceList[1].sisaTagihan,200000);
  assert.equal(e.journals.length,2);assert.equal(e.journals[1].reversalOf,e.journals[0].no);
  assert.match(e.alerts.at(-1),/sudah dinetralkan/);
 }
 // Sync gagal setelah posting: pembayaran dan invoice dipulihkan; seluruh jurnal yang sudah terbuat dibalik.
 {
  const e=env({gagalSync:true});e.ctx.simpanAlokasiPembayaran();await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(vm.runInContext('pembayaranList.length',e.ctx),0);
  assert.equal(e.ctx.invoiceList[0].sisaTagihan,100000);assert.equal(e.ctx.invoiceList[1].sisaTagihan,200000);
  assert.equal(e.journals.length,4);
  assert.equal(e.journals.filter(j=>j.reversalOf).length,2);
  assert.match(e.alerts.at(-1),/Penyimpanan penerimaan gagal/);
 }
 console.log('alokasi-pembayaran-atomic: 10 assertions passed');
})().catch(e=>{console.error(e);process.exit(1);});
