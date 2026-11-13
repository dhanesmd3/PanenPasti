import Link from "next/link";
import { TurTamu } from "@/components/TurTamu";
import { kelasTombol } from "@/components/ui/Button";
import { IlustrasiLadang } from "@/components/ui/IlustrasiLadang";
import { Gelombang } from "@/components/ui/Gelombang";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";
import { Logo } from "@/components/ui/Logo";

const BUKTI = [
  {
    angka: "Rp42–50 rb vs Rp100 rb",
    teks: "Harga cabai rawit di petani vs di konsumen, Oktober 2026.",
    sumber: "detikFinance, 25 Okt 2026",
    url: "https://finance.detik.com/berita-ekonomi-bisnis/d-8723492/petani-ungkap-biang-kerok-harga-cabai-masih-mahal/amp",
  },
  {
    angka: "hingga 50%",
    teks: "Keuntungan warung makan terpangkas saat cabai rawit naik dari Rp40 rb ke Rp70 rb/kg.",
    sumber: "Disway Malang, 23 Sep 2026",
    url: "https://malang.disway.id/malang-melintang/read/23136/lonjakan-harga-cabai-jerat-pedagang-warung-makan-di-malang-omzet-merosot-hingga-50-persen",
  },
];

const LANGKAH: { ikon: NamaIkon; judul: string; teks: string }[] = [
  {
    ikon: "tunas",
    judul: "Petani mencatat panen",
    teks: "Jumlah, perkiraan tanggal panen, dan harga yang ia tentukan sendiri.",
  },
  {
    ikon: "kilau",
    judul: "Warung menulis kebutuhan",
    teks: "Cukup ketik “butuh 20 kg cabai rawit tiap Senin”. AI mengisi formnya.",
  },
  {
    ikon: "centang",
    judul: "Dicocokkan otomatis",
    teks: "Berdasarkan tanggal panen, jumlah, dan jarak. Lalu pre-order, tanpa ijon.",
  },
];

const DUA_SISI: { ikon: NamaIkon; untuk: string; judul: string; poin: string[] }[] = [
  {
    ikon: "tunas",
    untuk: "Untuk petani & koperasi",
    judul: "Pembeli pasti sebelum panen",
    poin: [
      "Harga ditentukan sendiri, bukan oleh pengepul",
      "Tahu kapan sebaiknya menjual dari prediksi harga",
      "Panen berlebih bisa ditawarkan sebagai surplus",
    ],
  },
  {
    ikon: "toko",
    untuk: "Untuk warung, resto & katering",
    judul: "Bahan baku aman, harga jelas",
    poin: [
      "Pesan jauh hari, tidak kaget saat harga melonjak",
      "Langsung dari petani terdekat, dengan skor kecocokan",
      "Kalau gagal panen, langsung ditawari penjual pengganti",
    ],
  },
];

