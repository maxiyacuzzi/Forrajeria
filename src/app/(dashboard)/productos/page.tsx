import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ProductTable } from "./product-table"

export default async function ProductosPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: profile }] = await Promise.all([
    supabase
      .from("products")
      .select("*, product_categories(name)")
      .order("name"),
    supabase
      .from("profiles")
      .select("role")
      .single(),
  ])

  const canManage = profile?.role === "owner" || profile?.role === "deposito"

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo y stock actual.
          </p>
        </div>
        {canManage && (
          <Button nativeButton={false} render={<Link href="/productos/nuevo" />}>
            Nuevo producto
          </Button>
        )}
      </div>

      <ProductTable products={products ?? []} canManage={canManage} />
    </div>
  )
}
