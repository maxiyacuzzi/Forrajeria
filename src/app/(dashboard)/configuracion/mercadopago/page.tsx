import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { disconnectMercadoPago } from "./actions"
import { QrSetupForm } from "./qr-setup-form"

const ERROR_MESSAGE: Record<string, string> = {
  forbidden: "Solo el dueño de la cuenta puede conectar Mercado Pago.",
  invalid_state: "La conexión expiró o no es válida. Probá de nuevo.",
  exchange_failed: "Mercado Pago rechazó la conexión. Probá de nuevo.",
  not_configured:
    "Falta configurar las credenciales de Mercado Pago en el servidor (variables de entorno).",
}

export default async function MercadoPagoSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "owner") redirect("/")

  const { data: status } = await supabase
    .rpc("mercadopago_connection_status")
    .single()

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mercado Pago</h1>
        <p className="text-sm text-muted-foreground">
          Conectá la cuenta de Mercado Pago del negocio para cobrar con ella.
        </p>
      </div>

      {connected && (
        <p className="rounded-md bg-primary/10 px-4 py-2 text-sm text-primary">
          Cuenta conectada correctamente.
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {ERROR_MESSAGE[error] ?? "Ocurrió un error al conectar la cuenta."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Estado de la conexión</CardTitle>
          <CardDescription>
            {status?.connected
              ? `Conectado a ${status.nickname ?? "la cuenta de Mercado Pago"}${
                  status.live_mode ? "" : " (modo prueba)"
                }.`
              : "Todavía no conectaste una cuenta de Mercado Pago."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <form action={disconnectMercadoPago}>
              <Button type="submit" variant="outline">
                Desconectar
              </Button>
            </form>
          ) : (
            <Button nativeButton={false} render={<a href="/api/mercadopago/connect" />}>
              Conectar con Mercado Pago
            </Button>
          )}
        </CardContent>
      </Card>

      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Cobro con QR</CardTitle>
            <CardDescription>
              {status.qr_ready
                ? "Imprimí el QR y dejalo en el mostrador. Al elegir \"QR Mercado Pago\" en una venta, el cliente lo escanea y paga el total."
                : "Creá la sucursal y la caja en Mercado Pago para empezar a cobrar con QR."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.qr_ready ? (
              <div className="flex flex-wrap items-end gap-4">
                {status.qr_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- remote QR served by Mercado Pago
                  <img
                    src={status.qr_image_url}
                    alt="QR de la caja de Mercado Pago"
                    className="size-48 rounded-md border bg-white p-2"
                  />
                )}
                {status.qr_template_url && (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<a href={status.qr_template_url} target="_blank" rel="noreferrer" />}
                  >
                    Descargar QR para imprimir
                  </Button>
                )}
              </div>
            ) : (
              <QrSetupForm />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
