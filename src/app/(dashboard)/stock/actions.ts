"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { getUserOrgId } from "@/lib/user-profile"
import { stockAdjustmentSchema } from "@/lib/validations/stock"
import { stockEntrySchema } from "@/lib/validations/stock-entry"
import { computeAutoPrices, costPerUnitFromTotal } from "@/lib/pricing"

export type StockActionState = { error: string | null }

export async function adjustStock(
  values: unknown
): Promise<StockActionState> {
  const parsed = stockAdjustmentSchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const orgId = await getUserOrgId(supabase)

  if (!orgId || !user) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { unit, type, quantity, product_id, note } = parsed.data
  // Una rotura/humedad siempre resta stock; un ajuste manual puede sumar o
  // restar según el signo que cargue quien lo hace (ej: conteo físico > sistema).
  const signedQuantity = type === "rotura_humedad" ? -Math.abs(quantity) : quantity

  const { error } = await supabase.from("stock_movements").insert({
    org_id: orgId,
    product_id,
    unit,
    type,
    quantity: signedQuantity,
    note,
    created_by: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock")
  revalidatePath("/stock/movimientos")
  return { error: null }
}

export async function registerStockEntry(
  values: unknown
): Promise<StockActionState> {
  const parsed = stockEntrySchema.safeParse(values)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const orgId = await getUserOrgId(supabase)

  if (!orgId || !user) {
    return { error: "No se encontró la organización del usuario" }
  }

  const { supplier_id, note, items, iva_pct, paid_amount, payment_method } = parsed.data

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .in(
      "id",
      items.map((item) => item.product_id)
    )
  const productById = new Map((products ?? []).map((p) => [p.id, p]))

  let totalCostWithIva = 0

  for (const item of items) {
    const product = productById.get(item.product_id)
    if (!product) continue

    const unitCost =
      item.total_cost != null
        ? costPerUnitFromTotal(item.total_cost, item.quantity, iva_pct)
        : null

    const { error: movementError } = await supabase.from("stock_movements").insert({
      org_id: orgId,
      product_id: item.product_id,
      supplier_id: supplier_id || null,
      unit: item.unit,
      type: "ingreso_compra",
      quantity: item.quantity,
      unit_cost: unitCost,
      note: note || null,
      created_by: user.id,
    })

    if (movementError) {
      return { error: movementError.message }
    }

    if (unitCost != null) {
      totalCostWithIva += unitCost * item.quantity

      // cost_price is always the cost of the purchase unit (whole bag, or the
      // single unit) — convert a per-kg cost back to that before storing it.
      const newCostPrice =
        item.unit === "sale" && product.conversion_factor
          ? unitCost * product.conversion_factor
          : unitCost

      const autoPrices = computeAutoPrices({
        unit_type: product.unit_type,
        cost_price: newCostPrice,
        conversion_factor: product.conversion_factor,
        margin_suelto_pct: product.margin_suelto_pct,
        margin_bolsa_pct: product.margin_bolsa_pct,
      })

      const { error: productError } = await supabase
        .from("products")
        .update({
          cost_price: newCostPrice,
          sale_price: autoPrices.sale_price,
          bag_price: autoPrices.bag_price,
        })
        .eq("id", item.product_id)

      if (productError) {
        return { error: productError.message }
      }
    }
  }

  if (totalCostWithIva > 0) {
    let supplierName: string | null = null
    if (supplier_id) {
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("name")
        .eq("id", supplier_id)
        .single()
      supplierName = supplier?.name ?? null
    }

    const { data: openRegister } = await supabase
      .from("cash_registers")
      .select("id")
      .eq("status", "open")
      .maybeSingle()

    const roundedTotal = Math.round(totalCostWithIva * 100) / 100

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        org_id: orgId,
        supplier_id: supplier_id || null,
        description: supplierName
          ? `Mercadería de ${supplierName}`
          : "Ingreso de mercadería",
        amount: roundedTotal,
        payment_method,
        created_by: user.id,
        cash_register_id: openRegister?.id ?? null,
      })
      .select("id")
      .single()

    if (expenseError) {
      return { error: expenseError.message }
    }

    if (paid_amount && paid_amount > 0) {
      const { error: paymentError } = await supabase.rpc("register_expense_payment", {
        p_expense_id: expense.id,
        p_amount: Math.min(paid_amount, roundedTotal),
        p_payment_method: payment_method,
      })
      if (paymentError) {
        return { error: paymentError.message }
      }
    }
  }

  revalidatePath("/stock")
  revalidatePath("/stock/movimientos")
  revalidatePath("/productos")
  revalidatePath("/gastos")
  revalidatePath("/caja")
  revalidatePath("/proveedores")
  redirect("/stock")
}
