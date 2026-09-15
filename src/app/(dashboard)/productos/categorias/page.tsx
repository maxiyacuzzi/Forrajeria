import { createClient } from "@/lib/supabase/server"
import { CategoryDialog } from "./category-dialog"
import { CategoryTable } from "./category-table"

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from("product_categories")
    .select("*")
    .order("name")

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Organizá tus productos por categoría.
          </p>
        </div>
        <CategoryDialog />
      </div>

      <CategoryTable categories={categories ?? []} />
    </div>
  )
}
