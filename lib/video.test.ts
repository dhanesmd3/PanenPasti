import { describe, expect, it } from "vitest";
import { sumberVideo } from "./video";

const embed = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0";

describe("sumberVideo", () => {
  it("mengenali berbagai bentuk URL YouTube", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]) {
      expect(sumberVideo(url)).toEqual({ jenis: "youtube", src: embed });
    }
  });

  it("file di public/ dan URL https lain diputar sebagai <video>", () => {
    expect(sumberVideo("/tutorial-pembeli.mp4")).toEqual({ jenis: "file", src: "/tutorial-pembeli.mp4" });
    expect(sumberVideo("https://cdn.example.com/a.mp4")).toEqual({ jenis: "file", src: "https://cdn.example.com/a.mp4" });
  });

  it("kosong, http, dan teks asal diabaikan", () => {
    expect(sumberVideo(undefined)).toBeNull();
    expect(sumberVideo("  ")).toBeNull();
    expect(sumberVideo("http://contoh.com/a.mp4")).toBeNull();
    expect(sumberVideo("javascript:alert(1)")).toBeNull();
    expect(sumberVideo("//jahat.example/a.mp4")).toBeNull();
    expect(sumberVideo("bukan url")).toBeNull();
  });
});
