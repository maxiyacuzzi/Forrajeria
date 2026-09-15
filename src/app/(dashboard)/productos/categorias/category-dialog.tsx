"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PencilIcon } from "lucide-react"
import { toast } from "sonner"

import { createCategory, updateCategory } from "./actions"
import { categorySchema, type CategoryFormValues } from "@/lib/validations/category"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

type Category = { id: string; name: string; parent_id: string | null }

export function CategoryDialog({
  category,
  parentId = null,
  parentName,
}: {
  /** Present when renaming an existing category. */
  category?: Category
  /** Present when creating a new subcategory under this parent. */
  parentId?: string | null
  parentName?: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      parent_id: category ? category.parent_id : parentId,
    },
  })

  function onSubmit(values: CategoryFormValues) {
    startTransition(async () => {
      const result = category
        ? await updateCategory(category.id, values)
        : await createCategory(values)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(category ? "Categoría actualizada" : "Categoría creada")
        setOpen(false)
        form.reset()
      }
    })
  }

  const title = category
    ? "Renombrar categoría"
    : parentName
      ? `Nueva subcategoría de ${parentName}`
      : "Nueva categoría"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {category ? (
        <DialogTrigger render={<Button variant="outline" size="icon-sm" />}>
          <PencilIcon />
          <span className="sr-only">Renombrar</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={<Button variant={parentId ? "outline" : "default"} size={parentId ? "sm" : "default"} />}
        >
          {parentId ? "Subcategoría" : "Nueva categoría"}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Adulto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Guardando..." : category ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
