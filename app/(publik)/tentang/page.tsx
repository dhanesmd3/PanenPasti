import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { kelasTombol } from "@/components/ui/Button";
import { Ikon, type NamaIkon } from "@/components/ui/Ikon";

export const metadata: Metadata = { title: "Tentang & Privasi · PanenPasti" };

const DATA_DISIMPAN: { apa: string; untuk: string }[] = [
  { apa: "Email dan kata sandi", untuk: "Masuk ke akun. Kata sandi disimpan dalam bentuk hash oleh Supabase Auth, tidak bisa kami baca." },
  { apa: "Nama, nama usaha, kecamatan", untuk: "Ditampilkan ke pihak lain di katalog dan pesanan, dan untuk menghitung jarak saat pencocokan." },
  { apa: "Nomor HP", untuk: "Hanya untuk tautan WhatsApp. Baru terlihat oleh pihak lawan setelah pesanan dikonfirmasi penjual." },
  { apa: "Panen, kebutuhan, dan pesanan", untuk: "Menjalankan katalog, pencocokan, pre-order, dan riwayat pesanan." },
  { apa: "Notifikasi", untuk: "Kabar perubahan pesanan dan panen surplus, hanya di dalam aplikasi." },
];

const DATA_KE_AI: { fitur: string; dikirim: string }[] = [
  { fitur: "Cari Pemasok (isi form otomatis)", dikirim: "Kalimat kebutuhan yang Anda ketik dan tanggal hari ini." },
  { fitur: "Isi panen dengan AI", dikirim: "Kalimat tentang panen yang Anda ketik dan tanggal hari ini." },
  { fitur: "Penjelasan harga", dikirim: "Angka harga dan prediksi cabai. Tidak ada data akun." },
];

function Bagian({ ikon, judul, children }: { ikon: NamaIkon; judul: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-kartu p-6 shadow-sm md:p-8">
      <h2 className="flex items-center gap-3 font-serif text-2xl md:text-3xl">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pasir/70 text-daun">
          <Ikon nama={ikon} />
        </span>
        {judul}
      </h2>
      {children}
    </section>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 md:py-16">
      <div className="flex flex-col gap-3">
        <p className="label-cetak text-xs text-redup">Tentang & Privasi</p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">
          Pre-order hasil panen, langsung dari petani ke warung.
        </h1>
        <p className="text-lg text-redup">
          PanenPasti mempertemukan petani dan koperasi di Kab. Garut dengan warung, resto, dan katering di Kota Bandung.
          Petani mencatat perkiraan panen dan menentukan harganya sendiri. Pembeli memesan jauh hari, sehingga petani
          punya pembeli pasti dan warung punya bahan baku dengan harga jelas. Komoditas pertama: cabai rawit merah.
        </p>
      </div>

      <Bagian ikon="orang" judul="Data yang kami simpan">
        <dl className="flex flex-col divide-y divide-garis/70">
          {DATA_DISIMPAN.map((d) => (
            <div key={d.apa} className="flex flex-col gap-1 py-3 md:flex-row md:gap-6">
              <dt className="font-semibold md:w-56 md:shrink-0">{d.apa}</dt>
              <dd className="text-redup">{d.untuk}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-redup">
          Setiap tabel dilindungi Row Level Security: Anda hanya bisa mengubah data milik sendiri. Data tidak dijual
          dan tidak dibagikan ke pihak ketiga selain penyedia layanan di bawah.
        </p>
      </Bagian>

      <Bagian ikon="kilau" judul="Data yang dikirim ke AI">
        <p className="text-redup">
          Fitur AI dijalankan dari server lewat Google Gemini. Nama, email, dan nomor HP tidak pernah dikirim ke AI.
        </p>
        <dl className="flex flex-col divide-y divide-garis/70">
          {DATA_KE_AI.map((d) => (
            <div key={d.fitur} className="flex flex-col gap-1 py-3 md:flex-row md:gap-6">
              <dt className="font-semibold md:w-56 md:shrink-0">{d.fitur}</dt>
              <dd className="text-redup">{d.dikirim}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-redup">
          Hasil AI selalu diberi label “Dibuat oleh AI” dan bisa Anda ubah sebelum disimpan. Kalimat asli kebutuhan
          disimpan bersama hasilnya, supaya isian AI bisa dicek ulang.
        </p>
      </Bagian>

      <Bagian ikon="kalender" judul="Sumber data harga">
        <p className="text-redup">
          Harga cabai rawit merah diambil dari{" "}
          <a
            href="https://www.bi.go.id/hargapangan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-daun underline"
          >
            PIHPS Nasional, Bank Indonesia
          </a>
          : harga produsen Kab. Garut serta harga pedagang besar dan pasar tradisional Kota Bandung, lalu diolah
          PanenPasti. Prediksi harga adalah perkiraan statistik yang ditampilkan sebagai rentang, bukan jaminan harga.
        </p>
      </Bagian>

      <Bagian ikon="peringatan" judul="Data simulasi">
        <p className="text-redup">
          Selama masa uji, sebagian penjual, pembeli, dan panen di aplikasi adalah data contoh yang diberi label
          “Data simulasi”. Data ini tidak mewakili orang atau transaksi sungguhan. Belum ada pembayaran di aplikasi:
          pembayaran dan pengiriman disepakati langsung lewat WhatsApp.
        </p>
      </Bagian>

      <div className="flex justify-center py-4">
        <Link href="/daftar" className={kelasTombol("utama")}>
          Daftar gratis <Ikon nama="panah" className="size-4" />
        </Link>
      </div>
    </main>
  );
}
