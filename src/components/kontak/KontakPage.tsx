"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, Users } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  fmtRp,
  readJurnalEntries,
  readKontakList,
  setOasWindowFn,
  simpanKontakState,
  writeKontakList,
} from "@/lib";
import type { Kontak, KontakTipe } from "@/types";

interface KontakWin {
  showAlert?: (msg: string) => void;
  showConfirm?: (msg: string, cb: () => void) => void;
  guardWrite?: (mod?: string, aksi?: string) => boolean;
  isReadOnly?: () => boolean;
}

function getWin(): KontakWin {
  return window as unknown as KontakWin;
}

const EMPTY_FORM = {
  id: "",
  nama: "",
  tipe: "pelanggan" as KontakTipe,
  telp: "",
  email: "",
  alamat: "",
  npwp: "",
  pic: "",
  catatan: "",
};

const TIPE_STYLE: Record<
  KontakTipe,
  { bg: string; color: string; label: string }
> = {
  pelanggan: {
    bg: "rgba(74,222,128,0.12)",
    color: "var(--accent)",
    label: "Pelanggan",
  },
  supplier: {
    bg: "rgba(34,211,238,0.12)",
    color: "var(--accent2)",
    label: "Supplier",
  },
  keduanya: {
    bg: "rgba(251,191,36,0.12)",
    color: "var(--accent3)",
    label: "Keduanya",
  },
};

