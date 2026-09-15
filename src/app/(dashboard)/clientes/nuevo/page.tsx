import { CustomerForm } from "../customer-form"

export default function NuevoClientePage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <CustomerForm />
    </div>
  )
}
