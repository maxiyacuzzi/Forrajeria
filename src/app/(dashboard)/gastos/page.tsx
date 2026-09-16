import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/user-profile"
import { ExpenseTable } from "./expense-table"
import { NewExpenseDialog } from "./new-expense-dialog"

export default async function GastosPage() {
  const supabase = await createClient()

  const [{ data: expenses }, { data: suppliers }, role] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, suppliers(name)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("suppliers").select("*").order("name"),
    getUserRole(supabase),
  ])

  const canManage = role === "owner" || role === "vendedor"

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gastos</h1>
          <p className="text-sm text-muted-foreground">
            Egresos del negocio, para el cierre de caja del día.
          </p>
        </div>
        {canManage && <NewExpenseDialog suppliers={suppliers ?? []} />}
      </div>

      <ExpenseTable expenses={expenses ?? []} canManage={canManage} />
    </div>
  )
}
