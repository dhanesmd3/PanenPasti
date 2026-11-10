// Pembatas section berbentuk gelombang (bentuk organik, bukan garis lurus).
// Warnanya mengikuti `text-*` pada className, dicocokkan dengan section di sebelahnya.
export function Gelombang({ className = "", balik = false }: { className?: string; balik?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden
      className={`block h-10 w-full md:h-16 ${balik ? "rotate-180" : ""} ${className}`}
    >
      <path
        fill="currentColor"
        d="M0 48 C 180 12, 360 12, 540 36 C 720 60, 900 76, 1080 52 C 1260 28, 1350 24, 1440 32 V 80 H 0 Z"
      />
    </svg>
  );
}
