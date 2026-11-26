"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  PackageCheck,
  Plus,
  XCircle,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtDate, fmtRp } from "@/lib/shared/format";
import { callOasGlobal, setOasWindowFn } from "@/lib/shared/legacy-store";
import {
  batalkanPesananPembelianStore,
  readPesananPembelianList,
  terimaPesananPembelianStore,
  todayIsoLocal,
  type PesananPembelianRecord,
} from "@/lib/pembelian/pesanan-pembelian";

type FilterStatus = "menunggu" | "diterima" | "semua";

export default function PesananPembelianPage() {
  const [list, setList] = useState<PesananPembelianRecord[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("menunggu");
  const [search, setSearch] = useState("");
  const [detailPo, setDetailPo] = useState<PesananPembelianRecord | null>(null);
  const [receiveTarget, setReceiveTarget] =
    useState<PesananPembelianRecord | null>(null);
  const [receiveDate, setReceiveDate] = useState("");

  const syncList = useCallback(() => {
    setList(readPesananPembelianList());
  }, []);

  useEffect(() => {
    syncList();
    setOasWindowFn(
      "renderPesananPembelianPage",
      syncList as (...args: never[]) => unknown
    );
  }, [syncList]);

  const counts = useMemo(() => {
    const menunggu = list.filter((p) => p.status === "menunggu").length;
    const diterima = list.filter((p) => p.status === "diterima").length;
    const nilaiMenunggu = list
      .filter((p) => p.status === "menunggu")
      .reduce((s, p) => s + p.grandTotal, 0);
    return { menunggu, diterima, total: list.length, nilaiMenunggu };
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      if (filter === "menunggu" && p.status !== "menunggu") return false;
      if (filter === "diterima" && p.status !== "diterima") return false;
      if (q) {
        const hay = `${p.nomor} ${p.pemasokNama} ${p.items
          .map((i) => i.barangNama)
          .join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filter, list, search]);

  const openReceiveModal = (po: PesananPembelianRecord) => {
    if (callOasGlobal("guardHanyaBaca", "Pembelian")) return;
    setReceiveTarget(po);
    setReceiveDate(todayIsoLocal());
  };

  const handleConfirmReceive = () => {
    if (!receiveTarget) return;
    const tgl = receiveDate || todayIsoLocal();
    if (!callOasGlobal("guardPeriode", tgl, "diposting")) return;
    const res = terimaPesananPembelianStore(receiveTarget.id, tgl);
    if (!res.ok) {
      callOasGlobal("showAlert", res.pesan);
      return;
    }
    const po = res.record;
    setReceiveTarget(null);
    syncList();
    callOasGlobal(
      "showAlert",
      po.bayarSaatPesan
        ? `Pesanan ${po.nomor} diterima. Barang masuk ke gudang (pembayaran ${po.akunBayarNama} sudah tercatat saat pemesanan).`
        : `Pesanan ${po.nomor} diterima. Barang masuk ke gudang & saldo ${po.akunBayarNama} dipotong ${fmtRp(po.grandTotal)}.`
    );
  };

  const handleCancelPo = (po: PesananPembelianRecord) => {
    if (callOasGlobal("guardHanyaBaca", "Pembelian")) return;
    const msg = po.bayarSaatPesan
      ? `Batalkan Pesanan Pembelian ${po.nomor}? Dana transfer ${fmtRp(po.grandTotal)} akan dikembalikan ke ${po.akunBayarNama}.`
      : `Batalkan Pesanan Pembelian ${po.nomor}?`;
    const run = () => {
      const res = batalkanPesananPembelianStore(po.id);
      if (!res.ok) {
        callOasGlobal("showAlert", res.pesan);
        return;
      }
      syncList();
      callOasGlobal("showAlert", `Pesanan Pembelian ${po.nomor} dibatalkan.`);
    };
    const showConfirm = (
      window as unknown as { showConfirm?: (m: string, cb: () => void) => void }
    ).showConfirm;
    if (showConfirm) showConfirm(msg, run);
    else if (window.confirm(msg)) run();
  };

  return (
    <div className="page" id="page-pesanan-pembelian" data-react-managed="1">
      {/* Bar Aksi */}
      <div className="section-header page-actions-only" style={{ marginBottom: "14px" }}>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            callOasGlobal("showPage", "pembelian");
            window.setTimeout(() => callOasGlobal("openPembelianTab", "pesanan"), 40);
          }}
        >
          <Plus size={14} /> Buat Pesanan Pembelian
        </button>
      </div>

      {/* KPI Strip */}
      <div className="oas-kpi-strip">
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Menunggu diterima</div>
          <div className="oas-kpi-val num">{counts.menunggu}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Sudah diterima</div>
          <div className="oas-kpi-val num">{counts.diterima}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Nilai pesanan aktif</div>
          <div className="oas-kpi-val num">{fmtRp(counts.nilaiMenunggu)}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Total pesanan</div>
          <div className="oas-kpi-val num">{counts.total}</div>
        </div>
      </div>

      {/* Filter Status (Orias faceted tabs) + Pencarian */}
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
            className={`oas-rak-tab${filter === "menunggu" ? " active" : ""}`}
            onClick={() => setFilter("menunggu")}
          >
            <span>Menunggu</span>
            <span className="oas-tab-count">{counts.menunggu}</span>
          </button>
          <button
            type="button"
            className={`oas-rak-tab${filter === "diterima" ? " active" : ""}`}
            onClick={() => setFilter("diterima")}
          >
            <span>Diterima</span>
            <span className="oas-tab-count">{counts.diterima}</span>
          </button>
          <button
            type="button"
            className={`oas-rak-tab${filter === "semua" ? " active" : ""}`}
            onClick={() => setFilter("semua")}
          >
            <span>Semua</span>
            <span className="oas-tab-count">{counts.total}</span>
          </button>
        </div>

        <input
          type="text"
          placeholder="Cari nomor PO, pemasok, atau barang..."
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

      {/* Tabel Daftar Pesanan Pembelian */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Daftar Pesanan Pembelian</div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nomor PO</th>
                <th>Tanggal</th>
                <th>Pemasok</th>
                <th>Ringkasan Barang</th>
                <th>Metode Pembayaran</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}
                  >
                    <ClipboardList
                      size={26}
                      style={{ marginBottom: "8px", opacity: 0.5 }}
                    />
                    <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                      Belum ada pesanan pembelian
                      {filter !== "semua" ? ` berstatus ${filter}` : ""}.
                    </div>
                    <div style={{ fontSize: "12.5px" }}>
                      Buat pesanan pembelian melalui menu <b>Pembelian → Pesanan Pembelian</b>.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((po) => {
                  const totalQty = po.items.reduce((s, i) => s + i.qty, 0);
                  return (
                    <tr key={po.id}>
                      <td style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>
                        {po.nomor}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>
                        {fmtDate(po.tanggal)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{po.pemasokNama || "Umum"}</td>
                      <td style={{ color: "var(--muted)", fontSize: "12.5px" }}>
                        {po.items.length} jenis · {totalQty.toLocaleString("id-ID")} unit
                      </td>
                      <td>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>
                          {po.metodeBayar === "transfer"
                            ? `Transfer · ${po.akunBayarNama}`
                            : `Kas (${po.akunBayarKode})`}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                          {po.bayarSaatPesan
                            ? "Saldo terpotong saat pesan"
                            : po.status === "diterima"
                              ? "Saldo kas terpotong saat terima"
                              : "Potong kas saat terima"}
                        </div>
                      </td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {fmtRp(po.grandTotal)}
                      </td>
                      <td>
                        {po.status === "menunggu" ? (
                          <span className="badge badge-blue">Menunggu</span>
                        ) : po.status === "diterima" ? (
                          <span className="badge badge-green">
                            Diterima
                            {po.tanggalDiterima ? ` · ${fmtDate(po.tanggalDiterima)}` : ""}
                          </span>
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
                          {po.status === "menunggu" ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openReceiveModal(po)}
                            >
                              <PackageCheck size={14} /> Terima Pesanan
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="oas-icon-dots"
                            title="Lihat rincian pesanan"
                            aria-label={`Detail ${po.nomor}`}
                            onClick={() => setDetailPo(po)}
                          >
                            <Eye size={15} />
                          </button>
                          {po.status === "menunggu" ? (
                            <button
                              type="button"
                              className="oas-icon-dots"
                              title="Batalkan pesanan"
                              aria-label={`Batalkan ${po.nomor}`}
                              onClick={() => handleCancelPo(po)}
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

      {/* Modal Konfirmasi Terima Pesanan */}
      <OasModalDialog
        id="modal-terima-pesanan"
        open={receiveTarget !== null}
        onClose={() => setReceiveTarget(null)}
        maxWidth="540px"
        title={
          receiveTarget ? (
            <>
              Terima Pesanan{" "}
              <span className="oas-ctx-highlight">{receiveTarget.nomor}</span>
            </>
          ) : (
            "Terima Pesanan"
          )
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setReceiveTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-konfirmasi-terima-po"
              className="btn btn-primary"
              onClick={handleConfirmReceive}
            >
              <CheckCircle2 size={14} /> Konfirmasi &amp; Masukkan ke Gudang
            </button>
          </>
        }
      >
        {receiveTarget ? (
          <div>
            <div
              style={{
                padding: "11px 13px",
                borderRadius: "var(--r-control)",
                background: "var(--surface2)",
                border: "1px solid var(--border-strong)",
                marginBottom: "14px",
                fontSize: "13px",
              }}
            >
              {receiveTarget.bayarSaatPesan ? (
                <>
                  Pembayaran via <b>{receiveTarget.akunBayarNama}</b> sebesar{" "}
                  <b className="num">{fmtRp(receiveTarget.grandTotal)}</b>{" "}
                  <b>sudah terpotong</b> saat pesanan dibuat. Konfirmasi ini akan memasukkan
                  seluruh barang ke gudang dan memindahkan Uang Muka (1501) ke Persediaan.
                </>
              ) : (
                <>
                  Metode bayar <b>Cash ({receiveTarget.akunBayarKode} {receiveTarget.akunBayarNama})</b>.
                  Konfirmasi ini akan <b>memotong saldo kas</b> sebesar{" "}
                  <b className="num">{fmtRp(receiveTarget.grandTotal)}</b> sekaligus
                  memasukkan barang ke gudang.
                </>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: "14px", maxWidth: "240px" }}>
              <label htmlFor="po-terima-tgl">Tanggal Penerimaan</label>
              <input
                id="po-terima-tgl"
                type="date"
                data-oas-upgraded="native"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>

            <div style={{ fontSize: "12.5px", fontWeight: 600, marginBottom: "8px" }}>
              Barang yang akan masuk ke gudang:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {receiveTarget.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 12px",
                    borderRadius: "var(--r-control)",
                    border: "1px solid var(--border)",
                    background: "var(--surface2)",
                    fontSize: "13px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.barangNama}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Masuk ke: {item.gudangNama} · {item.rakNama}
                    </div>
                  </div>
                  <div className="num" style={{ fontWeight: 700, flexShrink: 0 }}>
                    +{item.qty.toLocaleString("id-ID")} {item.satuan}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </OasModalDialog>

      {/* Modal Detail Pesanan Pembelian */}
      <OasModalDialog
        id="modal-detail-pesanan"
        open={detailPo !== null}
        onClose={() => setDetailPo(null)}
        maxWidth="660px"
        title={detailPo ? `Detail ${detailPo.nomor}` : "Detail Pesanan"}
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDetailPo(null)}
          >
            Tutup
          </button>
        }
      >
        {detailPo ? (
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
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Pemasok</div>
                <div style={{ fontWeight: 600 }}>{detailPo.pemasokNama || "Umum"}</div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Tanggal Pesan</div>
                <div style={{ fontWeight: 600 }}>{fmtDate(detailPo.tanggal)}</div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Pembayaran</div>
                <div style={{ fontWeight: 600 }}>
                  {detailPo.metodeBayar === "transfer"
                    ? `Transfer · ${detailPo.akunBayarKode} ${detailPo.akunBayarNama}`
                    : `Kas · ${detailPo.akunBayarKode} ${detailPo.akunBayarNama}`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>Total</div>
                <div className="num" style={{ fontWeight: 700, color: "var(--accent-text)" }}>
                  {fmtRp(detailPo.grandTotal)}
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
                  {detailPo.items.map((item) => (
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

            {detailPo.catatan ? (
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "12.5px",
                  color: "var(--muted)",
                }}
              >
                Catatan: {detailPo.catatan}
              </div>
            ) : null}
          </div>
        ) : null}
      </OasModalDialog>
    </div>
  );
}
