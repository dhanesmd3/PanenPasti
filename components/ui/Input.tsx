import { useId, type InputHTMLAttributes, type ReactNode } from "react";

/** Kelas untuk <input>, <select>, dan <textarea>. */
export const kelasInput =
  "block min-h-12 w-full rounded-xl border border-garis bg-kartu px-4 text-base text-teks transition " +
  "placeholder:text-redup/60 focus:border-terakota focus:outline-none focus:ring-4 focus:ring-terakota/25 " +
  "aria-invalid:border-cabai disabled:bg-pasir/40";

/** Label + petunjuk + pesan galat di sekitar satu kontrol form. */
export function Field({
  label,
  petunjuk,
  galat,
  htmlFor,
  children,
}: {
  label: string;
  petunjuk?: ReactNode;
  galat?: string | null;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="label-cetak text-sm text-redup">
        {label}
      </label>
      {children}
      {petunjuk && !galat && (
        <p id={`${htmlFor}-petunjuk`} className="text-sm text-redup">
          {petunjuk}
        </p>
      )}
      {galat && (
        <p id={`${htmlFor}-galat`} role="alert" className="text-sm text-cabai">
          {galat}
        </p>
      )}
    </div>
  );
}

export function Input({
  label,
  petunjuk,
  galat,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  petunjuk?: ReactNode;
  galat?: string | null;
}) {
  const idCadangan = useId();
  const idInput = id ?? idCadangan;
  return (
    <Field label={label} petunjuk={petunjuk} galat={galat} htmlFor={idInput}>
      <input
        id={idInput}
        aria-invalid={galat ? true : undefined}
        // Hubungkan petunjuk/galat ke input supaya dibacakan pembaca layar.
        aria-describedby={galat ? `${idInput}-galat` : petunjuk ? `${idInput}-petunjuk` : undefined}
        className={`${kelasInput} ${className}`}
        {...props}
      />
    </Field>
  );
}
