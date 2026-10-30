// Tes task 5.5: jurnal bayar bill dan penghapusan pembayaran bill.
const fs=require('fs'),vm=require('vm');
const ctx={console,JSON,Date,Math,isFinite,isNaN,Promise,Set,Array,Object,String,Number,localStorage:{getItem:()=>null,setItem:()=>{}},JENIS_JURNAL:{BILL:'Tagihan Pembelian'},billList:[],invoiceList:[],jurnalEntries:[],cloudSyncRecords:()=>Promise.resolve(true)};
vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname+'/../js/31-pembayaran.js','utf8'),ctx);
let run=s=>vm.runInContext(s,ctx), pass=0,fail=0;
function ok(c,m){if(c)pass++;else fail++;console.log((c?'  ok   ':'  GAGAL ')+m)}
const bill={id:'B1',noBill:'BILL-001',supplier:'PT Supplier',tanggal:'2026-10-01',total:1000,sisaTagihan:1000,status:'diterima',akunUtang:'2101'};
const pay={id:'P1',jenis:'bill',dokId:'B1',noDok:'BILL-001',tanggal:'2026-10-05',jumlah:400,akunKas:'1101'};
ctx.__b=bill;ctx.__p=pay;
let r=run('buatJurnalPembayaranBill(__p,__b)');
ok(r.ok,'jurnal bill valid dibuat');
ok(r.jurnal.jenis==='Tagihan Pembelian' && r.jurnal.keterangan==='Pembayaran Tagihan BILL-001 — PT Supplier','jenis dan keterangan jurnal benar');
ok(r.jurnal.lines[0].akun==='2101' && r.jurnal.lines[0].debit===400 && r.jurnal.lines[1].akun==='1101' && r.jurnal.lines[1].kredit===400,'Dr Utang Usaha dan Cr Kas/Bank');
ok(r.jurnal.lines.reduce((s,x)=>s+x.debit,0)===r.jurnal.lines.reduce((s,x)=>s+x.kredit,0),'jurnal seimbang');
ok(!run('buatJurnalPembayaranBill({...__p,akunKas:"2101"},__b)').ok,'akun kas tidak boleh sama dengan akun utang');
ok(!run('buatJurnalPembayaranBill({...__p,jenis:"invoice"},__b)').ok,'menolak pembayaran bukan bill');
ctx.__list=[pay]; ctx.__j=[{no:'JRN-1',jenis:'Tagihan Pembelian',tanggal:pay.tanggal,ket:'Pembayaran Tagihan BILL-001 — PT Supplier',lines:[{akun:'2101',debit:400,kredit:0},{akun:'1101',debit:0,kredit:400}]}];
ok(run('jurnalPembayaranBillStatus(__p,__b,__j,__list).status')==='aktif','jurnal pembayaran bill tertaut dan aktif');
ctx.__bills=[bill]; ctx.__list2=[pay];
r=run('susunHapusPembayaran("P1",__b,__list2,__j)');
ok(r.ok && r.jurnalStatus==='aktif' && r.sisaBaru===1000 && r.statusBaru==='diterima','hapus pembayaran memulihkan sisa dan status tagihan');
// Pembayaran parsial kedua harus tetap bisa disusun saat status menjadi sebagian.
ctx.__b.status='sebagian';ctx.__list2=[pay];
r=run('susunPembayaran({id:"P2",createdAt:"now",tanggal:"2026-10-06",jumlah:100,akunKas:"1101"},__b,__list2,"bill")');
ok(r.ok && r.sisaBaru===500,'pembayaran parsial lanjutan diterima');
console.log(`\n${pass} lulus, ${fail} gagal`); if(fail)process.exit(1);
