import Link from "next/link"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import {
  getMercadoPagoConnection,
  searchMercadoPagoPayments,
  type MercadoPagoReceivedPayment,
} from "@/lib/mercadopago-orders"
import { formatMoney } from "@/lib/pricing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const TIME_ZONE = "America/Argentina/Buenos_Aires"
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DEFAULT_RANGE_DAYS = 7
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  account_money: "Dinero en cuenta",
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito",
  prepaid_card: "Tarjeta prepaga",
  bank_transfer: "Transferencia",
  ticket: "Efectivo (Rapipago/Pago Fácil)",
  digital_currency: "Crédito Mercado Pago",
  digital_wallet: "Billetera digital",
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  in_process: "En revisión",
  authorized: "Autorizado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Devuelto",
  charged_back: "Contracargo",
  in_mediation: "En disputa",
}

function todayInArgentina() {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date())
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateTime(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function feeOf(payment: MercadoPagoReceivedPayment) {
  return payment.fee_details.reduce((sum, fee) => sum + fee.amount, 0)
}

export default async function CobrosMercadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const params = await searchParams
  const today = todayInArgentina()
  const hasta = params.hasta && DATE_PATTERN.test(params.hasta) ? params.hasta : today
  const desde =
    params.desde && DATE_PATTERN.test(params.desde) && params.desde <= hasta
      ? params.desde
      : shiftDate(hasta, -(DEFAULT_RANGE_DAYS - 1))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "owner" || !profile.org_id) redirect("/")

  const connection = await getMercadoPagoConnection(profile.org_id)

  let result: Awaited<ReturnType<typeof searchMercadoPagoPayments>> | null = null
  let loadError: string | null = null
  if (connection) {
    try {
      // Argentina has no DST, so a fixed -03:00 offset covers whole local days.
      result = await searchMercadoPagoPayments(connection.access_token, {
        beginDate: `${desde}T00:00:00.000-03:00`,
        endDate: `${hasta}T23:59:59.999-03:00`,
      })
    } catch (err) {
      console.error("searchMercadoPagoPayments", err)
      loadError = "No se pudieron consultar los cobros en Mercado Pago. Probá de nuevo."
    }
  }

  const payments = result?.payments ?? []

  // Our QR/Point orders use the sale id as external_reference.
  const saleIds = [
    ...new Set(
      payments
        .map((p) => p.external_reference)
        .filter((ref): ref is string => !!ref && UUID_PATTERN.test(ref))
    ),
  ]
  const { data: sales } = saleIds.length
    ? await supabase.from("sales").select("id").in("id", saleIds)
    : { data: [] }
  const knownSaleIds = new Set((sales ?? []).map((s) => s.id))

  const approved = payments.filter((p) => p.status === "approved")
  const totals = approved.reduce(
    (acc, p) => ({
      gross: acc.gross + p.transaction_amount,
      fee: acc.fee + feeOf(p),
      net: acc.net + (p.transaction_details?.net_received_amount ?? 0),
    }),
    { gross: 0, fee: 0, net: 0 }
  )

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cobros de Mercado Pago</h1>
        <p className="text-sm text-muted-foreground">
          Cobros recibidos en la cuenta de Mercado Pago
          {connection?.nickname ? ` ${connection.nickname}` : ""}: ventas con QR, posnet y
          otros pagos hechos con Mercado Pago. Los totales cuentan solo los aprobados.
        </p>
      </div>

      {!connection ? (
        <p className="text-sm">
          No hay una cuenta de Mercado Pago conectada.{" "}
          <Link href="/configuracion/mercadopago" className="underline">
            Conectala desde Configuración
          </Link>
          .
        </p>
      ) : (
        <>
          <form className="flex flex-wrap items-end gap-3">
            <div className="grid gap-2">
              <Label htmlFor="desde">Desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={desde} max={today} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hasta">Hasta</Label>
              <Input id="hasta" name="hasta" type="date" defaultValue={hasta} max={today} />
            </div>
            <Button type="submit" variant="outline">
              Ver
            </Button>
          </form>

          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Cobros aprobados", value: String(approved.length) },
                  { label: "Bruto", value: `$${formatMoney(totals.gross)}` },
                  { label: "Comisiones", value: `-$${formatMoney(totals.fee)}` },
                  { label: "Neto", value: `$${formatMoney(totals.net)}` },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>

              {result?.partial && (
                <p className="text-sm text-muted-foreground">
                  Se muestran los últimos {payments.length} de {result.total} cobros del período.
                  Achicá el rango de fechas para ver el resto.
                </p>
              )}

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead>Medio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                      <TableHead>Se libera</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No hay cobros en este período.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => {
                        const saleId =
                          payment.external_reference &&
                          knownSaleIds.has(payment.external_reference)
                            ? payment.external_reference
                            : null
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(payment.date_approved ?? payment.date_created)}
                            </TableCell>
                            <TableCell>
                              {saleId ? (
                                <Link href={`/ventas/${saleId}`} className="underline">
                                  Venta de la app
                                </Link>
                              ) : (
                                (payment.description ?? `Pago #${payment.id}`)
                              )}
                            </TableCell>
                            <TableCell>
                              {PAYMENT_TYPE_LABEL[payment.payment_type_id] ??
                                payment.payment_method_id}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payment.status === "approved"
                                    ? "default"
                                    : payment.status === "rejected" ||
                                        payment.status === "charged_back"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {STATUS_LABEL[payment.status] ?? payment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              ${formatMoney(payment.transaction_amount)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {feeOf(payment) > 0 ? `-$${formatMoney(feeOf(payment))}` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {payment.status === "approved"
                                ? `$${formatMoney(payment.transaction_details?.net_received_amount ?? 0)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {payment.status === "approved"
                                ? formatDateTime(payment.money_release_date)
                                : "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
