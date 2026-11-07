// Respons standar untuk endpoint yang belum dibangun.
export function belumTersedia(endpoint: string) {
  return Response.json(
    { error: "Belum diimplementasikan", endpoint },
    { status: 501 },
  );
}
