import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/user-profile"
import { Button } from "@/components/ui/button"
import { ProductTable } from "./product-table"

export default async function ProductosPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: categories }, { data: productSuppliers }, role] =
    await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("product_categories").select("*"),
      supabase.from("product_suppliers").select("product_id, suppliers(name)"),
      getUserRole(supabase),
    ])

  const canManage = role === "owner" || role === "deposito"

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/productos/categorias" />}
            >
              Categorías
            </Button>
            <Button nativeButton={false} render={<Link href="/productos/nuevo" />}>
              Nuevo producto
            </Button>
          </div>
        )}
      </div>

      <ProductTable
        products={products ?? []}
        categories={categories ?? []}
        productSuppliers={productSuppliers ?? []}
        canManage={canManage}
      />
    </div>
  )
}
