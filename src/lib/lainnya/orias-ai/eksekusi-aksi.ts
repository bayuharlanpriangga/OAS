import type {
  AkunTipe,
  AsetTetap,
  AsetTetapMetode,
  Invoice,
  JurnalLine,
  Kontak,
  KontakTipe,
} from "@/types";
import { akunPpnKeluaranKode } from "../../shared/accounting/kode-ppn-keluaran";
import { JENIS_JURNAL, PPN_TARIF_STANDAR, SUMBER_JURNAL } from "../../shared/accounting/constants";
import { hitungPpn } from "../../shared/accounting/hitung-ppn";
import { fmtDate } from "../../shared/format/tanggal";
import { fmtRp } from "../../shared/format/rupiah";
import { addKartuStockOnBuyStore } from "../../kalkulator/persediaan/kartu-stock/masuk-beli";
import { deductKartuStockOnSaleStore } from "../../kalkulator/persediaan/kartu-stock/keluar-jual";
import { readMksMap } from "../../kalkulator/persediaan/kartu-stock/baca-peta";
import { callOasGlobal } from "../../shared/legacy-store/panggil-global";
import { getJurnalSumberAktif } from "../../shared/legacy-store/baca-sumber-jurnal";
import { readAkuns } from "../../shared/legacy-store/baca-akun";
import { readAnggaranList } from "../../shared/legacy-store/baca-anggaran";
import { readAsetTetapList } from "../../shared/legacy-store/baca-aset-tetap";
import { readInvoiceList } from "../../shared/legacy-store/baca-invoice";
import { readKontakList } from "../../shared/legacy-store/baca-kontak";
import { readNotifAlerts } from "../../shared/legacy-store/baca-notifikasi";
import { readProdukList } from "../../shared/legacy-store/baca-produk";
import { setJurnalSumberAktif } from "../../shared/legacy-store/atur-sumber-jurnal";
import { writeAkuns } from "../../shared/legacy-store/tulis-akun";
import { writeAnggaranList } from "../../shared/legacy-store/tulis-anggaran";
import { writeAsetTetapList } from "../../shared/legacy-store/tulis-aset-tetap";
import { writeInvoiceList } from "../../shared/legacy-store/tulis-invoice";
import { writeKontakList } from "../../shared/legacy-store/tulis-kontak";
import { writeNotifAlerts } from "../../shared/legacy-store/tulis-notifikasi";
import { writeProdukList } from "../../shared/legacy-store/tulis-produk";
import { AI_PAGE_NAMES } from "./constants";
import { findKatByNamaPure } from "./cari-kategori-stok";
import { normalizeAiJurnalEntry } from "./normalisasi-jurnal";
import type { AiAction } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isPageActive(id: string): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.getElementById(`page-${id}`)?.classList.contains("active"));
}

