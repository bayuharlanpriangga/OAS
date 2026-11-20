"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  Info,
  Package,
  Pencil,
  Save,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtRp } from "@/lib/format";
import { callOasGlobal } from "@/lib/legacy-store";
import {
  readMultiKartuStock,
  readProdukList,
  setOasWindowFn,
  writeProdukList,
  type KsCardRecord,
  type KsKategoriRecord,
  type KsSaldoSummary,
} from "@/lib/legacy-store";
import type { Produk } from "@/types";

interface ProdukRowItem extends KsKategoriRecord {
  _cardNama: string;
  _cardId: string;
}

const METODE_LABEL: Record<string, string> = {
  fifo: "FIFO",
  lifo: "LIFO",
  wa: "Weighted Avg",
  mwa: "Moving WA",
};

const METODE_FULL_LABEL: Record<string, string> = {
  fifo: "FIFO",
  lifo: "LIFO",
  wa: "Weighted Average",
  mwa: "Moving WA",
};

const METODE_BADGE_STYLE: Record<string, CSSProperties> = {
  fifo: {
    background: "rgba(74,222,128,0.12)",
    color: "var(--accent)",
    border: "1px solid rgba(74,222,128,0.3)",
  },
  lifo: {
    background: "rgba(34,211,238,0.12)",
    color: "var(--accent2)",
    border: "1px solid rgba(34,211,238,0.3)",
  },
  wa: {
    background: "rgba(245,158,11,0.12)",
    color: "var(--accent3)",
    border: "1px solid rgba(245,158,11,0.3)",
  },
  mwa: {
    background: "rgba(245,158,11,0.12)",
    color: "var(--accent3)",
    border: "1px solid rgba(245,158,11,0.3)",
  },
};

function readKsSaldo(ks: KsKategoriRecord): KsSaldoSummary {
  const res = callOasGlobal("getKsSaldo", ks);
  if (res && typeof res === "object") return res as KsSaldoSummary;
  return {
    totalQty: 0,
    hppNext: 0,
    totalNilai: 0,
    metode: ks.metode || "fifo",
    layers: [],
  };
}

