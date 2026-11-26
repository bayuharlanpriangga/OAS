"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Building2,
  ClipboardList,
  Coins,
  Gem,
  Package,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  AKUN_TIPE_ORDER,
  akunTrashSisaHari,
  tipeBadgeClass,
} from "@/lib/master/chart-of-accounts";
import {
  callOasGlobal,
  readAkuns,
  readAkunsTrash,
  readJurnalEntries,
  setOasWindowFn,
  writeAkuns,
  writeAkunsTrash,
} from "@/lib/shared/legacy-store";
import type { Akun, AkunTipe, AkunTrashItem, SaldoMap } from "@/types";

const TIPE_META: Record<
  AkunTipe,
  { label: string; badge: string; icon: typeof Building2 }
> = {
  Aset: { label: "ASET", badge: "badge-green", icon: Building2 },
  Liabilitas: { label: "LIABILITAS", badge: "badge-red", icon: ClipboardList },
  Ekuitas: { label: "EKUITAS", badge: "badge-blue", icon: Gem },
  Pendapatan: { label: "PENDAPATAN", badge: "badge-blue", icon: Coins },
  HPP: { label: "HARGA POKOK PENJUALAN", badge: "badge-yellow", icon: Package },
  Beban: { label: "BEBAN", badge: "badge-yellow", icon: Wallet },
};

function computeSaldoSnapshot(): SaldoMap {
  const res = callOasGlobal("computeSaldoAll");
  if (res && typeof res === "object") return res as SaldoMap;
  return {};
}