async function executeInner(actions: AiAction[]): Promise<string[]> {
  const results: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "addJurnal": {
          const entry = normalizeAiJurnalEntry(action, today);
          if (entry.lines.length < 2) {
            results.push(`Jurnal "${entry.ket}" tidak memiliki minimal 2 baris — dilewati`);
            break;
          }
          if (Math.abs(entry.totalDebit - entry.totalKredit) > 1) {
            results.push(
              `Jurnal "${entry.ket}" tidak balance (Dr:${fmtRp(entry.totalDebit)} ≠ Kr:${fmtRp(entry.totalKredit)}) — dilewati`
            );
            break;
          }
          const allowed = callOasGlobal("guardPeriode", entry.tanggal, "diposting");
          if (allowed === false) {
            results.push("Jurnal dilewati: periode terkunci");
            break;
          }
          callOasGlobal("addJurnal", {
            tanggal: entry.tanggal,
            ket: entry.ket,
            jenis: entry.jenis,
            sumber: entry.sumber,
            lines: entry.lines,
          });
          callOasGlobal("renderDashboard");
          results.push(
            `✓ Jurnal disimpan: ${entry.ket} — ${entry.lines.length} baris (${fmtRp(entry.totalDebit)})`
          );
          break;
        }

        case "navigate": {
          const page = typeof action.page === "string" ? action.page.trim() : "";
          if (page) {
            callOasGlobal("showPage", page);
            results.push(`↔ Berpindah ke: ${AI_PAGE_NAMES[page] || page}`);
          }
          break;
        }

        case "fillKalkPenyusutan": {
          callOasGlobal("showPage", "kalk-penyusutan");
          await sleep(150);
          if (action.nama) callOasGlobal("setVal", "py-nama", String(action.nama));
          if (action.cost !== undefined) callOasGlobal("setVal", "py-cost", String(action.cost));
          if (action.sisa !== undefined) callOasGlobal("setVal", "py-sisa", String(action.sisa));
          if (action.umur !== undefined) callOasGlobal("setVal", "py-umur", String(action.umur));
          if (action.metode) callOasGlobal("setSelectVal", "py-metode", String(action.metode));
          if (action.totalUnit !== undefined) {
            callOasGlobal("setVal", "py-total-unit", String(action.totalUnit));
          }
          callOasGlobal("hitungPenyusutan");
          const costNum = Number(action.cost) || 0;
          results.push(
            `✓ Kalkulator penyusutan diisi: ${String(action.nama || "Aset")} Rp ${costNum.toLocaleString("id-ID")}, ${String(action.umur || "-")} tahun (${String(action.metode || "garis-lurus")})`
          );
          break;
        }

        case "fillKalkBEP": {
          callOasGlobal("showPage", "kalk-bep");
          await sleep(150);
          if (action.harga !== undefined) callOasGlobal("setVal", "bep-harga", String(action.harga));
          if (action.bv !== undefined) callOasGlobal("setVal", "bep-bv", String(action.bv));
          if (action.bt !== undefined) callOasGlobal("setVal", "bep-bt", String(action.bt));
          if (action.vol !== undefined) callOasGlobal("setVal", "bep-vol", String(action.vol));
          if (action.target !== undefined) callOasGlobal("setVal", "bep-target", String(action.target));
          callOasGlobal("hitungBEP");
          const hargaNum = Number(action.harga) || 0;
          const bvNum = Number(action.bv) || 0;
          const btNum = Number(action.bt) || 0;
          const cm = hargaNum - bvNum;
          const bep = cm > 0 ? Math.ceil(btNum / cm) : 0;
          results.push(
            `✓ Kalkulator BEP diisi: Harga Rp ${hargaNum.toLocaleString("id-ID")}, BV Rp ${bvNum.toLocaleString("id-ID")}, BT Rp ${btNum.toLocaleString("id-ID")} → BEP = ${bep.toLocaleString("id-ID")} unit`
          );
          break;
        }

        case "fillKalkAnuitas": {
          callOasGlobal("showPage", "kalk-bunga");
          await sleep(200);
          const anuitasTab =
            typeof document !== "undefined"
              ? document.querySelector("#bunga-tabs .tab:nth-child(2)")
              : null;
          if (anuitasTab) {
            callOasGlobal("switchBungaTab", "anuitas", anuitasTab);
          } else {
            callOasGlobal("switchBungaTab", "anuitas");
          }
          await sleep(100);
          if (action.pokok !== undefined) callOasGlobal("setVal", "an-pokok", String(action.pokok));
          if (action.rate !== undefined) callOasGlobal("setVal", "an-rate", String(action.rate));
          if (action.tenor !== undefined) callOasGlobal("setVal", "an-tenor", String(action.tenor));
          if (action.jenis) callOasGlobal("setSelectVal", "an-jenis", String(action.jenis));
          if (action.dp !== undefined) callOasGlobal("setVal", "an-dp", String(action.dp));
          callOasGlobal("hitungAnuitas");
          const pokokNum = Number(action.pokok) || 0;
          results.push(
            `✓ Kalkulator anuitas diisi: Pokok Rp ${pokokNum.toLocaleString("id-ID")}, ${String(action.rate || 0)}%/tahun, ${String(action.tenor || 0)} bulan`
          );
          break;
        }

        case "addAkun": {
          const kode = typeof action.kode === "string" ? action.kode.trim() : "";
          const nama = typeof action.nama === "string" ? action.nama.trim() : "";
          if (!kode || !nama) break;
          const list = readAkuns().slice();
          if (list.find((a) => a.kode === kode)) {
            results.push(`ℹ Akun ${kode} sudah ada`);
            break;
          }
          const tipeRaw = typeof action.tipe === "string" ? action.tipe : "Beban";
          const tipe = (
            ["Aset", "Liabilitas", "Ekuitas", "Pendapatan", "HPP", "Beban"].includes(tipeRaw)
              ? tipeRaw
              : "Beban"
          ) as AkunTipe;
          const normal = ["Aset", "Beban", "HPP"].includes(tipe) ? "D" : "K";
          list.push({
            kode,
            nama,
            tipe,
            kat: typeof action.kat === "string" ? action.kat : "",
            normal,
          });
          list.sort((a, b) => a.kode.localeCompare(b.kode));
          writeAkuns(list);
          callOasGlobal("saveToStorage", false);
          if (isPageActive("akun")) callOasGlobal("renderAkun");
          results.push(`✓ Akun baru ditambahkan: ${kode} - ${nama}`);
          break;
        }

        case "addKartuStock": {
          const found = findKatByNamaPure(readMksMap(), action.produk);
          if (!found) {
            results.push(
              `⚠ Produk "${String(action.produk || "")}" tidak ditemukan di Kartu Stock — dilewati`
            );
            break;
          }
          const tgl = typeof action.tanggal === "string" && action.tanggal ? action.tanggal : today;
          const qty = Number(action.qty) || 0;
          if (qty <= 0) {
            results.push(`⚠ Qty tidak valid untuk "${found.kat.nama}"`);
            break;
          }
          const ket = typeof action.ket === "string" && action.ket ? action.ket : "Dari AI";
          if (action.jenis === "masuk") {
            const harga = Number(action.harga) || 0;
            addKartuStockOnBuyStore(found.katId, qty, harga, tgl, ket);
            results.push(
              `✓ Kartu Stock ${found.kat.nama}: masuk ${qty} unit @ ${fmtRp(harga)}`
            );
          } else if (action.jenis === "keluar") {
            const hasil = deductKartuStockOnSaleStore(found.katId, qty, tgl, ket);
            if (hasil.qtySell < qty) {
              results.push(
                `⚠ Stok "${found.kat.nama}" hanya tersedia ${hasil.qtySell} unit (diminta ${qty})`
              );
            }
            results.push(
              `✓ Kartu Stock ${found.kat.nama}: keluar ${hasil.qtySell} unit, total HPP ${fmtRp(hasil.hppBatch)}`
            );
          } else {
            results.push(`⚠ Jenis aksi Kartu Stock tidak dikenal: ${String(action.jenis || "")}`);
            break;
          }
          if (isPageActive("kalk-persediaan")) callOasGlobal("renderKartuStock");
          if (isPageActive("produk")) callOasGlobal("renderProduk");
          break;
        }

        case "addKontak": {
          const nama = typeof action.nama === "string" ? action.nama.trim() : "";
          if (!nama) {
            results.push("Nama kontak wajib diisi — dilewati");
            break;
          }
          const list = readKontakList().slice();
          const existingIdx = list.findIndex(
            (k) => k.nama.toLowerCase() === nama.toLowerCase()
          );
          const existing = existingIdx >= 0 ? list[existingIdx] : undefined;
          const tipeRaw = typeof action.tipe === "string" ? action.tipe : "pelanggan";
          const tipe = (
            ["pelanggan", "supplier", "keduanya"].includes(tipeRaw) ? tipeRaw : "pelanggan"
          ) as KontakTipe;
          const kontak: Kontak = {
            id:
              existing?.id ||
              `KTK_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nama,
            tipe,
            telp: typeof action.telp === "string" ? action.telp : "",
            email: typeof action.email === "string" ? action.email : "",
            alamat: typeof action.alamat === "string" ? action.alamat : "",
            npwp: typeof action.npwp === "string" ? action.npwp : "",
            pic: typeof action.pic === "string" ? action.pic : "",
            catatan: typeof action.catatan === "string" ? action.catatan : "",
            createdAt: existing?.createdAt || new Date().toISOString(),
          };
          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...kontak };
          } else {
            list.unshift(kontak);
          }
          writeKontakList(list);
          callOasGlobal("saveFiturBaru");
          if (isPageActive("kontak")) {
            callOasGlobal("renderKontak");
            callOasGlobal("renderKontakKPI");
          }
          results.push(
            `✓ Kontak ${existing ? "diperbarui" : "ditambahkan"}: ${kontak.nama} (${kontak.tipe})`
          );
          break;
        }

        case "addAsetTetap": {
          const nama = typeof action.nama === "string" ? action.nama.trim() : "";
          const harga = Number(action.harga) || 0;
          if (!nama || !harga) {
            results.push("Nama aset dan harga perolehan wajib diisi — dilewati");
            break;
          }
          const metodeRaw = typeof action.metode === "string" ? action.metode : "garis-lurus";
          const metode = (
            ["garis-lurus", "saldo-menurun", "sum-of-years", "unit-produksi"].includes(
              metodeRaw
            )
              ? metodeRaw
              : "garis-lurus"
          ) as AsetTetapMetode;
          const aset: AsetTetap = {
            id: `AT_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nama,
            hargaPerolehan: harga,
            kategori: typeof action.kategori === "string" ? action.kategori : "Peralatan",
            tglPerolehan:
              typeof action.tglPerolehan === "string" && action.tglPerolehan
                ? action.tglPerolehan
                : today,
            nilaiResidu: Number(action.residu) || 0,
            umurEkonomis: Number(action.umur) || 5,
            metode,
            lokasi: typeof action.lokasi === "string" ? action.lokasi : "",
            status: "aktif",
            createdAt: new Date().toISOString(),
          };
          const list = [aset, ...readAsetTetapList()];
          writeAsetTetapList(list);
          callOasGlobal("saveToStorage", false);
          callOasGlobal("saveFiturBaru");
          if (isPageActive("aset-tetap")) {
            callOasGlobal("renderAsetTetap");
            callOasGlobal("renderAsetTetapKPI");
          }
          callOasGlobal("renderDashboard");
          results.push(
            `✓ Aset tetap ditambahkan: ${aset.nama} — ${fmtRp(aset.hargaPerolehan)}, ${aset.umurEkonomis} tahun (${aset.metode})`
          );
          break;
        }

        case "setAnggaran": {
          const akunKode =
            typeof action.akunKode === "string" ? action.akunKode.trim() : "";
          const periode =
            typeof action.periode === "string" ? action.periode.trim() : "";
          const nominal = Number(action.nominal) || 0;
          if (!akunKode || !periode || !nominal) {
            results.push("Akun, periode, dan nominal anggaran wajib diisi — dilewati");
            break;
          }
          const akuns = readAkuns();
          const akunNm = akuns.find((a) => a.kode === akunKode)?.nama || akunKode;
          const list = readAnggaranList().slice();
          const existIdx = list.findIndex(
            (a) => a.akunKode === akunKode && a.periode === periode
          );
          const item = {
            id: `ang_${Date.now()}`,
            akunKode,
            periode,
            nominal,
            catatan: typeof action.catatan === "string" ? action.catatan : "",
          };
          if (existIdx >= 0) list[existIdx] = item;
          else list.push(item);
          writeAnggaranList(list);
          callOasGlobal("saveFiturBaru");
          if (isPageActive("anggaran")) callOasGlobal("renderAnggaranPage");
          results.push(
            `✓ Anggaran diset: ${akunNm} periode ${item.periode} — ${fmtRp(item.nominal)}`
          );
          break;
        }

        case "setHargaProduk": {
          const found = findKatByNamaPure(readMksMap(), action.produk);
          if (!found) {
            results.push(
              `⚠ Produk "${String(action.produk || "")}" tidak ditemukan di Kartu Stock — dilewati`
            );
            break;
          }
          const hargaJual = Number(action.hargaJual) || 0;
          const ppn =
            action.ppn !== undefined && action.ppn !== null && action.ppn !== ""
              ? Number(action.ppn)
              : null;
          const ppnInclusive = Boolean(action.ppnInclusive);
          const list = readProdukList().slice();
          const idx = list.findIndex((p) => p.ksId === found.katId);
          const data = { ksId: found.katId, hargaJual, ppn, ppnInclusive };
          if (idx >= 0) list[idx] = { ...list[idx], ...data };
          else list.push(data);
          writeProdukList(list);
          callOasGlobal("saveToStorage", false);
          if (isPageActive("produk")) callOasGlobal("renderProduk");
          results.push(
            `✓ Harga produk ${found.kat.nama} diset: ${fmtRp(hargaJual)}${
              ppn != null ? ` (PPN ${ppn}%${ppnInclusive ? " inclusive" : ""})` : ""
            }`
          );
          break;
        }

        case "addInvoice": {
          const pelanggan =
            typeof action.pelanggan === "string" ? action.pelanggan.trim() : "";
          const rawItems = Array.isArray(action.items) ? action.items : [];
          if (!pelanggan || rawItems.length === 0) {
            results.push("Pelanggan dan minimal 1 item invoice wajib diisi — dilewati");
            break;
          }
          const items = rawItems.map((it) => {
            const rec = (typeof it === "object" && it !== null ? it : {}) as Record<
              string,
              unknown
            >;
            return {
              nama: typeof rec.nama === "string" ? rec.nama : "Item",
              qty: Number(rec.qty) || 1,
              harga: Number(rec.harga) || 0,
            };
          });
          const subtotal = items.reduce((s, it) => s + it.qty * it.harga, 0);
          const ppnOn = Boolean(action.ppn);
          const tarifInput =
            action.ppnTarif === undefined ||
            action.ppnTarif === null ||
            Number.isNaN(Number(action.ppnTarif))
              ? PPN_TARIF_STANDAR
              : Number(action.ppnTarif);
          const ppnNom = ppnOn ? hitungPpn(subtotal, tarifInput) : 0;
          const total = subtotal + ppnNom;
          const status = action.status === "terkirim" ? "terkirim" : "draft";
          const akuns = readAkuns();
          const akunPiutang =
            (typeof action.akunPiutang === "string" && action.akunPiutang) ||
            akuns.find((a) => a.nama.toLowerCase().includes("piutang"))?.kode ||
            "";
          const akunPend =
            (typeof action.akunPend === "string" && action.akunPend) ||
            akuns.find((a) => a.kode === "4101")?.kode ||
            "";
          const tgl =
            typeof action.tanggal === "string" && action.tanggal ? action.tanggal : today;
          const noInv =
            (typeof action.noInvoice === "string" && action.noInvoice) ||
            String(
              callOasGlobal("nomorInvoiceBerikut", new Date(tgl).getFullYear()) ||
                `INV-${Date.now()}`
            );

          const inv: Invoice = {
            id: `INV_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            noInvoice: noInv,
            pelanggan,
            tanggal: tgl,
            jatuhTempo:
              typeof action.jatuhTempo === "string" && action.jatuhTempo
                ? action.jatuhTempo
                : tgl,
            deskripsi: typeof action.deskripsi === "string" ? action.deskripsi : "",
            items,
            subtotal,
            ppn: ppnNom,
            total,
            sisaTagihan: total,
            status,
            akunPiutang,
            akunPend,
            createdAt: new Date().toISOString(),
          };

          if (status === "terkirim" && akunPiutang && akunPend) {
            const lines: JurnalLine[] = [
              { akun: akunPiutang, ket: "", debit: total, kredit: 0 },
              { akun: akunPend, ket: "", debit: 0, kredit: subtotal },
            ];
            if (ppnNom > 0) {
              lines.push({
                akun: akunPpnKeluaranKode(akuns),
                ket: `Utang PPN Keluaran ${tarifInput}%`,
                debit: 0,
                kredit: ppnNom,
              });
            }
            const posted = callOasGlobal("postJurnalLegacy", {
              id: `JRN_INV_${Date.now()}`,
              tanggal: inv.tanggal,
              jenis: JENIS_JURNAL.INVOICE,
              keterangan: `Invoice ${inv.noInvoice} — ${inv.pelanggan}`,
              sumber: SUMBER_JURNAL.ORIAS_AI,
              _ppnTarif: ppnNom > 0 ? tarifInput : undefined,
              lines: lines.filter((l) => l.akun),
            });
            if (!posted) {
              results.push(`Invoice dilewati: periode ${fmtDate(inv.tanggal)} sudah dikunci`);
              break;
            }
            callOasGlobal("saveToStorage", false);
          }

          writeInvoiceList([inv, ...readInvoiceList()]);
          callOasGlobal("catatNomorInvoice", inv.noInvoice);
          callOasGlobal("saveFiturBaru");
          if (isPageActive("invoice")) {
            callOasGlobal("renderInvoiceList");
            callOasGlobal("renderInvoiceKPI");
          }
          callOasGlobal("cekNotifikasi");
          results.push(
            `✓ Invoice ${inv.noInvoice} (${status}) untuk ${inv.pelanggan} — ${fmtRp(total)}`
          );
          break;
        }

        case "addAlertNotifikasi": {
          const nama = typeof action.nama === "string" ? action.nama.trim() : "";
          if (!nama) {
            results.push("Nama alert wajib diisi — dilewati");
            break;
          }
          const list = readNotifAlerts().slice();
          list.push({
            id: `alert_${Date.now()}`,
            nama,
            tipe: typeof action.tipe === "string" ? action.tipe : "saldo-minimum",
            batas: action.batas != null ? Number(action.batas) : null,
            akun: typeof action.akun === "string" ? action.akun : null,
            aktif: true,
            createdAt: new Date().toISOString(),
          });
          writeNotifAlerts(list);
          callOasGlobal("saveFiturBaru");
          if (isPageActive("notifikasi")) callOasGlobal("renderNotifikasiPage");
          callOasGlobal("cekNotifikasi");
          results.push(`✓ Alert notifikasi ditambahkan: ${nama}`);
          break;
        }

        case "showAlert": {
          callOasGlobal("showAlert", String(action.msg || "✓ Selesai"));
          break;
        }

        default:
          results.push(`⚠ Aksi tidak dikenal: ${action.type}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push(`Error pada aksi ${action.type}: ${msg}`);
    }
  }

  return results;
}

export async function executeOasAiActions(actions: AiAction[]): Promise<string[]> {
  const prevSumber = getJurnalSumberAktif();
  setJurnalSumberAktif(SUMBER_JURNAL.ORIAS_AI);
  try {
    return await executeInner(actions);
  } finally {
    setJurnalSumberAktif(prevSumber);
  }
}
