import type {
  PersediaanKartuRow,
  PersediaanLayer,
  PersediaanMetode,
  PersediaanResult,
  PersediaanTxInput,
} from "@/types";

export function hitungPersediaanPure(
  rows: readonly PersediaanTxInput[],
  metode: PersediaanMetode
): PersediaanResult {
  let stock: PersediaanLayer[] = [];
  let hpp = 0;
  const kartu: PersediaanKartuRow[] = [];

  rows.forEach((r) => {
    if (r.jenis === "masuk") {
      if (metode === "wa" || metode === "mwa") {
        const totalQty = stock.reduce((s, x) => s + x.qty, 0) + r.qty;
        const totalVal =
          stock.reduce((s, x) => s + x.qty * x.harga, 0) + r.qty * r.harga;
        const hargaWA = totalQty ? totalVal / totalQty : 0;
        stock = [{ qty: totalQty, harga: hargaWA }];
      } else {
        stock.push({ qty: r.qty, harga: r.harga });
      }
      const saldoLayers = stock.filter((x) => x.qty > 0).map((x) => ({ ...x }));
      kartu.push({
        tgl: r.tgl,
        ket: r.ket || "masuk",
        mQty: r.qty,
        mHarga: r.harga,
        mJml: r.qty * r.harga,
        kQty: "",
        kHarga: "",
        kJml: "",
        saldoLayers,
      });
    } else {
      let qKeluarSisa = r.qty;
      let hppBatch = 0;
      let keluarLayers: PersediaanLayer[] = [];

      if (metode === "fifo") {
        while (qKeluarSisa > 0 && stock.length) {
          const layer = stock[0];
          const ambil = Math.min(layer.qty, qKeluarSisa);
          hppBatch += ambil * layer.harga;
          keluarLayers.push({ qty: ambil, harga: layer.harga });
          layer.qty -= ambil;
          qKeluarSisa -= ambil;
          if (layer.qty <= 0) stock.shift();
        }
      } else if (metode === "lifo") {
        while (qKeluarSisa > 0 && stock.length) {
          const layer = stock[stock.length - 1];
          const ambil = Math.min(layer.qty, qKeluarSisa);
          hppBatch += ambil * layer.harga;
          keluarLayers.push({ qty: ambil, harga: layer.harga });
          layer.qty -= ambil;
          qKeluarSisa -= ambil;
          if (layer.qty <= 0) stock.pop();
        }
      } else {
        const totalQty = stock.reduce((s, x) => s + x.qty, 0);
        const totalVal = stock.reduce((s, x) => s + x.qty * x.harga, 0);
        const hargaWA = totalQty ? totalVal / totalQty : 0;
        hppBatch = hargaWA * r.qty;
        keluarLayers = [{ qty: r.qty, harga: hargaWA }];
        let sisa2 = r.qty;
        for (let i = 0; i < stock.length && sisa2 > 0; i++) {
          const ambil = Math.min(stock[i].qty, sisa2);
          stock[i].qty -= ambil;
          sisa2 -= ambil;
        }
        stock = stock.filter((x) => x.qty > 0);
      }

      hpp += hppBatch;
      const hppPerUnit = r.qty ? hppBatch / r.qty : 0;
      const saldoLayers = stock.filter((x) => x.qty > 0).map((x) => ({ ...x }));
      kartu.push({
        tgl: r.tgl,
        ket: r.ket || "keluar",
        mQty: "",
        mHarga: "",
        mJml: "",
        kQty: r.qty,
        kHarga: hppPerUnit,
        kJml: hppBatch,
        keluarLayers,
        saldoLayers,
      });
    }
  });

  const akhirQty = stock.reduce((s, x) => s + x.qty, 0);
  const akhirVal = stock.reduce((s, x) => s + x.qty * x.harga, 0);
  return {
    metode,
    hpp,
    akhirQty,
    akhirVal,
    kartu,
    stock: stock.map((x) => ({ ...x })),
  };
}
