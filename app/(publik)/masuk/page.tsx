import { passwordDemo } from "@/lib/akun-demo";
import { FormMasuk } from "./FormMasuk";

export default function Page() {
  // Hanya status aktif yang dikirim ke browser, bukan kata sandinya.
  return <FormMasuk demoAktif={passwordDemo() !== null} />;
}
