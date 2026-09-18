"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
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
import { whatsappLink } from "@/lib/whatsapp"

type Customer = Database["public"]["Tables"]["customers"]["Row"]
type SortKey = "name" | "dni" | "address" | "whatsapp" | "loyalty"

export function CustomerTable({
  customers,
  readyCountByCustomer,
}: {
  customers: Customer[]
  readyCountByCustomer: Map<string, number>
}) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

  if (customers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay clientes cargados.
      </p>
    )
  }

  function getSortValue(customer: Customer, key: SortKey) {
    switch (key) {
      case "name":
        return customer.name
      case "dni":
        return customer.dni
      case "address":
        return customer.address
      case "whatsapp":
        return customer.whatsapp
      case "loyalty":
        return readyCountByCustomer.get(customer.id) ?? 0
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  // WhatsApp numbers are free text (spaces, dashes, "+54 9 11..."), so a plain
  // substring match would force searching with the exact same formatting. Strip
  // non-digits from both sides instead, so "1122334455" matches "11 2233-4455".
  const whatsappDigits = query.replace(/\D/g, "")

  const filteredCustomers = applySort(
    customers.filter((customer) => {
      if (matchesSearch(query, customer.name, customer.dni, customer.address))
        return true
      return (
        whatsappDigits.length > 0 &&
        (customer.whatsapp?.replace(/\D/g, "") ?? "").includes(whatsappDigits)
      )
    }),
    sort,
    getSortValue
  )

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por nombre, DNI, dirección o WhatsApp..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filteredCustomers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún cliente coincide con la búsqueda.
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
                  label="DNI"
                  sortKey="dni"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Dirección"
                  sortKey="address"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="WhatsApp"
                  sortKey="whatsapp"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Fidelidad"
                  sortKey="loyalty"
                  sort={sort}
                  onSort={handleSort}
                />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const readyCount = readyCountByCustomer.get(customer.id) ?? 0
                return (
                  <ClickableTableRow
                    key={customer.id}
                    href={`/clientes/${customer.id}`}
                  >
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell>{customer.dni ?? "—"}</TableCell>
                    <TableCell>{customer.address ?? "—"}</TableCell>
                    <TableCell>{customer.whatsapp ?? "—"}</TableCell>
                    <TableCell>
                      {readyCount > 0 ? (
                        <Badge>
                          {readyCount === 1
                            ? "1 premio listo"
                            : `${readyCount} premios listos`}
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
                        <span className="text-xs text-muted-foreground">
                          Sin WhatsApp
                        </span>
                      )}
                    </TableCell>
                  </ClickableTableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
