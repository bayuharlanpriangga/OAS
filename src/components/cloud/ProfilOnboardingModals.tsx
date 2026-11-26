"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  COMPANY_LOGO_KEY,
  MATA_UANG_OPTIONS,
  OB_BUSINESS_TYPES,
  ONBOARDED_KEY,
  TAHUN_BUKU_OPTIONS,
  getCompanyLogo,
  getProfil,
  handleLogoUpload,
  openPhotoViewer,
  registerReactModal,
  saveProfilLocal,
  type ProfilPerusahaan,
} from "@/lib/cloud/profil";
import {
  callOasGlobal,
  readCurrentCompany,
  setOasWindowFn,
  writeCurrentCompany,
} from "@/lib/shared/legacy-store";

type ProfilMode = "view" | "edit";

const EMPTY_PROFIL: ProfilPerusahaan = {
  nama: "",
  jenis: "",
  pemilik: "",
  alamat: "",
  telp: "",
  npwp: "",
  email: "",
  website: "",
  provinsi: "",
  kabkota: "",
  kecamatan: "",
  kelurahan: "",
  tahunBuku: "jan",
  matauang: "IDR",
};

export function ProfilOnboardingModals() {
  const [profilOpen, setProfilOpen] = useState(false);
  const [mode, setMode] = useState<ProfilMode>("view");
  const [form, setForm] = useState<ProfilPerusahaan>(EMPTY_PROFIL);
  const [logo, setLogo] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);

  const [tbPickerOpen, setTbPickerOpen] = useState(false);
  const [muPickerOpen, setMuPickerOpen] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [obOpen, setObOpen] = useState(false);
  const [obStep, setObStep] = useState<1 | 2 | 3>(1);
  const [obNama, setObNama] = useState("");
  const [obNamaError, setObNamaError] = useState(false);
  const [obType, setObType] = useState("umum");

  const hydrateFromStorage = useCallback(() => {
    const p = getProfil();
    setForm({
      nama: p.nama || "",
      jenis: p.jenis || "",
      pemilik: p.pemilik || "",
      alamat: p.alamat || "",
      telp: p.telp || "",
      npwp: p.npwp || "",
      email: p.email || "",
      website: p.website || "",
      provinsi: p.provinsi || "",
      kabkota: p.kabkota || "",
      kecamatan: p.kecamatan || "",
      kelurahan: p.kelurahan || "",
      tahunBuku: p.tahunBuku || "jan",
      matauang: p.matauang || "IDR",
    });
    setLogo(getCompanyLogo());
    return p;
  }, []);

  const openProfilModal = useCallback(
    (forceMode?: ProfilMode) => {
      const p = hydrateFromStorage();
      setMode(forceMode ?? (p.nama ? "view" : "edit"));
      setProfilOpen(true);
    },
    [hydrateFromStorage]
  );

  useEffect(() => {
    const onLogoUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ logo?: string }>).detail;
      setLogo(detail?.logo ?? getCompanyLogo());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === COMPANY_LOGO_KEY) setLogo(getCompanyLogo());
    };
    window.addEventListener("oas:company-logo-updated", onLogoUpdate);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("oas:company-logo-updated", onLogoUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!saveSuccessOpen) return;
    const t = setTimeout(() => setSaveSuccessOpen(false), 4000);
    return () => clearTimeout(t);
  }, [saveSuccessOpen]);

  useEffect(() => {
    const unregProfil = registerReactModal(
      "modal-profil",
      () => openProfilModal(),
      () => setProfilOpen(false)
    );
    const unregOb = registerReactModal(
      "modal-onboarding",
      () => {
        setObStep(1);
        setObNama(getProfil().nama || "");
        setObNamaError(false);
        setObType("umum");
        setObOpen(true);
      },
      () => setObOpen(false)
    );

    setOasWindowFn("loadProfil", () => {
      openProfilModal();
    });

    setOasWindowFn("switchProfilMode", (nextMode: ProfilMode) => {
      hydrateFromStorage();
      setMode(nextMode === "edit" ? "edit" : "view");
    });

    setOasWindowFn("checkShowOnboarding", () => {
      const p = getProfil();
      const visited = localStorage.getItem(ONBOARDED_KEY);
      if (!visited && !p.nama) {
        setTimeout(() => {
          setObStep(1);
          setObNama("");
          setObNamaError(false);
          setObType("umum");
          setObOpen(true);
        }, 800);
      }
    });

    return () => {
      unregProfil();
      unregOb();
    };
  }, [hydrateFromStorage, openProfilModal]);

  const handleSaveProfil = async () => {
    if (saving) return;
    setSaving(true);
    const payload: ProfilPerusahaan = {
      nama: (form.nama || "").trim(),
      jenis: (form.jenis || "").trim(),
      pemilik: (form.pemilik || "").trim(),
      alamat: (form.alamat || "").trim(),
      telp: (form.telp || "").trim(),
      npwp: (form.npwp || "").trim(),
      email: (form.email || "").trim(),
      website: (form.website || "").trim(),
      provinsi: (form.provinsi || "").trim(),
      kabkota: (form.kabkota || "").trim(),
      kecamatan: (form.kecamatan || "").trim(),
      kelurahan: (form.kelurahan || "").trim(),
      tahunBuku: form.tahunBuku || "jan",
      matauang: form.matauang || "IDR",
    };

    try {
      saveProfilLocal(payload);
      setForm(payload);
      if (readCurrentCompany()) {
        await callOasGlobal("saveProfilToSupabase", payload);
      }
      callOasGlobal("markDirty");
      callOasGlobal("auditLog", "edit", "system", "Profil perusahaan diperbarui", {
        nama: payload.nama,
      });
      setMode("view");
      setSaveSuccessOpen(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    setOasWindowFn("saveProfil", () => {
      void handleSaveProfil();
    });
  });

  const handleObNext = () => {
    if (obStep === 1) {
      const trimmed = obNama.trim();
      if (!trimmed) {
        setObNamaError(true);
        return;
      }
      const p = getProfil();
      p.nama = trimmed;
      saveProfilLocal(p);
      setObNamaError(false);
      setObStep(2);
    } else if (obStep === 2) {
      const p = getProfil();
      p.jenis = obType;
      saveProfilLocal(p);
      const co = readCurrentCompany();
      if (co) {
        writeCurrentCompany({ ...co, type: obType });
      }
      setObStep(3);
    } else {
      localStorage.setItem(ONBOARDED_KEY, "1");
      setObOpen(false);
      callOasGlobal("renderDashboard");
      callOasGlobal(
        "showAlert",
        '<i class="ti ti-circle-check" style="color:var(--green);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Selamat datang! Software siap digunakan.'
      );
    }
  };

  const handleObBack = () => {
    if (obStep === 2) setObStep(1);
    else if (obStep === 3) setObStep(2);
  };

  const selectedTb =
    TAHUN_BUKU_OPTIONS.find((t) => t.value === (form.tahunBuku || "jan")) ||
    TAHUN_BUKU_OPTIONS[0];
  const selectedMu =
    MATA_UANG_OPTIONS.find((m) => m.value === (form.matauang || "IDR")) ||
    MATA_UANG_OPTIONS[0];

  const updateField = (key: keyof ProfilPerusahaan, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <>
      <OasModalDialog
        id="modal-profil"
        open={profilOpen}
        onClose={() => setProfilOpen(false)}
        maxWidth="500px"
        title={
          <>
            <i className="ti ti-building ti-btn" /> Profil Perusahaan
          </>
        }
        footer={
          mode === "view" ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setProfilOpen(false)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setMode("edit")}
              >
                <i
                  className="ti ti-pencil"
                  style={{ fontSize: 14, verticalAlign: -2 }}
                />{" "}
                Edit Profil
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  hydrateFromStorage();
                  setMode("view");
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => void handleSaveProfil()}
              >
                {saving ? (
                  "Menyimpan..."
                ) : (
                  <>
                    <i
                      className="ti ti-device-floppy"
                      style={{ fontSize: 14, verticalAlign: -2 }}
                    />{" "}
                    Simpan Profil
                  </>
                )}
              </button>
            </>
          )
        }
      >
        {mode === "view" ? (
          <div>
            <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  background: "var(--surface2)",
                  border: "2px solid var(--border)",
                  margin: "0 auto 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo Perusahaan"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 14,
                      cursor: "pointer",
                    }}
                    onClick={() => openPhotoViewer(logo, "rounded")}
                    title="Lihat logo"
                  />
                ) : (
                  <i
                    className="ti ti-building"
                    style={{ fontSize: 28, color: "var(--muted)" }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.3,
                }}
              >
                {form.nama || "(belum diisi)"}
              </div>
              {form.jenis && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 3,
                  }}
                >
                  {form.jenis}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {form.pemilik && (
                <div
                  style={{
                    background: "var(--surface2)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <i
                    className="ti ti-user"
                    style={{ fontSize: 16, color: "var(--muted)", flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      PEMILIK
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                      {form.pemilik}
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "var(--surface2)",
                  borderRadius: 10,
                  padding: "11px 14px",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <i
                  className="ti ti-phone"
                  style={{ fontSize: 16, color: "var(--muted)", flexShrink: 0 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                    }}
                  >
                    TELEPON
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                    {form.telp || "-"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface2)",
                  borderRadius: 10,
                  padding: "11px 14px",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <i
                  className="ti ti-map-pin"
                  style={{
                    fontSize: 16,
                    color: "var(--muted)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                    }}
                  >
                    ALAMAT
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text)",
                      lineHeight: 1.4,
                    }}
                  >
                    {form.alamat || "-"}
                  </div>
                </div>
              </div>

              {form.npwp && (
                <div
                  style={{
                    background: "var(--surface2)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <i
                    className="ti ti-id"
                    style={{ fontSize: 16, color: "var(--muted)", flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      NPWP
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text)",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {form.npwp}
                    </div>
                  </div>
                </div>
              )}

              {form.email && (
                <div
                  style={{
                    background: "var(--surface2)",
                    borderRadius: 10,
                    padding: "11px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <i
                    className="ti ti-mail"
                    style={{ fontSize: 16, color: "var(--muted)", flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--muted)",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                      }}
                    >
                      EMAIL
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                      {form.email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: "center", padding: "4px 0 12px" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 14,
                    background: "var(--surface2)",
                    border: "2px dashed var(--border)",
                    margin: "0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  {logo ? (
                    <img
                      src={logo}
                      alt="Logo"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 12,
                      }}
                    />
                  ) : (
                    <i
                      className="ti ti-building"
                      style={{ fontSize: 26, color: "var(--muted)" }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  title="Upload logo"
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "var(--accent-fg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    border: "2px solid var(--bg)",
                    padding: 0,
                  }}
                >
                  <i className="ti ti-camera" style={{ fontSize: 12 }} />
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleLogoUpload(e.target)}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                Ketuk untuk upload logo perusahaan
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nama Perusahaan</label>
                <input
                  type="text"
                  value={form.nama || ""}
                  onChange={(e) => updateField("nama", e.target.value)}
                  placeholder="PT Maju Bersama"
                />
              </div>
              <div className="form-group">
                <label>Jenis Usaha</label>
                <input
                  type="text"
                  value={form.jenis || ""}
                  onChange={(e) => updateField("jenis", e.target.value)}
                  placeholder="Perdagangan / Jasa / Manufaktur"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nama Pemilik</label>
                <input
                  type="text"
                  value={form.pemilik || ""}
                  onChange={(e) => updateField("pemilik", e.target.value)}
                  placeholder="Nama lengkap pemilik / direktur"
                />
              </div>
              <div className="form-group">
                <label>Telepon</label>
                <input
                  type="text"
                  value={form.telp || ""}
                  onChange={(e) => updateField("telp", e.target.value)}
                  placeholder="021-12345678"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Alamat</label>
                <input
                  type="text"
                  value={form.alamat || ""}
                  onChange={(e) => updateField("alamat", e.target.value)}
                  placeholder="Jl. Sudirman No. 1, Jakarta"
                />
              </div>
              <div className="form-group">
                <label>NPWP</label>
                <input
                  type="text"
                  value={form.npwp || ""}
                  onChange={(e) => updateField("npwp", e.target.value)}
                  placeholder="00.000.000.0-000.000"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="info@perusahaan.com"
                />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input
                  type="text"
                  value={form.website || ""}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://perusahaan.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Provinsi</label>
                <input
                  type="text"
                  value={form.provinsi || ""}
                  onChange={(e) => updateField("provinsi", e.target.value)}
                  placeholder="Jawa Barat"
                />
              </div>
              <div className="form-group">
                <label>Kabupaten / Kota</label>
                <input
                  type="text"
                  value={form.kabkota || ""}
                  onChange={(e) => updateField("kabkota", e.target.value)}
                  placeholder="Kota Bandung"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Kecamatan</label>
                <input
                  type="text"
                  value={form.kecamatan || ""}
                  onChange={(e) => updateField("kecamatan", e.target.value)}
                  placeholder="Cicendo"
                />
              </div>
              <div className="form-group">
                <label>Kelurahan</label>
                <input
                  type="text"
                  value={form.kelurahan || ""}
                  onChange={(e) => updateField("kelurahan", e.target.value)}
                  placeholder="Arjuna"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tahun Buku</label>
                <button
                  type="button"
                  className={`oas-picker-trigger${tbPickerOpen ? " open" : ""}`}
                  onClick={() => setTbPickerOpen(true)}
                >
                  <span>
                    <i
                      className={selectedTb.iconClass || "ti ti-calendar"}
                      style={{
                        fontSize: 13,
                        verticalAlign: -2,
                        marginRight: 4,
                      }}
                    />{" "}
                    {selectedTb.label}
                  </span>
                  <i className="ti ti-chevron-down" style={{ fontSize: 15 }} />
                </button>
              </div>
              <div className="form-group">
                <label>Mata Uang</label>
                <button
                  type="button"
                  className={`oas-picker-trigger${muPickerOpen ? " open" : ""}`}
                  onClick={() => setMuPickerOpen(true)}
                >
                  <span>
                    <b
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--mono)",
                        marginRight: 5,
                      }}
                    >
                      {selectedMu.symbol || "Rp"}
                    </b>
                    {selectedMu.label}
                  </span>
                  <i className="ti ti-chevron-down" style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </OasModalDialog>

      <OasModalDialog
        open={tbPickerOpen}
        onClose={() => setTbPickerOpen(false)}
        maxWidth="400px"
        title={
          <>
            <i className="ti ti-calendar ti-btn" /> Pilih Tahun Buku
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TAHUN_BUKU_OPTIONS.map((opt) => {
            const selected = (form.tahunBuku || "jan") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`oas-picker-option${selected ? " selected" : ""}`}
                onClick={() => {
                  updateField("tahunBuku", opt.value);
                  setTbPickerOpen(false);
                }}
              >
                <span className="opt-icon">
                  <i className={opt.iconClass} style={{ fontSize: 18 }} />
                </span>
                <span className="opt-body">
                  <span className="opt-label">{opt.label}</span>
                  <span className="opt-sub">{opt.sub}</span>
                </span>
                <span className="opt-check" />
              </button>
            );
          })}
        </div>
      </OasModalDialog>

      <OasModalDialog
        open={muPickerOpen}
        onClose={() => setMuPickerOpen(false)}
        maxWidth="400px"
        title={
          <>
            <i className="ti ti-currency ti-btn" /> Pilih Mata Uang
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {MATA_UANG_OPTIONS.map((opt) => {
            const selected = (form.matauang || "IDR") === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`oas-picker-option${selected ? " selected" : ""}`}
                onClick={() => {
                  updateField("matauang", opt.value);
                  setMuPickerOpen(false);
                }}
              >
                <span className="opt-icon">
                  <b style={{ fontSize: 12, fontFamily: "var(--mono)" }}>
                    {opt.symbol}
                  </b>
                </span>
                <span className="opt-body">
                  <span className="opt-label">{opt.label}</span>
                  <span className="opt-sub">{opt.sub}</span>
                </span>
                <span className="opt-check" />
              </button>
            );
          })}
        </div>
      </OasModalDialog>

      <OasModalDialog
        open={saveSuccessOpen}
        onClose={() => setSaveSuccessOpen(false)}
        maxWidth="340px"
        title="Profil Tersimpan!"
        footer={
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => setSaveSuccessOpen(false)}
          >
            OK
          </button>
        }
      >
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "var(--green-tint)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              border: "1px solid rgba(78,154,107,0.35)",
            }}
          >
            <i
              className="ti ti-check"
              style={{ fontSize: 26, color: "var(--green)" }}
            />
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Data profil perusahaan berhasil disimpan.
          </div>
        </div>
      </OasModalDialog>

      <OasModalDialog
        id="modal-onboarding"
        open={obOpen}
        onClose={() => setObOpen(false)}
        maxWidth="520px"
        title={
          <div>
            <div style={{ fontSize: 18 }}>Selamat Datang!</div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                fontWeight: 400,
                marginTop: 2,
              }}
            >
              Setup awal · hanya 1 menit
            </div>
          </div>
        }
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background:
                      obStep >= dot ? "var(--accent)" : "var(--border)",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {obStep > 1 && (
                <button
                  type="button"
                  onClick={handleObBack}
                  className="btn btn-ghost"
                >
                  ← Kembali
                </button>
              )}
              <button
                type="button"
                onClick={handleObNext}
                className="btn btn-primary"
              >
                {obStep === 3 ? "Mulai Sekarang" : "Lanjut →"}
              </button>
            </div>
          </div>
        }
      >
        {obStep === 1 && (
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div
              style={{
                marginBottom: 12,
                display: "flex",
                justifyContent: "center",
                color: "var(--accent-text)",
              }}
            >
              <i className="ti ti-home-2" style={{ fontSize: 44 }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Nama bisnis kamu?
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                marginBottom: 20,
              }}
            >
              Akan muncul di semua laporan &amp; export
            </div>
            <input
              type="text"
              value={obNama}
              onChange={(e) => {
                setObNama(e.target.value);
                if (obNamaError) setObNamaError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleObNext();
              }}
              placeholder="Contoh: Toko Maju Bersama"
              style={{
                width: "100%",
                background: "var(--surface2)",
                border: `2px solid ${
                  obNamaError
                    ? "var(--red)"
                    : obNama
                    ? "var(--accent)"
                    : "var(--border)"
                }`,
                borderRadius: 10,
                padding: "12px 16px",
                color: "var(--text)",
                fontSize: 15,
                outline: "none",
                textAlign: "center",
                fontFamily: "var(--sans)",
              }}
            />
          </div>
        )}

        {obStep === 2 && (
          <div>
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div
                style={{
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "center",
                  color: "var(--accent-text)",
                }}
              >
                <i className="ti ti-building-store" style={{ fontSize: 44 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                Jenis bisnis kamu?
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 16,
                }}
              >
                Semua akun tetap tersedia · ini cuma buat kategori bisnismu
              </div>
            </div>
            <div
              className="kalk-grid"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              {OB_BUSINESS_TYPES.map((t) => {
                const selected = obType === t.val;
                return (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setObType(t.val)}
                    style={{
                      gridColumn: t.fullWidth ? "1 / -1" : undefined,
                      background: selected
                        ? "var(--accent-tint)"
                        : "var(--surface2)",
                      border: `2px solid ${
                        selected ? "var(--accent)" : "var(--border)"
                      }`,
                      borderRadius: 10,
                      padding: 16,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      color: "var(--text)",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "center",
                        color: "var(--accent-text)",
                      }}
                    >
                      <i className={t.iconClass} style={{ fontSize: 28 }} />
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {obStep === 3 && (
          <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                background: "var(--green-tint)",
                border: "1px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <i
                className="ti ti-circle-check"
                style={{ color: "var(--green)", fontSize: 26 }}
              />
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--accent-text)",
                marginBottom: 8,
              }}
            >
              Siap, {obNama.trim() || "Pengguna"}!
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--muted)",
                lineHeight: 1.7,
              }}
            >
              Semua akun sudah siap dipakai. Kamu bisa mulai input transaksi
              sekarang.
            </div>
          </div>
        )}
      </OasModalDialog>
    </>
  );
}
