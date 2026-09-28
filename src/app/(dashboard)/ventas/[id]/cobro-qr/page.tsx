import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { formatMoney } from "@/lib/pricing"
import { QrPaymentPanel } from "./qr-payment-panel"

export default async function CobroQrPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: sale }, { data: payment }, { data: status }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total_amount, payment_method, customers(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("mercadopago_payments")
      .select("status")
      .eq("sale_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("mercadopago_connection_status").single(),
  ])

  if (!sale) notFound()
  if (sale.payment_method !== "qr_mp" || payment?.status === "processed") {
    redirect(`/ventas/${id}`)
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Cobro con QR</h1>
        <p className="text-sm text-muted-foreground">{sale.customers?.name}</p>
      </div>
      <p className="text-4xl font-bold">${formatMoney(sale.total_amount)}</p>
      <QrPaymentPanel
        saleId={sale.id}
        qrImageUrl={status?.qr_image_url ?? null}
        initialStatus={payment?.status ?? null}
      />
    </div>
  )
}
