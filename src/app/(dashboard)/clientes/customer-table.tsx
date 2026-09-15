import { Badge } from "@/components/ui/badge"
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
import type { Database } from "@/lib/types/database.types"
import { whatsappLink } from "@/lib/whatsapp"

type Customer = Database["public"]["Tables"]["customers"]["Row"]

export function CustomerTable({
  customers,
  readyCountByCustomer,
}: {
  customers: Customer[]
  readyCountByCustomer: Map<string, number>
}) {
  if (customers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay clientes cargados.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>DNI</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Fidelidad</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const readyCount = readyCountByCustomer.get(customer.id) ?? 0
            return (
              <ClickableTableRow key={customer.id} href={`/clientes/${customer.id}`}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.dni ?? "—"}</TableCell>
                <TableCell>{customer.address ?? "—"}</TableCell>
                <TableCell>{customer.whatsapp ?? "—"}</TableCell>
                <TableCell>
                  {readyCount > 0 ? (
                    <Badge>
                      {readyCount === 1 ? "1 premio listo" : `${readyCount} premios listos`}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
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
                            `Hola ${customer.name}! Te escribimos desde la forrajería.`
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
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
