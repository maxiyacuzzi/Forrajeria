"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { deleteExpense } from "./actions"
import { PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { PAYMENT_STATUS_LABEL, paymentStatus } from "@/lib/expense-status"
import { formatMoney } from "@/lib/pricing"
import { matchesSearch } from "@/lib/search"
import { applySort, nextSortState, type SortState } from "@/lib/sort"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { PayExpenseDialog } from "./pay-expense-dialog"

type Expense = Database["public"]["Tables"]["expenses"]["Row"] & {
  suppliers: { name: string } | null
}
type SortKey =
  "date" | "description" | "supplier" | "payment" | "amount" | "status"

export function ExpenseTable({
  expenses,
  canManage,
}: {
  expenses: Expense[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortState<SortKey>>(null)

  function handleDelete(expense: Expense) {
    if (!window.confirm(`¿Eliminar el gasto "${expense.description}"?`)) return
    startTransition(async () => {
      const result = await deleteExpense(expense.id)
      if (result.error) toast.error(result.error)
      else toast.success("Gasto eliminado")
    })
  }

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay gastos registrados.
      </p>
    )
  }

  function getSortValue(expense: Expense, key: SortKey) {
    switch (key) {
      case "date":
        return expense.created_at
      case "description":
        return expense.description
      case "supplier":
        return expense.suppliers?.name ?? null
      case "payment":
        return PAYMENT_METHOD_LABEL[expense.payment_method]
      case "amount":
        return expense.amount
      case "status":
        return paymentStatus(expense.amount, expense.paid_amount)
    }
  }

  function handleSort(key: SortKey) {
    setSort(nextSortState(sort, key))
  }

  const filteredExpenses = applySort(
    expenses.filter((expense) =>
      matchesSearch(query, expense.description, expense.suppliers?.name)
    ),
    sort,
    getSortValue
  )

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Buscar por descripción o proveedor..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      {filteredExpenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ningún gasto coincide con la búsqueda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Fecha"
                  sortKey="date"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Descripción"
                  sortKey="description"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Proveedor"
                  sortKey="supplier"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Pago"
                  sortKey="payment"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Monto"
                  sortKey="amount"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTableHead
                  label="Estado"
                  sortKey="status"
                  sort={sort}
                  onSort={handleSort}
                />
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const status = paymentStatus(
                  expense.amount,
                  expense.paid_amount
                )
                const pendingAmount = expense.amount - expense.paid_amount
                return (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(expense.created_at).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {expense.suppliers?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {PAYMENT_METHOD_LABEL[expense.payment_method]}
                    </TableCell>
                    <TableCell>
                      ${formatMoney(expense.amount)}
                      {status !== "pagado" && (
                        <span className="block text-xs text-muted-foreground">
                          Pendiente: ${formatMoney(pendingAmount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === "pagado" ? "secondary" : "destructive"
                        }
                      >
                        {PAYMENT_STATUS_LABEL[status]}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          {status !== "pagado" && (
                            <PayExpenseDialog
                              expenseId={expense.id}
                              description={expense.description}
                              pendingAmount={pendingAmount}
                            />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => handleDelete(expense)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
