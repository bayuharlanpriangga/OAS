import { escapeHtml } from "../../shared/format/escape-html";
import { labelPeranBisnis } from "./label-peran";

export function ringkasHasilGabung(res?: {
  nama?: string;
  peran?: string;
  hasil?: string;
}): { berhasil: boolean; pesan: string } {
  const r = res || {};
  const nama = escapeHtml(r.nama || "bisnis ini");
  const peran = labelPeranBisnis(r.peran);
  if (r.hasil === "sudah_anggota" && r.peran === "owner") {
    return {
      berhasil: false,
      pesan: `ℹ Kamu adalah pemilik bisnis "${nama}".`,
    };
  }
  if (r.hasil === "sudah_anggota") {
    return {
      berhasil: false,
      pesan: `ℹ Kamu sudah terdaftar di bisnis "${nama}" sebagai ${peran}.<br>Pilih bisnis tersebut dari daftar bisnis kamu.`,
    };
  }
  if (r.hasil === "diaktifkan") {
    return {
      berhasil: true,
      pesan: `✅ Undanganmu ke bisnis "${nama}" sebagai ${peran} sudah aktif.`,
    };
  }
  if (r.hasil === "bergabung") {
    return {
      berhasil: true,
      pesan: `✅ Berhasil bergabung ke bisnis "${nama}" sebagai ${peran}.<br>Admin bisa mengubah peran dan izin aksesmu.`,
    };
  }
  return {
    berhasil: false,
    pesan:
      "ℹ Permintaan gabung diproses, tetapi hasilnya tidak dikenali. Muat ulang daftar bisnis.",
  };
}
