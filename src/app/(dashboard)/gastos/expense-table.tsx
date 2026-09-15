"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteExpense } from "./actions"
import { PAYMENT_METHOD_LABEL } from "@/lib/validations/expense"
import { PAYMENT_STATUS_LABEL, paymentStatus } from "@/lib/expense-status"
import { formatMoney } from "@/lib/pricing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export function ExpenseTable({
  expenses,
  canManage,
}: {
  expenses: Expense[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()

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

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            {canManage && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            const status = paymentStatus(expense.amount, expense.paid_amount)
            const pendingAmount = expense.amount - expense.paid_amount
            return (
            <TableRow key={expense.id}>
              <TableCell className="text-muted-foreground">
                {new Date(expense.created_at).toLocaleDateString("es-AR")}
              </TableCell>
              <TableCell className="font-medium">{expense.description}</TableCell>
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
                <Badge variant={status === "pagado" ? "secondary" : "destructive"}>
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
  )
}
