// Ukuran teks dari halaman Pengaturan. Tanpa hook React, supaya bisa diimpor
// root layout (server component) untuk skrip di <head>.

// --- Ukuran teks. Disimpan di localStorage (preferensi per perangkat) dan
// dipasang sebagai atribut <html data-ukuran-teks>; CSS-nya di app/globals.css.

export const UKURAN_TEKS = [
  { nilai: "normal", label: "Normal", contoh: "text-base" },
  { nilai: "besar", label: "Besar", contoh: "text-lg" },
  { nilai: "sangat-besar", label: "Sangat besar", contoh: "text-xl" },
] as const;

export type UkuranTeks = (typeof UKURAN_TEKS)[number]["nilai"];

export const KUNCI_UKURAN_TEKS = "panenpasti:ukuran-teks";

/**
 * Skrip kecil di <head> yang memasang ukuran teks sebelum halaman tampil,
 * supaya tidak berkedip dari normal ke besar. Nilai dibatasi ke daftar di atas.
 */
export const SKRIP_UKURAN_TEKS = `try{var u=localStorage.getItem(${JSON.stringify(KUNCI_UKURAN_TEKS)});if(u==="besar"||u==="sangat-besar")document.documentElement.dataset.ukuranTeks=u}catch(e){}`;

export function bacaUkuranTeks(): UkuranTeks {
  try {
    const u = localStorage.getItem(KUNCI_UKURAN_TEKS);
    return UKURAN_TEKS.some((x) => x.nilai === u) ? (u as UkuranTeks) : "normal";
  } catch {
    return "normal";
  }
}

export function pasangUkuranTeks(u: UkuranTeks) {
  if (u === "normal") delete document.documentElement.dataset.ukuranTeks;
  else document.documentElement.dataset.ukuranTeks = u;
  try {
    localStorage.setItem(KUNCI_UKURAN_TEKS, u);
  } catch {
    // Mode privat / penyimpanan diblokir: tetap berlaku sampai halaman ditutup.
  }
}
