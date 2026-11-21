import type { JurnalEntry } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting/constants";
import { fmtRp } from "../../shared/format/rupiah";
import { callOasGlobal } from "../../shared/legacy-store/panggil-global";
import { readJurnalEntries } from "../../shared/legacy-store/baca-jurnal";
import { checkAndInputKalkulator } from "../shared/validasi-input";
import { nextKode } from "../shared/kode-berikut";
import { readInputVal } from "../shared/baca-input";
import { showKalkUndoBar } from "../shared/banner-undo";
import { kalkulatorState } from "../shared/state";

export function inputPenyusutanJurnal(): void {
  const cost = parseFloat(readInputVal("py-cost")) || 0;
  const umur = parseInt(readInputVal("py-umur"), 10) || 0;
  const nama = readInputVal("py-nama") || "Aset Tetap";
  const metode = readInputVal("py-metode");

  if (!cost || !umur) {
    callOasGlobal("showAlert", "Hitung penyusutan dulu!");
    return;
  }

  const rows = document.querySelectorAll("#py-tabel-body tr");
  if (!rows.length) {
    callOasGlobal("showAlert", 'Klik "Hitung & Generate Tabel" dulu!');
    return;
  }

  const inputModalPromise = callOasGlobal("showCustomInputModal", {
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4"/></svg>',
    iconColor: "rgba(74,222,128,0.15)",
    iconBorder: "rgba(74,222,128,0.3)",
    title: "Input Jurnal Penyusutan",
    subtitle: "Pilih tahun penyusutan yang ingin diinput ke jurnal",
    rows: [
      { label: "Nama Aset", value: nama || "—", color: "var(--text)" },
      { label: "Umur Ekonomis", value: `${umur} tahun`, color: "var(--accent2)" },
    ],
    inputLabel: `Tahun ke berapa yang ingin diinput? (1 – ${umur}):`,
    inputDefault: 1,
    btnLabel: "✓ Lanjut Pilih Akun",
  }) as Promise<string | null> | undefined;

  if (!inputModalPromise?.then) return;

  inputModalPromise.then((tahunVal) => {
    if (tahunVal === null) return;
    const t = parseInt(tahunVal, 10);
    if (t < 1 || t > umur) {
      callOasGlobal("showAlert", "Tahun tidak valid");
      return;
    }

    const row = rows[t - 1];
    if (!row) {
      callOasGlobal("showAlert", "Data baris tidak ditemukan");
      return;
    }
    const tds = row.querySelectorAll("td");
    const beban =
      parseFloat((tds[1]?.textContent || "").replace(/[^0-9]/g, "")) || 0;
    if (!beban) {
      callOasGlobal("showAlert", "Nilai penyusutan tidak valid");
      return;
    }

    const kode = nextKode("DEP");
    const today = new Date().toISOString().split("T")[0];

    const akunMap: Record<string, [string, string, string]> = {
      bangunan: ["1703", "6301", "Bangunan"],
      kendaraan: ["1712", "6302", "Kendaraan"],
      peralatan: ["1722", "6303", "Peralatan Kantor"],
      mesin: ["1732", "6304", "Mesin & Alat Produksi"],
      komputer: ["1752", "6305", "Komputer & Laptop"],
      inventaris: ["1742", "6303", "Inventaris & Furnitur"],
    };

    const selectModalPromise = callOasGlobal("showCustomSelectModal", {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
      iconColor: "rgba(34,211,238,0.15)",
      iconBorder: "rgba(34,211,238,0.3)",
      title: "Pilih Jenis Aset",
      subtitle: `Penyusutan Tahun ke-${t} — ${fmtRp(beban)}`,
      options: [
        { value: "bangunan", label: "Bangunan", sub: "Akun 1702/1703 ↔ 6301" },
        { value: "kendaraan", label: "Kendaraan", sub: "Akun 1711/1712 ↔ 6302" },
        {
          value: "peralatan",
          label: "Peralatan Kantor",
          sub: "Akun 1721/1722 ↔ 6303",
        },
        {
          value: "mesin",
          label: "Mesin & Alat Produksi",
          sub: "Akun 1731/1732 ↔ 6304",
        },
        {
          value: "komputer",
          label: "Komputer & Laptop",
          sub: "Akun 1751/1752 ↔ 6305",
        },
        {
          value: "inventaris",
          label: "Inventaris & Furnitur",
          sub: "Akun 1741/1742 ↔ 6303",
        },
      ],
      btnLabel: "✓ Input Jurnal Penyusutan",
    }) as Promise<string | null> | undefined;

    if (!selectModalPromise?.then) return;

    selectModalPromise.then((pilihan) => {
      if (pilihan === null) return;
      const [akumKode, bebanKode] = akunMap[pilihan] || akunMap.kendaraan;
      const akumNama = String(
        callOasGlobal("getAkunNama", akumKode) || akumKode
      );
      const bebanNama = String(
        callOasGlobal("getAkunNama", bebanKode) || bebanKode
      );

      const jurnal: JurnalEntry = {
        tanggal: today,
        ket: `Penyusutan ${nama} Tahun ke-${t} [${metode}]`,
        jenis: JENIS_JURNAL.PENYUSUTAN,
        kodeRef: kode,
        lines: [
          { akun: bebanKode, ket: bebanNama, debit: beban, kredit: 0 },
          { akun: akumKode, ket: akumNama, debit: 0, kredit: beban },
        ],
      };

      const beforeCount = readJurnalEntries().length;
      checkAndInputKalkulator(
        kode,
        [jurnal],
        `Jurnal penyusutan ${nama} Rp ${beban.toLocaleString("id-ID")} berhasil diinput`,
        (k) => {
          kalkulatorState.lastInput = { kode: k, jurnalIndices: [beforeCount] };
          showKalkUndoBar(`DEP: ${nama} Tahun ke-${t}`, k);
        }
      );
    });
  });
}
