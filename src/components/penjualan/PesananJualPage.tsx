"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Trash2 } from "lucide-react";
import {
  agingHariIni,
  aksiStatusPesanan,
  bolehHapusPesanan,
  counterSetelahPakai,
  fmtRp,
  hapusDokByIdState,
  hitungTotalDok,
  invoiceDariPesanan,
  perbaruiDokState,
  pesananKeInvoice,
  readCounterList,
  readDokList,
  readInvoiceList,
  setOasWindowFn,
  simpanInvoiceState,
  transisiDok,
  writeCounterList,
  writeInvoiceList,
} from "@/lib";
import type { DokRecord } from "@/types";
import { STATUS_BADGE, type DokLegacyWin } from "./constants";

const getWin = () => window as unknown as DokLegacyWin;

export function PesananJualPage() {
  const [doks, setDoks] = useState<DokRecord[]>([]);
  const [tick, setTick] = useState(0);
  const [readOnly, setReadOnly] = useState(false);

  const syncAll = useCallback(() => {
    setDoks(readDokList().slice());
    setReadOnly(Boolean(getWin().isReadOnly?.()));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    syncAll();
    setOasWindowFn("renderPesananList", syncAll as (...args: never[]) => unknown);
  }, [syncAll]);

  const pesanans = useMemo(() => doks.filter((d) => d.jenis === "pesanan_jual"), [doks]);
  const invoices = useMemo(() => { void tick; return readInvoiceList(); }, [tick]);

  const handleUbahStatus = useCallback(
    (id: string, statusBaru: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("pesanan_jual", "update")) return;
      const dok = readDokList().find((d) => d.id === id);
      if (!dok) return;
      const run = () => {
        const res = transisiDok(dok, statusBaru, { waktu: new Date().toISOString() });
        if (!res.ok) return void w.showAlert?.("⚠️ " + res.pesan);
        perbaruiDokState(res.dok);
        syncAll();
        w.showAlert?.(`Status ${dok.no} diubah menjadi ${statusBaru}.`);
      };
      if (statusBaru === "batal") {
        if (w.showConfirm) w.showConfirm(`Batalkan pesanan ${dok.no}?`, run);
        else run();
      } else {
        run();
      }
    },
    [syncAll]
  );

  const handleBuatInvoice = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("invoice", "create")) return;
      const so = readDokList().find((d) => d.id === id);
      const res = pesananKeInvoice(so, {
        invoices: readInvoiceList(),
        counterList: readCounterList(),
        tanggal: agingHariIni(),
      });
      if (!res.ok) return void w.showAlert?.("⚠️ " + res.pesan);
      const nextInvs = [res.invoice, ...readInvoiceList()];
      writeInvoiceList(nextInvs);
      if (w.catatNomorInvoice) {
        w.catatNomorInvoice(res.invoice.noInvoice);
        void simpanInvoiceState(false);
      } else {
        writeCounterList(counterSetelahPakai(readCounterList(), res.invoice.noInvoice));
        void simpanInvoiceState(true);
      }
      w.renderInvoiceList?.();
      w.renderInvoiceKPI?.();
      syncAll();
      w.showAlert?.(`Draft Invoice ${res.invoice.noInvoice} berhasil dibuat dari ${so?.no}!`);
    },
    [syncAll]
  );

  const handleHapus = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("pesanan_jual", "delete")) return;
      const dok = readDokList().find((d) => d.id === id);
      if (!dok || !bolehHapusPesanan(dok)) return;
      const run = () => {
        hapusDokByIdState(id);
        syncAll();
        w.renderPenawaranList?.();
        w.showAlert?.(`Pesanan ${dok.no} dihapus.`);
      };
      if (w.showConfirm) w.showConfirm(`Hapus pesanan ${dok.no}?`, run);
      else run();
    },
    [syncAll]
  );

  return (
    <div className="page" id="page-pesanan-jual" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">
            <ClipboardList size={15} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
            Pesanan Penjualan
          </div>
          <div className="section-sub">Dibuat dari penawaran disetujui · Dasar faktur penjualan</div>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: "16px" }}>
        <div className="table-header">
          <div className="table-title">
            <ClipboardList size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} />
            Daftar Pesanan Penjualan
          </div>
        </div>
        <div id="pesanan-jual-body">
          {!pesanans.length ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              Belum ada pesanan penjualan. Setujui penawaran lalu klik &quot;Buat Pesanan&quot;.
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>No Pesanan</th><th>Pelanggan</th><th>Ref Penawaran</th><th>Tanggal</th><th>Total</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {pesanans.map((d) => {
                    const tot = hitungTotalDok(d).total;
                    const st = STATUS_BADGE[d.status] || STATUS_BADGE.draft;
                    const aksi = aksiStatusPesanan(d.status);
                    const inv = invoiceDariPesanan(invoices, d.id);
                    return (
                      <tr key={d.id}>
                        <td style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: "12px" }}>{d.no}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{d.kontak}</div>
                          {inv && <div style={{ fontSize: "11px", color: "var(--accent)" }}>Invoice: {inv.noInvoice}</div>}
                        </td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "var(--muted)" }}>{d.refNo || "—"}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap" }}>{d.tanggal}</td>
                        <td style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: "12px" }}>{fmtRp(tot)}</td>
                        <td><span style={{ background: st.bg, color: st.color, fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px" }}>{st.label}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {!readOnly && (d.status === "dikonfirmasi" || d.status === "sebagian") && !inv && (
                              <button className="btn btn-primary btn-sm" type="button" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => handleBuatInvoice(d.id)}>
                                Buat Invoice
                              </button>
                            )}
                            {!readOnly && aksi.map((a) => (
                              <button
                                key={a.ke}
                                className={a.utama ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                                type="button"
                                style={{ padding: "4px 8px", fontSize: "11px", color: a.bahaya ? "var(--danger)" : undefined }}
                                onClick={() => handleUbahStatus(d.id, a.ke)}
                              >
                                {a.label}
                              </button>
                            ))}
                            {!readOnly && bolehHapusPesanan(d) && (
                              <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 6px", color: "var(--danger)" }} title="Hapus" onClick={() => handleHapus(d.id)}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
