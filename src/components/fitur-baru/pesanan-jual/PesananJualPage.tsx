"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  PackageCheck,
  Plus,
  Send,
  Truck,
  XCircle,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtDate, fmtRp } from "@/lib/shared/format";
import { callOasGlobal, setOasWindowFn } from "@/lib/shared/legacy-store";
import { todayIsoLocal } from "@/lib/pembelian/pesanan-pembelian";
import {
  batalkanPesananPenjualanStore,
  kirimPesananPenjualanStore,
  readPesananPenjualanList,
  terimaPesananPenjualanStore,
  type PesananPenjualanRecord,
} from "@/lib/penjualan/pesanan-penjualan";

type FilterStatus = "dikemas" | "menunggu" | "selesai" | "semua";

export function PesananJualPage() {
  const [list, setList] = useState<PesananPenjualanRecord[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("dikemas");
  const [search, setSearch] = useState("");
  const [detailSo, setDetailSo] = useState<PesananPenjualanRecord | null>(null);

  // Modal Kirim (Dikemas -> Menunggu)
  const [shipTarget, setShipTarget] = useState<PesananPenjualanRecord | null>(null);
  const [shipDate, setShipDate] = useState("");
  const [shipResi, setShipResi] = useState("");

  // Modal Diterima (Menunggu -> Selesai)
  const [acceptTarget, setAcceptTarget] =
    useState<PesananPenjualanRecord | null>(null);
  const [acceptDate, setAcceptDate] = useState("");

  const syncList = useCallback(() => {
    setList(readPesananPenjualanList());
  }, []);

  useEffect(() => {
    syncList();
    setOasWindowFn("renderPesananJual", syncList as (...args: never[]) => unknown);
    setOasWindowFn("renderPesananJualList", syncList as (...args: never[]) => unknown);
    setOasWindowFn("renderPesananList", syncList as (...args: never[]) => unknown);
  }, [syncList]);

  const counts = useMemo(() => {
    const dikemas = list.filter((p) => p.status === "dikemas").length;
    const menunggu = list.filter((p) => p.status === "menunggu").length;
    const selesai = list.filter((p) => p.status === "selesai").length;
    const nilaiAktif = list
      .filter((p) => p.status === "dikemas" || p.status === "menunggu")
      .reduce((s, p) => s + p.grandTotal, 0);
    return { dikemas, menunggu, selesai, total: list.length, nilaiAktif };
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      if (filter !== "semua" && p.status !== filter) return false;
      if (q) {
        const hay = `${p.nomor} ${p.pelangganNama} ${p.pengirimanNama} ${p.noResi} ${p.items
          .map((i) => i.barangNama)
          .join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, list, search]);

  const openShipModal = (so: PesananPenjualanRecord) => {
    if (callOasGlobal("guardHanyaBaca", "Penjualan")) return;
    setShipTarget(so);
    setShipDate(todayIsoLocal());
    setShipResi(so.noResi || "");
  };

  const handleConfirmShip = () => {
    if (!shipTarget) return;
    const tgl = shipDate || todayIsoLocal();
    const res = kirimPesananPenjualanStore(shipTarget.id, {
      tanggalKirim: tgl,
      noResi: shipResi,
    });
    if (!res.ok) {
      callOasGlobal("showAlert", res.pesan);
      return;
    }
    const nomor = res.record.nomor;
    setShipTarget(null);
    syncList();
    callOasGlobal(
      "showAlert",
      `Pesanan ${nomor} dikirim. Status berpindah ke Menunggu & stok gudang diperbarui.`
    );
  };

  const openAcceptModal = (so: PesananPenjualanRecord) => {
    if (callOasGlobal("guardHanyaBaca", "Penjualan")) return;
    setAcceptTarget(so);
    setAcceptDate(todayIsoLocal());
  };

  const handleConfirmAccept = () => {
    if (!acceptTarget) return;
    const tgl = acceptDate || todayIsoLocal();
    if (!callOasGlobal("guardPeriode", tgl, "diposting")) return;
    const res = terimaPesananPenjualanStore(acceptTarget.id, tgl);
    if (!res.ok) {
      callOasGlobal("showAlert", res.pesan);
      return;
    }
    const nomor = res.record.nomor;
    setAcceptTarget(null);
    syncList();
    callOasGlobal(
      "showAlert",
      `Pesanan ${nomor} diterima pelanggan. Status berpindah ke Selesai & jurnal penjualan tercatat.`
    );
  };

  const handleCancelSo = (so: PesananPenjualanRecord) => {
    if (callOasGlobal("guardHanyaBaca", "Penjualan")) return;
    const msg = `Batalkan Pesanan Penjualan ${so.nomor}?`;
    const run = () => {
      const res = batalkanPesananPenjualanStore(so.id);
      if (!res.ok) {
        callOasGlobal("showAlert", res.pesan);
        return;
      }
      syncList();
      callOasGlobal("showAlert", `Pesanan Penjualan ${so.nomor} dibatalkan.`);
    };
    const showConfirm = (
      window as unknown as { showConfirm?: (m: string, cb: () => void) => void }
    ).showConfirm;
    if (showConfirm) showConfirm(msg, run);
    else if (window.confirm(msg)) run();
  };

  return (
    <div className="page" id="page-pesanan-jual" data-react-managed="1">
      <div className="section-header page-actions-only" style={{ marginBottom: "14px" }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            callOasGlobal("showPage", "penjualan");
            window.setTimeout(() => callOasGlobal("openPenjualanTab", "pesanan"), 40);
          }}
        >
          <Plus size={14} /> Buat Pesanan Penjualan
        </button>
      </div>

      {/* KPI Strip */}
      <div className="oas-kpi-strip">
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Dikemas</div>
          <div className="oas-kpi-val num">{counts.dikemas}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Menunggu</div>
          <div className="oas-kpi-val num">{counts.menunggu}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Selesai</div>
          <div className="oas-kpi-val num">{counts.selesai}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Nilai pesanan aktif</div>
          <div className="oas-kpi-val num">{fmtRp(counts.nilaiAktif)}</div>
        </div>
      </div>

      {/* Tab Status: Dikemas -> Menunggu -> Selesai -> Semua */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            id="tab-so-dikemas"
            className={`oas-rak-tab${filter === "dikemas" ? " active" : ""}`}
            onClick={() => setFilter("dikemas")}
          >
            <span>Dikemas</span>
            <span className="oas-tab-count">{counts.dikemas}</span>
          </button>
          <button
            type="button"
            id="tab-so-menunggu"
            className={`oas-rak-tab${filter === "menunggu" ? " active" : ""}`}
            onClick={() => setFilter("menunggu")}
          >
            <span>Menunggu</span>
            <span className="oas-tab-count">{counts.menunggu}</span>
          </button>
          <button
            type="button"
            id="tab-so-selesai"
            className={`oas-rak-tab${filter === "selesai" ? " active" : ""}`}
            onClick={() => setFilter("selesai")}
          >
            <span>Selesai</span>
            <span className="oas-tab-count">{counts.selesai}</span>
          </button>
          <button
            type="button"
            id="tab-so-semua"
            className={`oas-rak-tab${filter === "semua" ? " active" : ""}`}
            onClick={() => setFilter("semua")}
          >
            <span>Semua</span>
            <span className="oas-tab-count">{counts.total}</span>
          </button>
        </div>

        <input
          type="text"
          placeholder="Cari nomor SO, pelanggan, kurir, atau resi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: "240px",
            maxWidth: "320px",
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-control)",
            padding: "7px 12px",
            fontSize: "13px",
            color: "var(--text)",
            fontFamily: "var(--sans)",
          }}
        />
      </div>

      {/* Tabel Daftar Pesanan Penjualan */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Daftar Pesanan Penjualan</div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nomor SO</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Ringkasan Barang</th>
                <th>Pengiriman</th>
                <th>Pembayaran</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}
                  >
                    <ClipboardList
                      size={26}
                      style={{ marginBottom: "8px", opacity: 0.5 }}
                    />
                    <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                      Belum ada pesanan penjualan
                      {filter !== "semua" ? ` di daftar ${filter}` : ""}.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((so) => {
                  const totalQty = so.items.reduce((s, i) => s + i.qty, 0);
                  return (
                    <tr key={so.id}>
                      <td style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>
                        {so.nomor}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>
                        {fmtDate(so.tanggal)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{so.pelangganNama || "Umum"}</td>
                      <td style={{ color: "var(--muted)", fontSize: "12.5px" }}>
                        {so.items.length} jenis · {totalQty.toLocaleString("id-ID")} unit
                      </td>
                      <td>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "13px" }}>
                          <Truck size={13} style={{ color: "var(--accent-text)" }} />
                          {so.pengirimanNama || "-"}
                        </div>
                        {so.noResi ? (
                          <div style={{ fontSize: "11.5px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                            Resi: {so.noResi}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {so.metodeBayar === "transfer"
                          ? `Transfer · ${so.akunBayarNama}`
                          : `Kas (${so.akunBayarKode})`}
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {fmtRp(so.grandTotal)}
                      </td>
                      <td>
                        {so.status === "dikemas" ? (
                          <span className="badge badge-blue">Dikemas</span>
                        ) : so.status === "menunggu" ? (
                          <span className="badge badge-yellow">Menunggu</span>
                        ) : so.status === "selesai" ? (
                          <span className="badge badge-green">Selesai</span>
                        ) : (
                          <span className="badge badge-gray">Dibatalkan</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {so.status === "dikemas" ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openShipModal(so)}
                            >
                              <Send size={13} /> Kirim
                            </button>
                          ) : so.status === "menunggu" ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openAcceptModal(so)}
                            >
                              <PackageCheck size={14} /> Diterima
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="oas-icon-dots"
                            title="Lihat detail"
                            aria-label={`Detail ${so.nomor}`}
                            onClick={() => setDetailSo(so)}
                          >
                            <Eye size={15} />
                          </button>
                          {so.status === "dikemas" || so.status === "menunggu" ? (
                            <button
                              type="button"
                              className="oas-icon-dots"
                              title="Batalkan pesanan"
                              aria-label={`Batalkan ${so.nomor}`}
                              onClick={() => handleCancelSo(so)}
                              style={{ color: "var(--red)" }}
                            >
                              <XCircle size={15} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Kirim (Dikemas -> Menunggu) */}
      <OasModalDialog
        id="modal-kirim-so"
        open={shipTarget !== null}
        onClose={() => setShipTarget(null)}
        maxWidth="480px"
        title={
          shipTarget ? (
            <>
              Kirim Pesanan{" "}
              <span className="oas-ctx-highlight">{shipTarget.nomor}</span>
            </>
          ) : (
            "Kirim Pesanan"
          )
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShipTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-konfirmasi-kirim-so"
              className="btn btn-primary"
              onClick={handleConfirmShip}
            >
              <Send size={14} /> Kirim Sekarang
            </button>
          </>
        }
      >
        {shipTarget ? (
          <div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--r-control)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                marginBottom: "14px",
                fontSize: "13px",
              }}
            >
              Pengiriman via{" "}
              <span className="oas-ctx-highlight">
                {shipTarget.pengirimanNama || "-"}
              </span>{" "}
              untuk <b>{shipTarget.pelangganNama || "Umum"}</b>. Stok barang akan
              dikeluarkan dari gudang dan pesanan berpindah ke daftar <b>Menunggu</b>.
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="so-kirim-tgl">Tanggal Kirim</label>
                <input
                  id="so-kirim-tgl"
                  type="date"
                  data-oas-upgraded="native"
                  value={shipDate}
                  onChange={(e) => setShipDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="so-kirim-resi">No. Resi (opsional)</label>
                <input
                  id="so-kirim-resi"
                  type="text"
                  placeholder="Contoh: JP881920312"
                  value={shipResi}
                  onChange={(e) => setShipResi(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}
      </OasModalDialog>

      {/* Modal Diterima (Menunggu -> Selesai) */}
      <OasModalDialog
        id="modal-terima-so"
        open={acceptTarget !== null}
        onClose={() => setAcceptTarget(null)}
        maxWidth="480px"
        title={
          acceptTarget ? (
            <>
              Konfirmasi Diterima{" "}
              <span className="oas-ctx-highlight">{acceptTarget.nomor}</span>
            </>
          ) : (
            "Konfirmasi Diterima"
          )
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAcceptTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-konfirmasi-terima-so"
              className="btn btn-primary"
              onClick={handleConfirmAccept}
            >
              <CheckCircle2 size={14} /> Tandai Diterima
            </button>
          </>
        }
      >
        {acceptTarget ? (
          <div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--r-control)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                marginBottom: "14px",
                fontSize: "13px",
              }}
            >
              Pesanan <b>{acceptTarget.nomor}</b> sebesar{" "}
              <b className="num">{fmtRp(acceptTarget.grandTotal)}</b> akan dipindahkan
              ke daftar <b>Selesai</b> dan dicatat pada jurnal penjualan.
            </div>
            <div className="form-group" style={{ maxWidth: "240px" }}>
              <label htmlFor="so-terima-tgl">Tanggal Diterima</label>
              <input
                id="so-terima-tgl"
                type="date"
                data-oas-upgraded="native"
                value={acceptDate}
                onChange={(e) => setAcceptDate(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </OasModalDialog>

      {/* Modal Detail Pesanan Penjualan */}
      <OasModalDialog
        id="modal-detail-so"
        open={detailSo !== null}
        onClose={() => setDetailSo(null)}
        maxWidth="660px"
        title={
          detailSo ? (
            <>
              Detail <span className="oas-ctx-highlight">{detailSo.nomor}</span>
            </>
          ) : (
            "Detail Pesanan"
          )
        }
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDetailSo(null)}
          >
            Tutup
          </button>
        }
      >
        {detailSo ? (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "10px",
                padding: "12px",
                borderRadius: "var(--r-control)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                marginBottom: "14px",
                fontSize: "13px",
              }}
            >
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Pelanggan</div>
                <div style={{ fontWeight: 600 }}>{detailSo.pelangganNama || "Umum"}</div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Tanggal</div>
                <div style={{ fontWeight: 600 }}>{fmtDate(detailSo.tanggal)}</div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Pengiriman</div>
                <div style={{ fontWeight: 600 }}>
                  {detailSo.pengirimanNama || "-"}
                  {detailSo.noResi ? ` (${detailSo.noResi})` : ""}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Total</div>
                <div className="num" style={{ fontWeight: 700, color: "var(--accent-text)" }}>
                  {fmtRp(detailSo.grandTotal)}
                </div>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Barang</th>
                    <th>Gudang &amp; Rak</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>@Harga</th>
                    <th style={{ textAlign: "right" }}>Diskon</th>
                    <th style={{ textAlign: "right" }}>Pajak</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detailSo.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.barangNama}</td>
                      <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {item.gudangNama} · {item.rakNama}
                      </td>
                      <td className="num">
                        {item.qty} {item.satuan}
                      </td>
                      <td className="num">{fmtRp(item.harga)}</td>
                      <td className="num">
                        {item.diskonTotal > 0 ? `-${fmtRp(item.diskonTotal)}` : "-"}
                      </td>
                      <td className="num">
                        {item.pajakTotal > 0 ? fmtRp(item.pajakTotal) : "-"}
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>
                        {fmtRp(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </OasModalDialog>
    </div>
  );
}
