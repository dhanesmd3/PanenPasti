import type { ButtonHTMLAttributes } from "react";

export type VarianTombol = "utama" | "kedua" | "bahaya" | "teks";

const VARIAN: Record<VarianTombol, string> = {
  utama: "bg-terakota text-teks shadow-sm hover:bg-aprikot",
  kedua: "bg-kartu text-teks ring-1 ring-garis hover:bg-pasir/60",
  bahaya: "bg-kartu text-cabai ring-1 ring-cabai/40 hover:bg-cabai-muda",
  teks: "text-daun underline-offset-4 hover:underline",
};

/** Kelas tombol, juga dipakai untuk <Link> yang tampil seperti tombol. */
export function kelasTombol(varian: VarianTombol = "utama", penuh = false): string {
  return [
    "label-cetak inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base",
    "transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-daun",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIAN[varian],
    penuh ? "w-full" : "",
  ].join(" ");
}

export function Button({
  varian = "utama",
  penuh = false,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: VarianTombol; penuh?: boolean }) {
  return <button type={type} className={`${kelasTombol(varian, penuh)} ${className}`} {...props} />;
}