export default function Page() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative isolate flex min-h-[560px] flex-col items-center justify-end overflow-hidden px-4 pb-20 md:min-h-[680px] md:pb-28">
        <IlustrasiLadang className="absolute inset-0 -z-10 size-full" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-teks/60 via-teks/10 to-transparent"
        />
        <p className="label-cetak animasi-muncul mb-3 hidden rounded-full bg-kartu/20 px-4 py-1 text-xs text-kartu backdrop-blur-sm sm:block">
          Pre-order hasil panen · Garut → Bandung
        </p>
        <h1 className="animasi-muncul text-center font-serif text-[2.75rem] leading-[1.05] text-kartu [animation-delay:80ms] md:text-8xl">
          Panen yang <span className="italic">pasti</span>
        </h1>
        <p className="animasi-muncul mt-3 max-w-xl text-center text-base sm:text-lg text-kartu/90 [animation-delay:160ms] md:text-xl">
          Pre-order hasil panen yang adil, bukan ijon.
        </p>
        <div className="animasi-muncul mt-6 flex gap-3 [animation-delay:240ms]">
          <Link href="/daftar" className={kelasTombol("utama")}>
            Daftar gratis
          </Link>
          <Link href="/masuk" className={kelasTombol("kedua")}>
            Masuk
          </Link>
        </div>
        <TurTamu />
        <Gelombang className="absolute inset-x-0 bottom-0 text-latar" />
      </section>

      <section className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="font-serif text-2xl leading-relaxed md:text-3xl">
          PanenPasti menghubungkan kelompok tani di Garut dengan warung, resto, dan katering di Kota Bandung.
          Pembeli memesan sebelum panen, harga transparan, dan petani yang menentukan.
        </p>
      </section>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-20">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-serif text-4xl md:text-5xl">Masalahnya</h2>
          <p className="text-redup">Contoh nyata dari cabai rawit, komoditas pertama kami.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {BUKTI.map((b) => (
            <div
              key={b.angka}
              className="muncul-gulir flex flex-col gap-3 rounded-3xl bg-kartu p-8 shadow-sm"
            >
              <p className="font-serif text-3xl text-cabai md:text-4xl">{b.angka}</p>
              <p className="text-lg">{b.teks}</p>
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="label-cetak mt-auto text-xs text-redup underline-offset-4 hover:underline"
              >
                Sumber: {b.sumber}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-24 md:grid-cols-2">
        {DUA_SISI.map((d, i) => (
          <div
            key={d.untuk}
            data-tur={i === 0 ? "sisi-penjual" : "sisi-pembeli"}
            className={`muncul-gulir flex flex-col gap-5 rounded-3xl p-8 md:p-10 ${i === 0 ? "bg-sage/70" : "bg-pasir/70"}`}
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-kartu text-daun shadow-sm">
              <Ikon nama={d.ikon} className="size-7" />
            </span>
            <div>
              <p className="label-cetak text-xs text-redup">{d.untuk}</p>
              <h2 className="font-serif text-3xl leading-tight">{d.judul}</h2>
            </div>
            <ul className="flex flex-col gap-3">
              {d.poin.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-kartu text-daun">
                    <Ikon nama="centang" className="size-3.5" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <Gelombang className="text-kartu" />
      <section id="cara-kerja" className="bg-kartu">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20">
          <h2 className="text-center font-serif text-4xl md:text-5xl">Cara kerjanya</h2>
          <ol data-tur="cara-kerja" className="grid gap-6 md:grid-cols-3">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="muncul-gulir flex flex-col gap-3 rounded-3xl bg-latar/70 p-8">
                <span className="flex size-12 items-center justify-center rounded-full bg-terakota text-teks">
                  <Ikon nama={l.ikon} className="size-6" />
                </span>
                <p className="font-serif text-xl">
                  <span className="text-redup">{i + 1}.</span> {l.judul}
                </p>
                <p className="text-redup">{l.teks}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-redup">Petani atau warung, daftarnya sama mudahnya.</p>
            <Link href="/daftar" className={kelasTombol("utama")}>
              Daftar gratis <Ikon nama="panah" className="size-4" />
            </Link>
          </div>
        </div>
      </section>
      <Gelombang balik className="text-kartu" />

      <section className="px-4 py-20">
        <div className="muncul-gulir relative isolate mx-auto flex max-w-6xl flex-col items-center gap-5 overflow-hidden rounded-[2rem] px-6 py-20 text-center text-kartu shadow-md">
          <IlustrasiLadang className="absolute inset-0 -z-10 size-full" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-teks/45" />
          <h2 className="max-w-2xl font-serif text-4xl leading-tight md:text-6xl">
            Musim panen berikutnya, sudah ada pembelinya.
          </h2>
          <p className="max-w-lg text-kartu/90">Daftar gratis. Butuh kurang dari dua menit.</p>
          <Link href="/daftar" className={kelasTombol("utama")}>
            Mulai sekarang <Ikon nama="panah" className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-10 text-center text-sm text-redup">
        <p>
          <Logo className="text-[2rem]" />
        </p>
        <p>
          © 2026 PanenPasti ·{" "}
          <Link href="/tentang" className="underline">
            Tentang & Privasi
          </Link>
        </p>
      </footer>
    </main>
  );
}
