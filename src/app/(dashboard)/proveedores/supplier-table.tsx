"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteSupplier } from "./actions"
import { Button } from "@/components/ui/button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { Input } from "@/components/ui/input"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Database } from "@/lib/types/database.types"
import { matchesSearch } from "@/lib/search"
import { applySort, nextSortState, type SortState } from "@/lib/sort"

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"]
type SortKey = "name" | "contact" | "phone" | "email"

export function SupplierTable({ suppliers }: { suppliers: Supplier[] }) {
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

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

  function getSortValue(supplier: Supplier, key: SortKey) {
    switch (key) {
      case "name":
        return supplier.name
      case "contact":
        return supplier.contact_name
      case "phone":
        return supplier.phone
      case "email":
        return supplier.email
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  const filteredSuppliers = applySort(
    suppliers.filter((supplier) =>
      matchesSearch(
        query,
        supplier.name,
        supplier.contact_name,
        supplier.phone,
        supplier.email
      )
    ),
    sort,
    getSortValue
  )

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por nombre, contacto, teléfono o email..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filteredSuppliers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún proveedor coincide con la búsqueda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Nombre"
                  sortKey="name"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Contacto"
                  sortKey="contact"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Teléfono"
                  sortKey="phone"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Email"
                  sortKey="email"
                  sort={sort}
                  onSort={handleSort}
                />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <ClickableTableRow
                  key={supplier.id}
                  href={`/proveedores/${supplier.id}`}
                >
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
      )}
    </div>
  )
}
