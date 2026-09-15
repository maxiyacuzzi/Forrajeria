import { SupplierForm } from "../supplier-form"

export default function NuevoProveedorPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nuevo proveedor</h1>
      <SupplierForm />
    </div>
  )
}
