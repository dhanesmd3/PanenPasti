// Pembatas panggilan sederhana (jendela geser) di memori server.
//
// Batasan yang disadari: di Vercel tiap instance serverless punya memori sendiri,
// jadi batas ini per instance, bukan global. Cukup untuk mencegah satu pengguna
// menghabiskan kuota AI gratis saat demo; untuk produksi pindahkan ke database.

const catatan = new Map<string, number[]>();

export interface HasilBatas {
  boleh: boolean;
  sisa: number;
  /** Detik sampai satu kuota kembali tersedia (0 jika masih boleh). */
  cobaLagiDetik: number;
}

export function periksaBatas(
  kunci: string,
  batas: number,
  jendelaMs = 60 * 60 * 1000,
  sekarang = Date.now(),
): HasilBatas {
  const riwayat = (catatan.get(kunci) ?? []).filter((t) => t > sekarang - jendelaMs);
  if (riwayat.length >= batas) {
    catatan.set(kunci, riwayat);
    return {
      boleh: false,
      sisa: 0,
      cobaLagiDetik: Math.ceil((riwayat[0] + jendelaMs - sekarang) / 1000),
    };
  }
  riwayat.push(sekarang);
  catatan.set(kunci, riwayat);
  return { boleh: true, sisa: batas - riwayat.length, cobaLagiDetik: 0 };
}

/** Hanya untuk test. */
export function resetBatas() {
  catatan.clear();
}

export function batasAIPerJam(): number {
  const n = Number(process.env.AI_RATE_LIMIT_PER_HOUR);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

/**
 * Kunci pembatas: id pengguna jika login, selain itu alamat IP.
 * (Setelah auth dari A siap, route mengirim `userId`.)
 */
export function kunciPembatas(headers: Headers, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip");
  return `ip:${ip ?? "lokal"}`;
}
