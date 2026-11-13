// Ubah URL video tutorial (dari env) menjadi sumber yang bisa diputar di halaman.
//
//   YouTube (watch, youtu.be, shorts, embed) → iframe youtube-nocookie
//   File video (/tutorial.mp4 di public/, atau URL https lain) → <video>

export type SumberVideo = { jenis: "youtube"; src: string } | { jenis: "file"; src: string };

const ID_YOUTUBE = /^[\w-]{11}$/;

function idYoutube(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
  }
  return id && ID_YOUTUBE.test(id) ? id : null;
}

export function sumberVideo(mentah: string | undefined | null): SumberVideo | null {
  const teks = mentah?.trim();
  if (!teks) return null;
  if (teks.startsWith("/") && !teks.startsWith("//")) return { jenis: "file", src: teks };

  let url: URL;
  try {
    url = new URL(teks);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const id = idYoutube(url);
  if (id) return { jenis: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
  return { jenis: "file", src: url.toString() };
}
