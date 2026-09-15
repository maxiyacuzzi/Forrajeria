import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { SupplierTable } from "./supplier-table"

export default async function ProveedoresPage() {
  const supabase = await createClient()

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name")

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Registro de proveedores y sus productos.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/proveedores/nuevo" />}>
          Nuevo proveedor
        </Button>
      </div>

      <SupplierTable suppliers={suppliers ?? []} />
    </div>
  )
}
