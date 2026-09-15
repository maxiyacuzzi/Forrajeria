import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { whatsappLink } from "@/lib/whatsapp"
import { Button } from "@/components/ui/button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const THRESHOLDS = [15, 30, 60, 90] as const
type Threshold = (typeof THRESHOLDS)[number]

function isThreshold(value: number): value is Threshold {
  return (THRESHOLDS as readonly number[]).includes(value)
}

export default async function ClientesInactivosPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>
}) {
  const { dias } = await searchParams
  const parsedDias = Number(dias)
  const threshold: Threshold = isThreshold(parsedDias) ? parsedDias : 30

  const supabase = await createClient()

  const [{ data: customers }, { data: sales }] = await Promise.all([
    supabase.from("customers").select("id, name, dni, whatsapp").order("name"),
    supabase
      .from("sales")
      .select("customer_id, created_at")
      .order("created_at", { ascending: false }),
  ])

  const lastPurchaseByCustomer = new Map<string, string>()
  for (const sale of sales ?? []) {
    if (!lastPurchaseByCustomer.has(sale.customer_id)) {
      lastPurchaseByCustomer.set(sale.customer_id, sale.created_at)
    }
  }

  const now = new Date().getTime()
  const rows = (customers ?? [])
    .map((customer) => {
      const lastPurchaseAt = lastPurchaseByCustomer.get(customer.id)
      if (!lastPurchaseAt) return null
      const daysSince = Math.floor(
        (now - new Date(lastPurchaseAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      return { customer, lastPurchaseAt, daysSince }
    })
    .filter((row): row is NonNullable<typeof row> => row != null && row.daysSince >= threshold)
    .sort((a, b) => b.daysSince - a.daysSince)

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes inactivos</h1>
          <p className="text-sm text-muted-foreground">
            Clientes que hace tiempo no compran, ordenados de más a menos inactivos.
          </p>
        </div>
        <div className="flex gap-2">
          {THRESHOLDS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={threshold === d ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={`/clientes/inactivos?dias=${d}`} />}
            >
              +{d} días
            </Button>
          ))}
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Última compra</TableHead>
                <TableHead>Inactivo hace</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ customer, lastPurchaseAt, daysSince }) => (
                <ClickableTableRow key={customer.id} href={`/clientes/${customer.id}`}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.dni ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lastPurchaseAt).toLocaleDateString("es-AR")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{daysSince} días</TableCell>
                  <TableCell>
                    {customer.whatsapp ? (
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <a
                            href={whatsappLink(
                              customer.whatsapp,
                              `Hola ${customer.name}! Hace un tiempo que no te vemos por la forrajería, ¿todo bien? Cualquier cosa que necesites, estamos para ayudarte.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        Enviar WhatsApp
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin WhatsApp</span>
                    )}
                  </TableCell>
                </ClickableTableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay clientes inactivos hace más de {threshold} días.
        </p>
      )}
    </div>
  )
}
