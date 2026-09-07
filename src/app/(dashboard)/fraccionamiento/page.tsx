import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OpenFractioningDialog } from "./open-fractioning-dialog"
import { CloseFractioningDialog } from "./close-fractioning-dialog"

export default async function FraccionamientoPage() {
  const supabase = await createClient()

  const [{ data: fractionableProducts }, { data: fractionings }] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("unit_type", "fraccionable")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("fractionings")
        .select("*, products(name, sale_unit_label, purchase_unit_label)")
        .order("opened_at", { ascending: false })
        .limit(100),
    ])

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fraccionamiento</h1>
          <p className="text-sm text-muted-foreground">
            Abrí bolsas para vender sueltas y cerrá registrando la merma real.
          </p>
        </div>
        <OpenFractioningDialog
          fractionableProducts={fractionableProducts ?? []}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Abierto</TableHead>
              <TableHead>Teórico</TableHead>
              <TableHead>Real</TableHead>
              <TableHead>Merma</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(fractionings ?? []).map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">
                  {f.products?.name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(f.opened_at).toLocaleDateString("es-AR")}
                </TableCell>
                <TableCell>
                  {f.expected_qty} {f.products?.sale_unit_label}
                </TableCell>
                <TableCell>
                  {f.actual_qty != null
                    ? `${f.actual_qty} ${f.products?.sale_unit_label}`
                    : "—"}
                </TableCell>
                <TableCell
                  className={
                    (f.shrinkage_qty ?? 0) > 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {f.status === "closed"
                    ? `${f.shrinkage_qty} ${f.products?.sale_unit_label}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={f.status === "open" ? "default" : "secondary"}>
                    {f.status === "open" ? "Abierto" : "Cerrado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {f.status === "open" && (
                    <CloseFractioningDialog
                      fractioningId={f.id}
                      productName={f.products?.name ?? ""}
                      saleUnitLabel={f.products?.sale_unit_label ?? ""}
                      expectedQty={f.expected_qty}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