export default function KontakPage() {
  const [kontaks, setKontaks] = useState<Kontak[]>([]);
  const [filterTipe, setFilterTipe] = useState<"semua" | "pelanggan" | "supplier">(
    "semua"
  );
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detailKontak, setDetailKontak] = useState<Kontak | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const syncFromStore = useCallback(() => {
    setKontaks(readKontakList().slice());
    setReadOnly(Boolean(getWin().isReadOnly?.()));
  }, []);

  const recalcTotalTrx = useCallback(() => {
    const list = readKontakList();
    const jurnals = readJurnalEntries();
    let changed = false;
    const updated = list.map((k) => {
      const total = jurnals
        .filter((j) => j.kontakId === k.id)
        .reduce(
          (sum, j) =>
            sum + (j.lines || []).reduce((s, l) => s + (l.debit || 0), 0),
          0
        );
      if (k.totalTrx !== total) {
        changed = true;
        return { ...k, totalTrx: total };
      }
      return k;
    });
    if (changed) {
      writeKontakList(updated);
      void simpanKontakState();
    }
    setKontaks(updated.slice());
  }, []);

  const updateKontakTotalTrx = useCallback((kontakId: string, nominal: number) => {
    if (!kontakId) return;
    const list = readKontakList().slice();
    const idx = list.findIndex((k) => k.id === kontakId);
    if (idx < 0) return;
    list[idx] = {
      ...list[idx],
      totalTrx: (list[idx].totalTrx || 0) + (nominal || 0),
    };
    writeKontakList(list);
    void simpanKontakState();
    setKontaks(list.slice());
  }, []);

  const refreshKontakPickers = useCallback(() => {
    const list = readKontakList();
    const selJual = document.getElementById("jual-kontak") as HTMLSelectElement | null;
    if (selJual) {
      const prev = selJual.value;
      selJual.innerHTML =
        '<option value="">— Tanpa Kontak —</option>' +
        list
          .filter((k) => k.tipe === "pelanggan" || k.tipe === "keduanya")
          .map((k) => `<option value="${k.id}">${k.nama}</option>`)
          .join("");
      selJual.value = prev;
    }
    const selBeli = document.getElementById("beli-kontak") as HTMLSelectElement | null;
    if (selBeli) {
      const prev = selBeli.value;
      selBeli.innerHTML =
        '<option value="">— Tanpa Kontak —</option>' +
        list
          .filter((k) => k.tipe === "supplier" || k.tipe === "keduanya")
          .map((k) => `<option value="${k.id}">${k.nama}</option>`)
          .join("");
      selBeli.value = prev;
    }
  }, []);

  const openModalKontak = useCallback((id?: string) => {
    const win = getWin();
    if (win.guardWrite && !win.guardWrite("kontak", id ? "update" : "create")) {
      return;
    }
    if (id) {
      const found = readKontakList().find((k) => k.id === id);
      if (found) {
        setForm({
          id: found.id,
          nama: found.nama || "",
          tipe: found.tipe || "pelanggan",
          telp: found.telp || "",
          email: found.email || "",
          alamat: found.alamat || "",
          npwp: found.npwp || "",
          pic: found.pic || "",
          catatan: found.catatan || "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
    } else {
      setForm(EMPTY_FORM);
    }
    setModalOpen(true);
  }, []);

  const handleSimpan = useCallback(() => {
    const win = getWin();
    if (
      win.guardWrite &&
      !win.guardWrite("kontak", form.id ? "update" : "create")
    ) {
      return;
    }
    const nama = form.nama.trim();
    if (!nama) {
      win.showAlert?.("⚠️ Nama kontak wajib diisi!");
      return;
    }
    const list = readKontakList().slice();
    const existing = form.id ? list.find((k) => k.id === form.id) : null;
    const item: Kontak = {
      id: form.id || "KTK_" + Date.now(),
      nama,
      tipe: form.tipe,
      telp: form.telp.trim(),
      email: form.email.trim(),
      alamat: form.alamat.trim(),
      npwp: form.npwp.trim(),
      pic: form.pic.trim(),
      catatan: form.catatan.trim(),
      totalTrx: existing ? existing.totalTrx || 0 : 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    if (form.id) {
      const idx = list.findIndex((k) => k.id === form.id);
      if (idx >= 0) list[idx] = item;
      else list.unshift(item);
    } else {
      list.unshift(item);
    }
    writeKontakList(list);
    void simpanKontakState();
    setKontaks(list.slice());
    setModalOpen(false);
    refreshKontakPickers();
    win.showAlert?.(
      `Kontak "${nama}" ${form.id ? "diperbarui" : "ditambahkan"}!`
    );
  }, [form, refreshKontakPickers]);

  const handleHapus = useCallback(
    (id: string) => {
      const win = getWin();
      if (win.guardWrite && !win.guardWrite("kontak", "delete")) return;
      const target = readKontakList().find((k) => k.id === id);
      if (!target) return;
      const doDelete = () => {
        const next = readKontakList().filter((k) => k.id !== id);
        writeKontakList(next);
        void simpanKontakState();
        setKontaks(next.slice());
        if (detailKontak?.id === id) setDetailKontak(null);
        refreshKontakPickers();
        win.showAlert?.(`Kontak "${target.nama}" dihapus.`);
      };
      if (win.showConfirm) {
        win.showConfirm(`Hapus kontak "${target.nama}"?`, doDelete);
      } else {
        doDelete();
      }
    },
    [detailKontak, refreshKontakPickers]
  );

  const lihatDetailKontak = useCallback((id: string) => {
    const found = readKontakList().find((k) => k.id === id) || null;
    setDetailKontak(found);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderKontak", syncFromStore as (...args: never[]) => unknown);
    setOasWindowFn(
      "renderKontakKPI",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openModalKontak",
      openModalKontak as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "lihatDetailKontak",
      lihatDetailKontak as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "hapusKontak",
      handleHapus as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "filterKontak",
      ((t: "semua" | "pelanggan" | "supplier") => {
        setFilterTipe(t || "semua");
        syncFromStore();
      }) as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "updateKontakTotalTrx",
      updateKontakTotalTrx as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "recalcKontakTotalTrx",
      recalcTotalTrx as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "refreshKontakPickers",
      refreshKontakPickers as (...args: never[]) => unknown
    );
  }, [
    handleHapus,
    lihatDetailKontak,
    openModalKontak,
    recalcTotalTrx,
    refreshKontakPickers,
    syncFromStore,
    updateKontakTotalTrx,
  ]);

  const kpi = useMemo(() => {
    const pel = kontaks.filter(
      (k) => k.tipe === "pelanggan" || k.tipe === "keduanya"
    ).length;
    const sup = kontaks.filter(
      (k) => k.tipe === "supplier" || k.tipe === "keduanya"
    ).length;
    return { total: kontaks.length, pel, sup };
  }, [kontaks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kontaks.filter((k) => {
      if (
        filterTipe === "pelanggan" &&
        k.tipe !== "pelanggan" &&
        k.tipe !== "keduanya"
      ) {
        return false;
      }
      if (
        filterTipe === "supplier" &&
        k.tipe !== "supplier" &&
        k.tipe !== "keduanya"
      ) {
        return false;
      }
      if (!q) return true;
      return (
        (k.nama || "").toLowerCase().includes(q) ||
        (k.telp || "").toLowerCase().includes(q) ||
        (k.email || "").toLowerCase().includes(q)
      );
    });
  }, [kontaks, filterTipe, search]);

  const detailJurnals = useMemo(() => {
    if (!detailKontak) return [];
    const namaLower = detailKontak.nama.toLowerCase();
    return readJurnalEntries()
      .filter(
        (j) =>
          j.kontakId === detailKontak.id ||
          (j.ket || "").toLowerCase().includes(namaLower)
      )
      .slice(-10)
      .reverse();
  }, [detailKontak]);

  return (
    <>
      <div className="page" id="page-kontak" data-react-managed="1">
        <div className="section-header">
          <div>
            <div className="section-title">Master Kontak</div>
            <div className="section-sub">
              Pelanggan &amp; Supplier · Histori transaksi
            </div>
          </div>
          {!readOnly && (
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={() => openModalKontak()}
            >
              <Plus size={14} style={{ verticalAlign: "-2px" }} /> Tambah Kontak
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {(["semua", "pelanggan", "supplier"] as const).map((t) => (
            <button
              key={t}
              id={`kontak-tab-${t}`}
              type="button"
              className={`btn btn-ghost btn-sm kontak-tab${filterTipe === t ? " oas-active-tab" : ""}`}
              onClick={() => setFilterTipe(t)}
            >
              {t === "semua"
                ? "Semua"
                : t === "pelanggan"
                  ? "Pelanggan"
                  : "Supplier"}
            </button>
          ))}
          <input
            type="text"
            id="kontak-search"
            placeholder="Cari nama / telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginLeft: "auto",
              minWidth: "200px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "7px 12px",
              color: "var(--text)",
              fontSize: "13px",
            }}
          />
        </div>

        <div
          id="kontak-kpi"
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          {[
            { label: "Total Kontak", val: kpi.total, color: "var(--text)" },
            { label: "Pelanggan", val: kpi.pel, color: "var(--accent)" },
            { label: "Supplier", val: kpi.sup, color: "var(--accent2)" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "10px 16px",
                minWidth: "130px",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  fontFamily: "var(--mono)",
                  color: item.color,
                  marginTop: "3px",
                }}
              >
                {item.val}
              </div>
            </div>
          ))}
        </div>

        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Tipe</th>
                  <th>Telepon</th>
                  <th>Email</th>
                  <th>Alamat</th>
                  <th style={{ textAlign: "right" }}>Total Transaksi</th>
                  <th style={{ width: "90px" }}></th>
                </tr>
              </thead>
              <tbody id="kontak-tbody">
                {!filtered.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        color: "var(--muted)",
                        padding: "32px",
                      }}
                    >
                      Belum ada kontak
                      {filterTipe !== "semua" ? ` (${filterTipe})` : ""}. Klik
                      Tambah Kontak untuk mulai.
                    </td>
                  </tr>
                ) : (
                  filtered.map((k) => {
                    const tc = TIPE_STYLE[k.tipe] || TIPE_STYLE.pelanggan;
                    return (
                      <tr
                        key={k.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => lihatDetailKontak(k.id)}
                      >
                        <td>
                          <div style={{ fontWeight: 600 }}>{k.nama}</div>
                          {k.pic && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--muted)",
                              }}
                            >
                              PIC: {k.pic}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              background: tc.bg,
                              color: tc.color,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "20px",
                            }}
                          >
                            {tc.label}
                          </span>
                        </td>
                        <td
                          style={{ fontFamily: "var(--mono)", fontSize: "12px" }}
                        >
                          {k.telp || "—"}
                        </td>
                        <td style={{ fontSize: "12px" }}>{k.email || "—"}</td>
                        <td
                          style={{
                            fontSize: "12px",
                            maxWidth: "180px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {k.alamat || "—"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "var(--mono)",
                            fontSize: "12px",
                          }}
                        >
                          {k.totalTrx ? fmtRp(k.totalTrx) : "—"}
                        </td>
                        <td
                          onClick={(e) => e.stopPropagation()}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {!readOnly && (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                style={{ padding: "4px 7px", fontSize: "12px" }}
                                title="Edit"
                                onClick={() => openModalKontak(k.id)}
                              >
                                <Pencil size={13} />
                              </button>{" "}
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                style={{
                                  padding: "4px 7px",
                                  fontSize: "12px",
                                  color: "var(--danger)",
                                }}
                                title="Hapus"
                                onClick={() => handleHapus(k.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Kontak */}
      <OasModalDialog
        id="modal-kontak"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="480px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Users size={15} /> {form.id ? "Edit Kontak" : "Tambah Kontak"}
          </span>
        }
        footer={
          <>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSimpan}
            >
              <Save size={14} style={{ verticalAlign: "-2px" }} /> Simpan Kontak
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Nama *</label>
            <input
              type="text"
              placeholder="PT Maju Bersama"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Tipe *</label>
            <select
              style={{ width: "100%" }}
              value={form.tipe}
              onChange={(e) =>
                setForm({ ...form, tipe: e.target.value as KontakTipe })
              }
            >
              <option value="pelanggan">Pelanggan</option>
              <option value="supplier">Supplier</option>
              <option value="keduanya">Keduanya</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Telepon</label>
            <input
              type="text"
              placeholder="021-12345678"
              value={form.telp}
              onChange={(e) => setForm({ ...form, telp: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="kontak@perusahaan.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Alamat</label>
          <input
            type="text"
            placeholder="Jl. Sudirman No. 1, Jakarta"
            value={form.alamat}
            onChange={(e) => setForm({ ...form, alamat: e.target.value })}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>NPWP</label>
            <input
              type="text"
              placeholder="00.000.000.0-000.000"
              value={form.npwp}
              onChange={(e) => setForm({ ...form, npwp: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Narahubung / PIC</label>
            <input
              type="text"
              placeholder="Nama contact person"
              value={form.pic}
              onChange={(e) => setForm({ ...form, pic: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Catatan</label>
          <input
            type="text"
            placeholder="Catatan tambahan..."
            value={form.catatan}
            onChange={(e) => setForm({ ...form, catatan: e.target.value })}
          />
        </div>
      </OasModalDialog>

      {/* Modal Detail Kontak */}
      <OasModalDialog
        id="modal-kontak-detail"
        open={Boolean(detailKontak)}
        onClose={() => setDetailKontak(null)}
        maxWidth="500px"
        title={detailKontak?.nama || "Detail Kontak"}
        footer={
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setDetailKontak(null)}
          >
            Tutup
          </button>
        }
      >
        {detailKontak && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginBottom: "14px",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                  Tipe
                </span>
                <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
                  {detailKontak.tipe}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                  Telepon
                </span>
                <div style={{ fontFamily: "var(--mono)" }}>
                  {detailKontak.telp || "—"}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                  Email
                </span>
                <div>{detailKontak.email || "—"}</div>
              </div>
              <div>
                <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                  NPWP
                </span>
                <div style={{ fontFamily: "var(--mono)" }}>
                  {detailKontak.npwp || "—"}
                </div>
              </div>
              {detailKontak.pic && (
                <div>
                  <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                    PIC
                  </span>
                  <div>{detailKontak.pic}</div>
                </div>
              )}
              {detailKontak.alamat && (
                <div style={{ gridColumn: "1/-1" }}>
                  <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                    Alamat
                  </span>
                  <div>{detailKontak.alamat}</div>
                </div>
              )}
              {detailKontak.catatan && (
                <div style={{ gridColumn: "1/-1" }}>
                  <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                    Catatan
                  </span>
                  <div style={{ color: "var(--muted)" }}>
                    {detailKontak.catatan}
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--muted)",
                marginBottom: "8px",
              }}
            >
              Transaksi Terkait ({detailJurnals.length})
            </div>
            {detailJurnals.length ? (
              <div style={{ display: "grid", gap: "6px" }}>
                {detailJurnals.map((j, idx) => {
                  const nom = (j.lines || []).reduce(
                    (s, l) => s + (l.debit || 0),
                    0
                  );
                  return (
                    <div
                      key={j.no || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        background: "var(--surface2)",
                        borderRadius: "7px",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: "var(--muted)",
                            fontFamily: "var(--mono)",
                            marginRight: "8px",
                          }}
                        >
                          {j.tanggal}
                        </span>
                        {j.ket}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontWeight: 600,
                        }}
                      >
                        {fmtRp(nom)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Belum ada transaksi tercatat untuk kontak ini.
              </div>
            )}
          </>
        )}
      </OasModalDialog>
    </>
  );
}
