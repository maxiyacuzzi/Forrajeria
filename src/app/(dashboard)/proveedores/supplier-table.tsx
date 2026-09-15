"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteSupplier } from "./actions"
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

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"]

export function SupplierTable({ suppliers }: { suppliers: Supplier[] }) {
  const [pending, startTransition] = useTransition()

  function handleDelete(supplier: Supplier) {
    if (
      !window.confirm(
        `¿Eliminar al proveedor "${supplier.name}"? Los productos que lo usan quedarán sin proveedor.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await deleteSupplier(supplier.id)
      if (result.error) toast.error(result.error)
      else toast.success("Proveedor eliminado")
    })
  }

  if (suppliers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay proveedores cargados.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Email</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <ClickableTableRow key={supplier.id} href={`/proveedores/${supplier.id}`}>
              <TableCell className="font-medium">{supplier.name}</TableCell>
              <TableCell>{supplier.contact_name ?? "—"}</TableCell>
              <TableCell>{supplier.phone ?? "—"}</TableCell>
              <TableCell>{supplier.email ?? "—"}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleDelete(supplier)}
                >
                  Eliminar
                </Button>
              </TableCell>
            </ClickableTableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
