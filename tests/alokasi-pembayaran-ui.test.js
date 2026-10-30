// Uji integrasi UI penerimaan gabungan task 5.7. Jalankan: node tests/alokasi-pembayaran-ui.test.js
const fs=require('fs'),vm=require('vm'),path=require('path');
const rd=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log((c?'  ok   ':'  GAGAL ')+m);};
const fields={};const alerts=[],modals=[],journals=[],synced=[];
const ctx={console,JSON,Date,Math,isFinite,isNaN,Promise,Set,Map,Number,String,Array,parseFloat,setTimeout:()=>{},
 localStorage:{getItem:()=>null,setItem:()=>{}},
 invoiceList:[
  {id:'I1',noInvoice:'INV-001',pelanggan:'A',tanggal:'2026-10-01',total:100000,sisaTagihan:100000,status:'terkirim',akunPiutang:'1201'},
  {id:'I2',noInvoice:'INV-002',pelanggan:'B',tanggal:'2026-10-02',total:200000,sisaTagihan:200000,status:'terkirim',akunPiutang:'1201'}
 ],billList:[],akuns:[{kode:'1101',nama:'Kas',tipe:'Aset'},{kode:'1201',nama:'Piutang Usaha',tipe:'Aset'}],
 jurnalEntries:[],currentCompany:null,guardHanyaBaca:()=>false,guardPeriode:()=>true,
 document:{getElementById:id=>fields[id]||(fields[id]={value:'',innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){},remove(){}}})},
 showAlert:x=>alerts.push(String(x)),openModal:x=>modals.push('open:'+x),closeModal:x=>modals.push('close:'+x),
 confirm:()=>true,rp:n=>'Rp'+Number(n||0).toLocaleString('id-ID'),escapeHtml:x=>String(x),escapeForJsAttr:x=>String(x),
 upgradeFormPickers:()=>{},renderInvoiceList:()=>{},renderInvoiceKPI:()=>{},cekNotifikasi:()=>{},auditLog:()=>{},saveToStorage:()=>{},
 postJurnalLegacy:j=>{j.no='JRN-'+(journals.length+1);journals.push(j);ctx.jurnalEntries.push(j);return j;},
 cloudSyncRecords:k=>{synced.push(k);return Promise.resolve(true);}
};
vm.createContext(ctx);vm.runInContext(rd('js/31-pembayaran.js'),ctx);vm.runInContext(rd('js/32-pembayaran-ui.js'),ctx);
(async()=>{
ctx.openModalAlokasiPembayaran();
ok(modals.includes('open:modal-alokasi-inv'),'aksi Alokasi Pembayaran membuka modal');
const hostBaris=fields['alokasi-inv-baris'];
const markupAwal=hostBaris.innerHTML;
ok(!markupAwal.includes('>Sisa:'),'teks sisa di bawah field nominal dihilangkan agar sejajar dengan picker');
ok(markupAwal.includes('sisa Rp'),'keterangan sisa tetap tersedia pada option invoice');
fields['alokasi-inv-jumlah'].value='200000';
ctx.ubahAlokasiInvoice(0,'jumlah','12500');
ok(hostBaris.innerHTML===markupAwal,'input nominal tidak me-render ulang baris sehingga fokus/kursor tetap terjaga');
ok(fields['alokasi-inv-total'].innerHTML.includes('12.500'),'ringkasan alokasi diperbarui langsung saat nominal diketik');
ctx.tambahBarisAlokasi();
ctx.ubahAlokasiInvoice(0,'dokId','I1');ctx.ubahAlokasiInvoice(0,'jumlah',75000);
ctx.ubahAlokasiInvoice(1,'dokId','I2');ctx.ubahAlokasiInvoice(1,'jumlah',125000);
fields['alokasi-inv-tgl'].value='2026-10-30';fields['alokasi-inv-jumlah'].value='200000';fields['alokasi-inv-akun'].value='1101';
ctx.simpanAlokasiPembayaran();
await new Promise(resolve=>setImmediate(resolve));
ok(vm.runInContext('pembayaranList.length',ctx)===2,'satu penerimaan menghasilkan dua record pembayaran');
ok(vm.runInContext('pembayaranList.every(p=>p.grupId&&p.grupId===pembayaranList[0].grupId)',ctx),'dua record terhubung dengan grupId yang sama');
ok(vm.runInContext('pembayaranList.reduce((n,p)=>n+p.jumlah,0)',ctx)===200000,'total record sama dengan penerimaan');
ok(ctx.invoiceList[0].sisaTagihan===25000&&ctx.invoiceList[1].sisaTagihan===75000,'sisa masing-masing invoice diperbarui');
ok(journals.length===2&&vm.runInContext('pembayaranList.every(p=>p.jurnalNo)',ctx),'setiap alokasi memiliki jurnal pembayaran');
ok(modals.includes('close:modal-alokasi-inv'),'modal ditutup setelah transaksi berhasil');
console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