export default function CoaPage() {
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [akunsTrash, setAkunsTrash] = useState<AkunTrashItem[]>([]);
  const [saldoMap, setSaldoMap] = useState<SaldoMap>({});
  const [search, setSearch] = useState("");
  const [filterTipe, setFilterTipe] = useState<AkunTipe | "">("");
  const [grouped, setGrouped] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [newKode, setNewKode] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newTipe, setNewTipe] = useState<AkunTipe>("Aset");
  const [newKat, setNewKat] = useState("");

  const [trashOpen, setTrashOpen] = useState(false);

  const purgeExpiredTrash = useCallback(() => {
    const current = readAkunsTrash();
    if (!current.length) return current;
    const active = current.filter((x) => akunTrashSisaHari(x.deletedAt) > 0);
    if (active.length < current.length) {
      writeAkunsTrash(active);
      callOasGlobal("markDirty");
    }
    return active;
  }, []);

  const syncFromStore = useCallback(() => {
    const cleanTrash = purgeExpiredTrash();
    setAkuns([...readAkuns()]);
    setAkunsTrash([...cleanTrash]);
    setSaldoMap(computeSaldoSnapshot());
  }, [purgeExpiredTrash]);

  const openAddModal = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "Akun")) return;
    setAddOpen(true);
  }, []);

  const openTrashModal = useCallback(() => {
    syncFromStore();
    setTrashOpen(true);
  }, [syncFromStore]);

  const handleHapusAkun = useCallback(
    (kode: string) => {
      const currentAkuns = readAkuns();
      const target = currentAkuns.find((x) => x.kode === kode);
      if (!target) return;
      const usedIn = readJurnalEntries().filter((j) =>
        (j.lines || []).some((l) => l.akun === kode)
      ).length;

      const confirmPromise = callOasGlobal("showCustomConfirmGeneral", {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
        iconColor: "rgba(248,113,113,0.15)",
        iconBorder: "rgba(248,113,113,0.3)",
        title: "Hapus Akun?",
        subtitle: `Akun <b>${target.kode} · ${target.nama}</b> akan dipindah ke Sampah COA`,
        rows: [
          { label: "Kode", value: target.kode, color: "var(--muted)" },
          { label: "Nama", value: target.nama, color: "var(--text)" },
          { label: "Tipe", value: target.tipe, color: "var(--accent2)" },
          ...(usedIn > 0
            ? [
                {
                  label: "Dipakai di",
                  value: `${usedIn} jurnal`,
                  color: "var(--accent3)",
                },
              ]
            : []),
        ],
        warning:
          usedIn > 0
            ? `<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akun ini dipakai di ${usedIn} jurnal. Jurnal lama tetap utuh (nominal tidak hilang) tapi akan tampil "akun tidak ditemukan" sampai akun ini di-restore dari Sampah COA. Tersimpan 30 hari sebelum terhapus permanen.`
            : '<i class="ti ti-info-circle" style="color:var(--muted);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tersimpan di Sampah COA selama 30 hari · bisa di-restore kapan saja sebelum itu.',
        btnLabel:
          '<i class="ti ti-trash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Ya, Hapus Akun',
        btnGradient: "var(--danger)",
      }) as Promise<boolean> | undefined;

      const doDelete = () => {
        const nextAkuns = readAkuns().filter((x) => x.kode !== kode);
        const nextTrash = [
          ...readAkunsTrash().filter((x) => x.kode !== kode),
          { ...target, deletedAt: new Date().toISOString() },
        ];
        writeAkuns(nextAkuns);
        writeAkunsTrash(nextTrash);
        syncFromStore();
        callOasGlobal("markDirty");
        callOasGlobal(
          "showAlert",
          `<i class="ti ti-trash" style="font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Akun ${target.kode} - ${target.nama} dipindah ke Sampah COA (tersimpan 30 hari)`
        );
      };

      if (confirmPromise?.then) {
        confirmPromise.then((ok) => {
          if (ok) doDelete();
        });
      } else if (
        window.confirm(`Pindahkan akun ${target.kode} · ${target.nama} ke Sampah COA?`)
      ) {
        doDelete();
      }
    },
    [syncFromStore]
  );

  const handleRestoreAkun = useCallback(
    (kode: string) => {
      const currentTrash = readAkunsTrash();
      const idx = currentTrash.findIndex((x) => x.kode === kode);
      if (idx < 0) return;
      const item = currentTrash[idx];
      const currentAkuns = readAkuns();
      if (currentAkuns.some((x) => x.kode === kode)) {
        callOasGlobal(
          "showAlert",
          `Kode akun ${kode} sudah dipakai akun lain di COA. Ubah/hapus dulu akun aktif dengan kode tersebut sebelum restore.`
        );
        return;
      }
      const { deletedAt: _deletedAt, ...akunAsli } = item;
      const nextAkuns = [...currentAkuns, akunAsli].sort((a, b) =>
        a.kode.localeCompare(b.kode)
      );
      const nextTrash = currentTrash.filter((_, i) => i !== idx);
      writeAkuns(nextAkuns);
      writeAkunsTrash(nextTrash);
      syncFromStore();
      callOasGlobal("markDirty");
      callOasGlobal(
        "showAlert",
        `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Akun ${akunAsli.kode} - ${akunAsli.nama} berhasil di-restore. Jurnal lama yang mereferensikannya otomatis terhubung kembali.`
      );
    },
    [syncFromStore]
  );

  const handleSimpanAkun = useCallback(() => {
    const kode = newKode.trim();
    const nama = newNama.trim();
    const kat = newKat.trim();
    if (!kode || !nama) {
      callOasGlobal("showAlert", "Kode dan nama akun wajib diisi!");
      return;
    }
    const currentAkuns = readAkuns();
    if (currentAkuns.some((a) => a.kode === kode)) {
      callOasGlobal("showAlert", "Kode akun sudah ada!");
      return;
    }
    let normal: "D" | "K" = ["Aset", "Beban", "HPP"].includes(newTipe)
      ? "D"
      : "K";
    if (/^kontra/i.test(kat)) {
      normal = normal === "D" ? "K" : "D";
    }
    const nextAkuns = [
      ...currentAkuns,
      { kode, nama, tipe: newTipe, kat, normal },
    ].sort((a, b) => a.kode.localeCompare(b.kode));
    writeAkuns(nextAkuns);
    callOasGlobal("markDirty");
    setAddOpen(false);
    setNewKode("");
    setNewNama("");
    setNewKat("");
    syncFromStore();
    callOasGlobal("showAlert", "✓ Akun berhasil ditambahkan!");
  }, [newKode, newNama, newTipe, newKat, syncFromStore]);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderAkun", syncFromStore);
    setOasWindowFn("openModalAkun", openAddModal);
    setOasWindowFn("openModalAkunTrash", openTrashModal);
    setOasWindowFn("renderAkunTrashList", syncFromStore);
    setOasWindowFn("purgeExpiredAkunTrash", purgeExpiredTrash);
    setOasWindowFn(
      "hapusAkun",
      handleHapusAkun as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "restoreAkunTrash",
      handleRestoreAkun as (...args: never[]) => unknown
    );
  }, [
    syncFromStore,
    openAddModal,
    openTrashModal,
    purgeExpiredTrash,
    handleHapusAkun,
    handleRestoreAkun,
  ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return akuns.filter((a) => {
      if (filterTipe && a.tipe !== filterTipe) return false;
      if (
        q &&
        !a.nama.toLowerCase().includes(q) &&
        !a.kode.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [akuns, filterTipe, search]);

  const countsByTipe = useMemo(() => {
    const counts: Record<AkunTipe, number> = {
      Aset: 0,
      Liabilitas: 0,
      Ekuitas: 0,
      Pendapatan: 0,
      HPP: 0,
      Beban: 0,
    };
    akuns.forEach((a) => {
      if (a.tipe in counts) counts[a.tipe]++;
    });
    return counts;
  }, [akuns]);

  const sortedTrash = useMemo(
    () =>
      [...akunsTrash].sort(
        (a, b) =>
          new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      ),
    [akunsTrash]
  );

  const showGrouped = grouped && !filterTipe && !search.trim();

  const renderAkunRow = (a: Akun) => {
    const s = saldoMap[a.kode] || { debit: 0, kredit: 0 };
    const saldo = a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
    const saldoColor =
      saldo > 0 ? "var(--text)" : saldo < 0 ? "var(--red)" : "var(--muted)";
    const isContra = a.kat === "Kontra" || a.kat === "Kontra HPP";

    return (
      <tr key={a.kode} style={isContra ? { opacity: 0.75 } : undefined}>
        <td
          style={{
            fontFamily: "var(--mono)",
            fontSize: "12px",
            color: "var(--muted)",
          }}
        >
          {a.kode}
        </td>
        <td
          style={{
            fontSize: "13px",
            ...(isContra ? { paddingLeft: "28px", fontStyle: "italic" } : {}),
          }}
        >
          {isContra ? (
            <span
              style={{
                color: "var(--muted)",
                marginRight: "4px",
                fontSize: "10px",
              }}
            >
              ↳
            </span>
          ) : null}
          {a.nama}
        </td>
        <td>
          <span
            className={`badge ${tipeBadgeClass(a.tipe)}`}
            style={{ fontSize: "10px" }}
          >
            {a.tipe}
          </span>
        </td>
        <td style={{ color: "var(--muted)", fontSize: "11.5px" }}>
          {a.kat || "-"}
        </td>
        <td>
          <span
            className={`badge ${a.normal === "D" ? "badge-blue" : "badge-red"}`}
            style={{ fontSize: "10px" }}
          >
            {a.normal === "D" ? "Debit" : "Kredit"}
          </span>
        </td>
        <td
          style={{
            textAlign: "right",
            fontFamily: "var(--mono)",
            fontSize: "12px",
            color: saldoColor,
          }}
        >
          {saldo ? `Rp ${Math.abs(saldo).toLocaleString("id-ID")}` : "-"}
        </td>
        <td style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => handleHapusAkun(a.kode)}
            title="Hapus akun"
            aria-label={`Hapus akun ${a.kode} ${a.nama}`}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="page" id="page-akun" data-react-managed="1">
      <div className="section-header" style={{ marginBottom: "12px" }}>
        <div className="section-sub" id="coa-count-sub" style={{ marginTop: 0 }}>
          {filtered.length} dari {akuns.length} akun ditampilkan
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            className="btn btn-ghost btn-sm"
            onClick={openTrashModal}
            title="Sampah COA · akun terhapus tersimpan 30 hari"
            id="coa-trash-btn"
            style={{ position: "relative" }}
          >
            <Trash2 size={14} />
            {akunsTrash.length > 0 ? (
              <span
                id="coa-trash-badge"
                style={{
                  display: "flex",
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  background: "var(--red)",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 700,
                  minWidth: "15px",
                  height: "15px",
                  borderRadius: "20px",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {akunsTrash.length}
              </span>
            ) : null}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            className="btn btn-primary btn-sm"
            onClick={openAddModal}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Plus size={14} /> Tambah Akun
          </motion.button>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: "16px" }}>
        <input
          type="text"
          id="coa-search"
          placeholder="Cari nama atau kode akun..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: "220px" }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--muted)",
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            id="coa-group-tipe"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
            style={{ accentColor: "var(--accent)", flexShrink: 0 }}
          />
          Grup per tipe
        </label>
      </div>

      <div
        id="coa-stats"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        {AKUN_TIPE_ORDER.map((tipe) => {
          const active = filterTipe === tipe;
          return (
            <button
              key={tipe}
              type="button"
              className={`badge ${TIPE_META[tipe].badge}`}
              onClick={() => setFilterTipe(active ? "" : tipe)}
              style={{
                cursor: "pointer",
                padding: "4px 10px",
                fontSize: "11px",
                border: active
                  ? "1px solid currentColor"
                  : "1px solid transparent",
                opacity: filterTipe && !active ? 0.55 : 1,
              }}
            >
              {tipe} ({countsByTipe[tipe]})
            </button>
          );
        })}
        <button
          type="button"
          className="badge badge-gray"
          onClick={() => setFilterTipe("")}
          style={{
            cursor: "pointer",
            padding: "4px 10px",
            fontSize: "11px",
            border:
              filterTipe === ""
                ? "1px solid var(--border)"
                : "1px solid transparent",
          }}
        >
          Semua ({akuns.length})
        </button>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table id="coa-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Normal</th>
                <th style={{ textAlign: "right" }}>Saldo Saat Ini</th>
                <th style={{ width: "40px" }} />
              </tr>
            </thead>
            <tbody id="akun-body">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--muted)",
                    }}
                  >
                    Tidak ada akun ditemukan
                  </td>
                </tr>
              ) : showGrouped ? (
                AKUN_TIPE_ORDER.flatMap((tipe) => {
                  const group = filtered.filter((a) => a.tipe === tipe);
                  if (!group.length) return [];
                  const Icon = TIPE_META[tipe].icon;
                  const kats = Array.from(new Set(group.map((a) => a.kat)));

                  return [
                    <tr
                      key={`grp-${tipe}`}
                      style={{ background: "var(--surface2)" }}
                    >
                      <td
                        colSpan={7}
                        style={{
                          padding: "8px 16px",
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "var(--muted)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span
                          className={`badge ${tipeBadgeClass(tipe)}`}
                          style={{ marginRight: "8px" }}
                        >
                          {tipe}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            verticalAlign: "middle",
                          }}
                        >
                          <Icon size={14} /> {TIPE_META[tipe].label}
                        </span>
                        <span style={{ marginLeft: "8px", fontWeight: 400 }}>
                          ({group.length} akun)
                        </span>
                      </td>
                    </tr>,
                    ...kats.flatMap((kat) => {
                      const katGroup = group.filter((a) => a.kat === kat);
                      const subHeader =
                        kats.length > 1
                          ? [
                              <tr key={`kat-${tipe}-${kat}`}>
                                <td
                                  colSpan={7}
                                  style={{
                                    padding: "5px 16px 3px 32px",
                                    fontSize: "10px",
                                    color: "var(--muted)",
                                    fontWeight: 600,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    background: "rgba(255,255,255,0.02)",
                                  }}
                                >
                                  ── {kat || "Umum"}
                                </td>
                              </tr>,
                            ]
                          : [];
                      return [...subHeader, ...katGroup.map(renderAkunRow)];
                    }),
                  ];
                })
              ) : (
                filtered.map(renderAkunRow)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Akun */}
      <OasModalDialog
        id="modal-akun"
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Akun Baru"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAddOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSimpanAkun}
            >
              Simpan Akun
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="new-akun-kode">Kode Akun</label>
            <input
              type="text"
              id="new-akun-kode"
              placeholder="1101"
              value={newKode}
              onChange={(e) => setNewKode(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-akun-nama">Nama Akun</label>
            <input
              type="text"
              id="new-akun-nama"
              placeholder="Nama akun..."
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="new-akun-tipe">Tipe</label>
            <select
              id="new-akun-tipe"
              value={newTipe}
              onChange={(e) => setNewTipe(e.target.value as AkunTipe)}
            >
              {AKUN_TIPE_ORDER.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="new-akun-kat">Kategori</label>
            <input
              type="text"
              id="new-akun-kat"
              placeholder="Lancar, Tetap, Kontra, dll"
              value={newKat}
              onChange={(e) => setNewKat(e.target.value)}
            />
          </div>
        </div>
      </OasModalDialog>

      {/* Modal Sampah COA */}
      <OasModalDialog
        id="modal-akun-trash"
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        maxWidth="480px"
        title={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Trash2 size={15} /> Sampah Chart of Accounts
          </span>
        }
        footer={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setTrashOpen(false)}
          >
            Tutup
          </button>
        }
      >
        <div
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            marginBottom: "12px",
            lineHeight: 1.6,
          }}
        >
          Akun yang dihapus disimpan di sini selama <b>30 hari</b> sebelum
          terhapus permanen otomatis. Jurnal lama yang memakai akun ini tetap
          utuh · restore akun untuk menyambungkannya kembali.
        </div>
        <div id="akun-trash-body">
          {sortedTrash.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "30px 16px",
                color: "var(--muted)",
                fontSize: "13px",
              }}
            >
              <Trash2
                size={26}
                style={{ display: "block", margin: "0 auto 8px", opacity: 0.4 }}
              />
              Sampah COA kosong
            </div>
          ) : (
            sortedTrash.map((item) => {
              const sisaHari = akunTrashSisaHari(item.deletedAt);
              const urgent = sisaHari <= 5;
              return (
                <div
                  key={item.kode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    marginBottom: "8px",
                    background: "var(--surface2)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>
                      {item.kode} · {item.nama}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted)",
                        marginTop: "2px",
                      }}
                    >
                      {item.tipe}
                      {item.kat ? ` · ${item.kat}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "20px",
                      whiteSpace: "nowrap",
                      background: urgent
                        ? "rgba(248,113,113,0.12)"
                        : "rgba(148,163,184,0.12)",
                      color: urgent ? "var(--red)" : "var(--muted)",
                    }}
                  >
                    {sisaHari} hari lagi
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRestoreAkun(item.kode)}
                    title="Kembalikan akun ini"
                    style={{
                      background: "var(--accent2-tint)",
                      border: "1px solid var(--border-strong)",
                      color: "var(--accent2)",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "6px 10px",
                      borderRadius: "6px",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              );
            })
          )}
        </div>
      </OasModalDialog>
    </div>
  );
}
