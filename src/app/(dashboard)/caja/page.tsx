import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OpenRegisterDialog } from "./open-register-dialog"
import { CloseRegisterDialog } from "./close-register-dialog"
import { formatMoney } from "@/lib/pricing"

export default async function CajaPage() {
  const supabase = await createClient()

  const [{ data: openRegister }, { data: closedRegisters }, { data: profile }] =
    await Promise.all([
      supabase.from("cash_registers").select("*").eq("status", "open").maybeSingle(),
      supabase
        .from("cash_registers")
        .select("*")
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(20),
      supabase.from("profiles").select("role").single(),
    ])

  const canManage = profile?.role === "owner" || profile?.role === "vendedor"

  let cashSalesSoFar = 0
  let cashExpensesSoFar = 0

  if (openRegister) {
    const [{ data: sales }, { data: expenses }] = await Promise.all([
      supabase
        .from("sales")
        .select("total_amount")
        .eq("cash_register_id", openRegister.id)
        .eq("payment_method", "efectivo"),
      supabase
        .from("expense_payments")
        .select("amount")
        .eq("cash_register_id", openRegister.id)
        .eq("payment_method", "efectivo"),
    ])
    cashSalesSoFar = (sales ?? []).reduce((sum, s) => sum + s.total_amount, 0)
    cashExpensesSoFar = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0)
  }

  const expectedSoFar = openRegister
    ? openRegister.opening_amount + cashSalesSoFar - cashExpensesSoFar
    : 0

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Caja</h1>
          <p className="text-sm text-muted-foreground">
            Apertura, cierre y arqueo diario de efectivo.
          </p>
        </div>
        {canManage && !openRegister && <OpenRegisterDialog />}
      </div>

      {openRegister ? (
        <Card className="max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>
                Abierta el {new Date(openRegister.opened_at).toLocaleString("es-AR")}
              </CardDescription>
              <Badge>Abierta</Badge>
            </div>
            <CardTitle className="text-2xl">${formatMoney(expectedSoFar)}</CardTitle>
            <CardDescription>Efectivo esperado ahora mismo</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm text-muted-foreground">
            <p>Fondo inicial: ${formatMoney(openRegister.opening_amount)}</p>
            <p>Ventas en efectivo: ${formatMoney(cashSalesSoFar)}</p>
            <p>Gastos en efectivo: -${formatMoney(cashExpensesSoFar)}</p>
          </CardContent>
          {canManage && (
            <CardContent>
              <CloseRegisterDialog
                cashRegisterId={openRegister.id}
                expectedSoFar={expectedSoFar}
              />
            </CardContent>
          )}
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">No hay ninguna caja abierta.</p>
      )}

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Historial de cierres</h2>
        {closedRegisters && closedRegisters.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Inicial</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>Contado</TableHead>
                  <TableHead>Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedRegisters.map((register) => (
                  <TableRow key={register.id}>
                    <TableCell className="text-muted-foreground">
                      {register.closed_at
                        ? new Date(register.closed_at).toLocaleString("es-AR")
                        : "—"}
                    </TableCell>
                    <TableCell>${formatMoney(register.opening_amount)}</TableCell>
                    <TableCell>${formatMoney(register.expected_amount ?? 0)}</TableCell>
                    <TableCell>${formatMoney(register.counted_amount ?? 0)}</TableCell>
                    <TableCell
                      className={
                        (register.difference ?? 0) !== 0
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {(register.difference ?? 0) >= 0
                        ? `+$${formatMoney(register.difference ?? 0)}`
                        : `-$${formatMoney(Math.abs(register.difference ?? 0))}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay cierres de caja.</p>
        )}
      </div>
    </div>
  )
}
