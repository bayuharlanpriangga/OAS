"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { callOasGlobal, setOasWindowFn } from "@/lib/shared/legacy-store";
import {
  deletePengirimanItem,
  formatAlamatPengiriman,
  readPengirimanList,
  savePengirimanItem,
  type PengirimanRecord,
} from "@/lib/perusahaan/pengiriman";

export default function PengirimanPage() {
  const [list, setList] = useState<PengirimanRecord[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{
    open: boolean;
    id: string;
    nama: string;
    telp: string;
    jalan: string;
    kota: string;
    kodePos: string;
    provinsi: string;
  }>({
    open: false,
    id: "",
    nama: "",
    telp: "",
    jalan: "",
    kota: "",
    kodePos: "",
    provinsi: "",
  });

  const syncList = useCallback(() => {
    setList(readPengirimanList());
  }, []);

  useEffect(() => {
    syncList();
    setOasWindowFn("renderPengirimanPage", syncList as (...args: never[]) => unknown);
  }, [syncList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const hay = `${item.nama} ${item.telp} ${item.jalan} ${item.kota} ${item.provinsi} ${item.kodePos}`.toLowerCase();
      return hay.includes(q);
    });
  }, [list, search]);

  const uniqueKotaCount = useMemo(() => {
    const s = new Set(
      list.map((i) => i.kota.trim().toLowerCase()).filter(Boolean)
    );
    return s.size;
  }, [list]);

  const openAdd = () => {
    if (callOasGlobal("guardHanyaBaca", "Perusahaan")) return;
    setModal({
      open: true,
      id: "",
      nama: "",
      telp: "",
      jalan: "",
      kota: "",
      kodePos: "",
      provinsi: "",
    });
  };

  const openEdit = (item: PengirimanRecord) => {
    if (callOasGlobal("guardHanyaBaca", "Perusahaan")) return;
    setModal({
      open: true,
      id: item.id,
      nama: item.nama,
      telp: item.telp,
      jalan: item.jalan,
      kota: item.kota,
      kodePos: item.kodePos,
      provinsi: item.provinsi,
    });
  };

  const handleSave = () => {
    const res = savePengirimanItem({
      id: modal.id || undefined,
      nama: modal.nama,
      telp: modal.telp,
      jalan: modal.jalan,
      kota: modal.kota,
      kodePos: modal.kodePos,
      provinsi: modal.provinsi,
    });
    if (!res.ok) {
      callOasGlobal("showAlert", res.pesan);
      return;
    }
    setModal((prev) => ({ ...prev, open: false }));
    syncList();
    callOasGlobal("renderPenjualanPage");
    callOasGlobal(
      "auditLog",
      modal.id ? "edit" : "create",
      "perusahaan",
      `${modal.id ? "Ubah" : "Tambah"} jasa pengiriman "${res.record.nama}"`
    );
    callOasGlobal(
      "showAlert",
      modal.id
        ? `Data pengiriman "${res.record.nama}" diperbarui.`
        : `Jasa pengiriman "${res.record.nama}" ditambahkan.`
    );
  };

  const handleDelete = (item: PengirimanRecord) => {
    if (callOasGlobal("guardHanyaBaca", "Perusahaan")) return;
    const msg = `Hapus jasa pengiriman "${item.nama}"?`;
    const run = () => {
      deletePengirimanItem(item.id);
      syncList();
      callOasGlobal("renderPenjualanPage");
      callOasGlobal(
        "auditLog",
        "delete",
        "perusahaan",
        `Hapus jasa pengiriman "${item.nama}"`
      );
      callOasGlobal("showAlert", `Jasa pengiriman "${item.nama}" dihapus.`);
    };
    const showConfirm = (
      window as unknown as { showConfirm?: (m: string, cb: () => void) => void }
    ).showConfirm;
    if (showConfirm) showConfirm(msg, run);
    else if (window.confirm(msg)) run();
  };

  return (
    <div className="page" id="page-pengiriman" data-react-managed="1">
      <div className="section-header page-actions-only" style={{ marginBottom: "14px" }}>
        <button
          type="button"
          id="btn-tambah-pengiriman"
          className="btn btn-primary btn-sm"
          onClick={openAdd}
        >
          <Plus size={14} /> Tambah Pengiriman
        </button>
      </div>

      {/* KPI Strip */}
      <div className="oas-kpi-strip">
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Total jasa pengiriman</div>
          <div className="oas-kpi-val num">{list.length}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Cakupan kota</div>
          <div className="oas-kpi-val num">{uniqueKotaCount}</div>
        </div>
      </div>

      {/* Pencarian */}
      <div style={{ marginBottom: "12px", display: "flex", justifyContent: "flex-end" }}>
        <input
          type="text"
          placeholder="Cari nama pengirim, kota, atau provinsi..."
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

      {/* Tabel Daftar Pengiriman */}
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">Daftar Kategori Pengiriman</div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama Jasa Pengiriman</th>
                <th>No. Telp</th>
                <th>Jalan</th>
                <th>Kota</th>
                <th>Provinsi</th>
                <th>Kode Pos</th>
                <th style={{ textAlign: "right", width: "86px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}
                  >
                    <Truck size={26} style={{ marginBottom: "8px", opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
                      {search.trim()
                        ? "Jasa pengiriman tidak ditemukan."
                        : "Belum ada kategori pengiriman."}
                    </div>
                    <div style={{ fontSize: "12.5px" }}>
                      Tambahkan ekspedisi seperti JNT, JNE, atau kurir lainnya untuk dipakai pada Pesanan Penjualan.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <Truck size={14} style={{ color: "var(--accent-text)" }} />
                        {item.nama}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: "12.5px", color: "var(--muted)" }}>
                      {item.telp ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <Phone size={12} /> {item.telp}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ color: "var(--text)", fontSize: "13px" }}>
                      {item.jalan || "-"}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{item.kota || "-"}</td>
                    <td style={{ color: "var(--muted)" }}>{item.provinsi || "-"}</td>
                    <td style={{ fontFamily: "var(--mono)", color: "var(--muted)" }}>
                      {item.kodePos || "-"}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "4px" }}>
                        <button
                          type="button"
                          className="oas-icon-dots"
                          onClick={() => openEdit(item)}
                          title={`Ubah ${item.nama}`}
                          aria-label={`Ubah ${item.nama}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="oas-icon-dots"
                          onClick={() => handleDelete(item)}
                          title={`Hapus ${item.nama}`}
                          aria-label={`Hapus ${item.nama}`}
                          style={{ color: "var(--red)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Ubah Pengiriman */}
      <OasModalDialog
        id="modal-pengiriman"
        open={modal.open}
        onClose={() => setModal((prev) => ({ ...prev, open: false }))}
        maxWidth="520px"
        title={
          modal.id ? (
            <>
              Ubah Pengiriman{" "}
              <span className="oas-ctx-highlight">{modal.nama}</span>
            </>
          ) : (
            "Tambah Kategori Pengiriman"
          )
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModal((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-simpan-pengiriman"
              className="btn btn-primary"
              onClick={handleSave}
            >
              Simpan
            </button>
          </>
        }
      >
        <div className="form-row" style={{ marginBottom: "12px" }}>
          <div className="form-group">
            <label htmlFor="ship-nama">
              Nama <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              id="ship-nama"
              type="text"
              placeholder="Contoh: JNT, JNE, SiCepat"
              value={modal.nama}
              onChange={(e) =>
                setModal((prev) => ({ ...prev, nama: e.target.value }))
              }
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="ship-telp">No. Telp</label>
            <input
              id="ship-telp"
              type="tel"
              placeholder="Contoh: 021-80661888"
              value={modal.telp}
              onChange={(e) =>
                setModal((prev) => ({ ...prev, telp: e.target.value }))
              }
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--accent-text)",
            marginBottom: "8px",
            paddingTop: "6px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <MapPin size={13} /> Alamat Jasa Pengirim
        </div>

        <div className="form-group" style={{ marginBottom: "12px" }}>
          <label htmlFor="ship-jalan">Jalan</label>
          <input
            id="ship-jalan"
            type="text"
            placeholder="Contoh: Jl. Sudirman No. 45"
            value={modal.jalan}
            onChange={(e) =>
              setModal((prev) => ({ ...prev, jalan: e.target.value }))
            }
          />
        </div>

        <div className="form-row" style={{ marginBottom: "12px" }}>
          <div className="form-group">
            <label htmlFor="ship-kota">Kota</label>
            <input
              id="ship-kota"
              type="text"
              placeholder="Contoh: Jakarta Selatan"
              value={modal.kota}
              onChange={(e) =>
                setModal((prev) => ({ ...prev, kota: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="ship-kodepos">Kode Pos</label>
            <input
              id="ship-kodepos"
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 12190"
              value={modal.kodePos}
              onChange={(e) =>
                setModal((prev) => ({ ...prev, kodePos: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="ship-provinsi">Provinsi</label>
          <input
            id="ship-provinsi"
            type="text"
            placeholder="Contoh: DKI Jakarta"
            value={modal.provinsi}
            onChange={(e) =>
              setModal((prev) => ({ ...prev, provinsi: e.target.value }))
            }
          />
        </div>
      </OasModalDialog>
    </div>
  );
}
