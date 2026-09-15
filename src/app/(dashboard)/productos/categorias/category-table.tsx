"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteCategory } from "./actions"
import { CategoryDialog } from "./category-dialog"
import { Button } from "@/components/ui/button"
import { flattenCategoriesDepthFirst } from "@/lib/category-tree"
import type { Database } from "@/lib/types/database.types"

type Category = Database["public"]["Tables"]["product_categories"]["Row"]

export function CategoryTable({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition()

  function handleDelete(category: Category) {
    const hasChildren = categories.some((c) => c.parent_id === category.id)
    const warning = hasChildren
      ? `¿Eliminar "${category.name}" y todas sus subcategorías? Los productos que las usan quedarán sin categoría.`
      : `¿Eliminar la categoría "${category.name}"? Los productos que la usan quedarán sin categoría.`
    if (!window.confirm(warning)) return

    startTransition(async () => {
      const result = await deleteCategory(category.id)
      if (result.error) toast.error(result.error)
      else toast.success("Categoría eliminada")
    })
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay categorías cargadas.
      </p>
    )
  }

  const rows = flattenCategoriesDepthFirst(categories)

  return (
    <div className="rounded-lg border divide-y">
      {rows.map((category) => (
        <div
          key={category.id}
          className="flex items-center justify-between gap-2 px-3 py-2"
          style={{ paddingLeft: `${0.75 + category.depth * 1.25}rem` }}
        >
          <span className={category.depth === 0 ? "font-medium" : ""}>
            {category.name}
          </span>
          <div className="flex shrink-0 gap-2">
            <CategoryDialog parentId={category.id} parentName={category.name} />
            <CategoryDialog category={category} />
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => handleDelete(category)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
