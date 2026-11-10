const RUPIAH = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 60000 → "Rp60.000" */
export function formatRupiah(n: number): string {
  return `Rp${RUPIAH.format(Math.round(n))}`;
}

/** 0.5 → "0,5 kg", 1200 → "1.200 kg" */
export function formatKg(n: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n)} kg`;
}