export default function ProdukPage() {
  const [cards, setCards] = useState<KsCardRecord[]>([]);
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [filterCardId, setFilterCardId] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<{
    katId: string;
    ks: KsKategoriRecord;
    saldo: KsSaldoSummary;
  } | null>(null);
  const [hargaJual, setHargaJual] = useState("");
  const [ppnText, setPpnText] = useState("");
  const [ppnInclusive, setPpnInclusive] = useState(false);

  const syncFromStore = useCallback(() => {
    const map = readMultiKartuStock();
    setCards(Object.values(map));
    setProdukList([...readProdukList()]);
    setRevision((r) => r + 1);
  }, []);

  const openEditModal = useCallback((katId: string, cardId?: string) => {
    const map = readMultiKartuStock();
    const card = cardId ? map[cardId] : undefined;
    const ks =
      card?.kategori?.[katId] ||
      (map[katId] as unknown as KsKategoriRecord | undefined) ||
      Object.values(map)
        .map((c) => c.kategori?.[katId])
        .find(Boolean);
    if (!ks) return;

    const override = readProdukList().find((p) => p.ksId === katId);
    const saldo = readKsSaldo(ks);

    setEditTarget({ katId, ks, saldo });
    setHargaJual(override?.hargaJual ? String(override.hargaJual) : "");
    setPpnText(override?.ppn != null ? String(override.ppn) : "");
    setPpnInclusive(!!override?.ppnInclusive);
  }, []);

  const openFilterCardPicker = useCallback(() => {
    const allCards = Object.values(readMultiKartuStock());
    callOasGlobal("openOptPicker", {
      title: "Filter Kartu Stock",
      options: [
        {
          value: "",
          label: "Semua Kartu",
          sub: "Tampilkan semua kategori",
        },
        ...allCards.map((c) => ({
          value: c.id,
          label: c.nama,
          sub: `${Object.keys(c.kategori || {}).length} kategori`,
        })),
      ],
      currentValue: filterCardId,
      onSelect: (val: string) => {
        setFilterCardId(val || "");
      },
    });
  }, [filterCardId]);

  const handleSimpan = useCallback(() => {
    if (!editTarget) return;
    const { katId, ks } = editTarget;
    const hargaVal = parseFloat(hargaJual) || 0;
    const ppnVal = ppnText.trim() !== "" ? parseFloat(ppnText) : null;

    callOasGlobal("showOpSpinner", "Menyimpan pengaturan produk...", ks.nama);
    setEditTarget(null);

    window.setTimeout(() => {
      try {
        const list = [...readProdukList()];
        const idx = list.findIndex((p) => p.ksId === katId);
        const data: Partial<Produk> & {
          ksId: string;
          hargaJual: number;
          ppn: number | null;
          ppnInclusive: boolean;
        } = {
          ksId: katId,
          hargaJual: hargaVal,
          ppn: ppnVal != null && !Number.isNaN(ppnVal) ? ppnVal : null,
          ppnInclusive,
        };
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
        } else {
          list.push(data);
        }
        writeProdukList(list);
        callOasGlobal("saveToStorage", false);
        syncFromStore();
        callOasGlobal(
          "showAlert",
          `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Produk <b>${ks.nama}</b> berhasil diperbarui!`
        );
      } catch (err) {
        console.error(err);
      } finally {
        callOasGlobal("hideOpSpinner");
      }
    }, 350);
  }, [editTarget, hargaJual, ppnText, ppnInclusive, syncFromStore]);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderProduk", syncFromStore);
    setOasWindowFn(
      "openModalEditProdukHarga",
      openEditModal as (...args: never[]) => unknown
    );
    setOasWindowFn("openProdukFilterCardPicker", openFilterCardPicker);
    setOasWindowFn("hapusProduk", () => {});
  }, [syncFromStore, openEditModal, openFilterCardPicker]);

  const ksList = useMemo<ProdukRowItem[]>(() => {
    const items: ProdukRowItem[] = [];
    cards.forEach((card) => {
      if (filterCardId && card.id !== filterCardId) return;
      Object.values(card.kategori || {}).forEach((kat) => {
        items.push({ ...kat, _cardNama: card.nama, _cardId: card.id });
      });
    });
    return items;
  }, [cards, filterCardId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ksList;
    return ksList.filter(
      (ks) =>
        ks.nama.toLowerCase().includes(q) ||
        (ks._cardNama || "").toLowerCase().includes(q)
    );
  }, [ksList, search]);

  const activeCardLabel = useMemo(() => {
    if (!filterCardId) return "Semua Kartu";
    return cards.find((c) => c.id === filterCardId)?.nama || "Semua Kartu";
  }, [cards, filterCardId]);

  const ppnBreakdown = useMemo(() => {
    const harga = parseFloat(hargaJual) || 0;
    const ppn = ppnText.trim() !== "" ? parseFloat(ppnText) : null;
    if (!harga || ppn == null || Number.isNaN(ppn) || ppn <= 0) return "";
    const ppnNominal = Math.round((harga * ppn) / 100);
    if (ppnInclusive) {
      const dpp = harga - ppnNominal;
      return `Kas ${fmtRp(harga)} = Penjualan ${fmtRp(dpp)} + PPN ${fmtRp(ppnNominal)}`;
    }
    const total = harga + ppnNominal;
    return `Kas ${fmtRp(total)} = Penjualan ${fmtRp(harga)} + PPN ${fmtRp(ppnNominal)}`;
  }, [hargaJual, ppnText, ppnInclusive]);

  // Keep revision referenced so saldos recompute after external stock updates
  const rowsWithSaldo = useMemo(
    () =>
      filtered.map((ks) => ({
        ks,
        saldo: readKsSaldo(ks),
        override: produkList.find(
          (p) => p.ksId === ks.id || p.ksId === ks._cardId
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, produkList, revision]
  );

  return (
    <div className="page" id="page-produk" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Master Produk</div>
          <div className="section-sub" id="produk-count-sub">
            {ksList.length === 0
              ? "0 produk terdeteksi dari kartu stock"
              : `${ksList.length} produk terdeteksi dari kartu stock persediaan`}
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          className="btn btn-ghost btn-sm"
          onClick={() => callOasGlobal("showPage", "kalk-persediaan")}
          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          <ArrowLeft size={14} /> Ke Persediaan
        </motion.button>
      </div>

      <div className="filter-bar">
        <button
          className="opt-picker-btn"
          type="button"
          id="produk-filter-card-btn"
          onClick={openFilterCardPicker}
          style={{ minWidth: "160px" }}
        >
          <span className="opt-picker-label" id="produk-filter-card-label">
            {activeCardLabel}
          </span>
          <span className="opt-picker-arrow">▾</span>
        </button>
        <input type="hidden" id="produk-filter-card" value={filterCardId} />
        <input
          type="text"
          id="produk-search"
          placeholder="Cari nama produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: "220px" }}
        />
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Satuan</th>
                <th>Metode</th>
                <th style={{ textAlign: "right" }}>Stok</th>
                <th style={{ textAlign: "right" }}>HPP (otomatis)</th>
                <th style={{ textAlign: "right" }}>Harga Jual</th>
                <th style={{ textAlign: "center" }}>PPN</th>
                <th style={{ width: "70px" }} />
              </tr>
            </thead>
            <tbody id="produk-tbody">
              {ksList.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "40px",
                    }}
                  >
                    <Package
                      size={28}
                      style={{
                        display: "block",
                        margin: "0 auto 10px",
                        opacity: 0.4,
                      }}
                    />
                    Belum ada kartu stock persediaan.
                    <br />
                    <span style={{ fontSize: "12px" }}>
                      Tambahkan di menu <b>Persediaan → + Kartu Stock</b>{" "}
                      terlebih dahulu.
                    </span>
                  </td>
                </tr>
              ) : rowsWithSaldo.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "32px",
                    }}
                  >
                    Tidak ada produk yang cocok
                  </td>
                </tr>
              ) : (
                rowsWithSaldo.map(({ ks, saldo, override }) => {
                  const harga = override?.hargaJual || 0;
                  const ppnTarif =
                    override?.ppn != null && override.ppn > 0
                      ? override.ppn
                      : null;
                  const isInclusive = !!override?.ppnInclusive;
                  const stokColor =
                    saldo.totalQty <= 0
                      ? "var(--red)"
                      : saldo.totalQty <= 5
                        ? "var(--accent3)"
                        : "var(--accent)";
                  const activeMethods =
                    saldo.allMetodeWithSaldo &&
                    saldo.allMetodeWithSaldo.length > 0
                      ? saldo.allMetodeWithSaldo
                      : [saldo.metode];

                  return (
                    <tr key={`${ks._cardId}-${ks.id}`}>
                      <td style={{ fontWeight: 600, fontSize: "13px" }}>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--muted)",
                            fontWeight: 400,
                            marginBottom: "2px",
                          }}
                        >
                          {ks._cardNama || ""}
                        </div>
                        {ks.nama}
                        {ks.deskripsi ? (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--muted)",
                              fontWeight: 400,
                            }}
                          >
                            {ks.deskripsi}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {ks.satuan || "unit"}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "2px",
                          }}
                        >
                          {activeMethods.map((m, idx) => (
                            <Fragment key={m}>
                              {idx > 0 ? (
                                <span
                                  style={{
                                    color: "var(--muted)",
                                    fontSize: "9px",
                                    margin: "0 2px",
                                  }}
                                >
                                  +
                                </span>
                              ) : null}
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "5px",
                                  whiteSpace: "nowrap",
                                  ...(METODE_BADGE_STYLE[m] || {}),
                                }}
                              >
                                {METODE_LABEL[m] || m}
                              </span>
                            </Fragment>
                          ))}
                        </div>
                        {activeMethods.length > 1 ? (
                          <div
                            style={{
                              fontSize: "9px",
                              color: "var(--accent3)",
                              marginTop: "3px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <AlertTriangle size={10} /> {activeMethods.length}{" "}
                            metode aktif
                          </div>
                        ) : null}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--mono)",
                          fontWeight: 700,
                          color: stokColor,
                        }}
                      >
                        {saldo.totalQty.toLocaleString("id-ID")}{" "}
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 400,
                            color: "var(--muted)",
                          }}
                        >
                          {ks.satuan || "unit"}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--mono)",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ color: "var(--text)", fontWeight: 600 }}>
                          {fmtRp(saldo.hppNext)}
                        </div>
                        {saldo.metode === "fifo" && saldo.layers.length > 1
                          ? saldo.layers.map((l, i) => (
                              <div
                                key={i}
                                style={{
                                  fontSize: "10px",
                                  color: "var(--muted)",
                                }}
                              >
                                {l.qty} unit @ {fmtRp(l.harga)}
                              </div>
                            ))
                          : null}
                        <div
                          style={{ fontSize: "10px", color: "var(--muted)" }}
                        >
                          Total: {fmtRp(saldo.totalNilai)}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--mono)",
                          fontSize: "13px",
                          color: harga ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {harga ? (
                          <div style={{ fontWeight: 600 }}>{fmtRp(harga)}</div>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--muted)",
                            }}
                          >
                            Belum diset
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {ppnTarif != null ? (
                          <span
                            title={
                              isInclusive
                                ? "PPN inclusive — sudah termasuk di harga jual"
                                : "PPN exclusive — ditambahkan di atas harga jual"
                            }
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              whiteSpace: "nowrap",
                              background: isInclusive
                                ? "rgba(34,211,238,0.12)"
                                : "rgba(250,204,21,0.12)",
                              color: isInclusive ? "#22d3ee" : "#facc15",
                              border: isInclusive
                                ? "1px solid rgba(34,211,238,0.3)"
                                : "1px solid rgba(250,204,21,0.3)",
                            }}
                          >
                            PPN {ppnTarif}%
                          </span>
                        ) : (
                          <span
                            style={{ fontSize: "9px", color: "var(--muted)" }}
                          >
                            Non-PKP
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditModal(ks.id, ks._cardId)}
                          title="Edit harga jual & PPN"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Harga Produk */}
      <OasModalDialog
        id="modal-produk"
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        maxWidth="560px"
        title={editTarget ? `Edit: ${editTarget.ks.nama}` : "Edit Produk"}
        titleExtra={
          <button
            type="button"
            className="info-icon-btn"
            id="produk-info-btn"
            title="HPP dihitung otomatis dari kartu stock persediaan dan tidak bisa diubah manual. Ubah data di menu Persediaan untuk memperbarui HPP."
            onClick={(e) =>
              callOasGlobal(
                "toggleInfoPopover",
                e.currentTarget,
                "HPP dihitung otomatis dari kartu stock persediaan dan tidak bisa diubah manual. Ubah data di menu <b>Persediaan</b> untuk memperbarui HPP."
              )
            }
          >
            <Info size={15} />
          </button>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSimpan}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Save size={14} /> Simpan Produk
            </button>
          </>
        }
      >
        {editTarget ? (
          <>
            <div id="produk-hpp-readonly" style={{ marginBottom: "14px" }}>
              <div
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginBottom: "4px",
                  }}
                >
                  HPP (otomatis dari kartu stock —{" "}
                  <b>
                    {METODE_FULL_LABEL[editTarget.saldo.metode] ||
                      editTarget.saldo.metode}
                  </b>
                  )
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {fmtRp(editTarget.saldo.hppNext)} / unit
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginTop: "3px",
                  }}
                >
                  Stok: {editTarget.saldo.totalQty}{" "}
                  {editTarget.ks.satuan || "unit"} · Total nilai:{" "}
                  {fmtRp(editTarget.saldo.totalNilai)}
                </div>
                {editTarget.saldo.metode === "fifo" &&
                editTarget.saldo.layers.length > 1 ? (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "10px",
                      color: "var(--accent2)",
                    }}
                  >
                    Layer FIFO:{" "}
                    {editTarget.saldo.layers
                      .map((l) => `${l.qty}×${fmtRp(l.harga)}`)
                      .join(" + ")}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="produk-harga-jual">Harga Jual (Rp)</label>
                <input
                  type="number"
                  id="produk-harga-jual"
                  placeholder="Masukkan harga jual..."
                  inputMode="numeric"
                  value={hargaJual}
                  onChange={(e) => setHargaJual(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="produk-ppn">
                  PPN (%){" "}
                  <span
                    style={{
                      fontWeight: 400,
                      color: "var(--muted)",
                      fontSize: "11px",
                    }}
                  >
                    — Opsional
                  </span>
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <input
                    type="number"
                    id="produk-ppn"
                    placeholder="cth: 11 atau 12"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.1"
                    style={{ flex: 1 }}
                    value={ppnText}
                    onChange={(e) => setPpnText(e.target.value)}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    %
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  Kosongkan = tidak kena PPN
                </div>
                {ppnBreakdown ? (
                  <div
                    id="produk-ppn-breakdown"
                    style={{
                      fontSize: "10.5px",
                      color: "var(--muted)",
                      marginTop: "6px",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {ppnBreakdown}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                marginTop: "14px",
                paddingTop: "14px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <input
                type="checkbox"
                id="produk-ppn-inclusive"
                checked={ppnInclusive}
                onChange={(e) => setPpnInclusive(e.target.checked)}
                style={{
                  width: "15px",
                  height: "15px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />
              <label
                htmlFor="produk-ppn-inclusive"
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text)",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                PPN termasuk harga jual (inclusive)
              </label>
            </div>
          </>
        ) : null}
      </OasModalDialog>
    </div>
  );
}
