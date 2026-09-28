"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { refreshMpPaymentStatus, settleMpSaleOtherwise, startMpPayment } from "./actions"

const POLL_INTERVAL_MS = 3000

type Kind = "qr" | "point"
type FallbackMethod = "efectivo" | "transferencia" | "posnet_mp"

const STATUS_MESSAGE: Record<Kind, Record<string, string>> = {
  qr: {
    created: "Esperando que el cliente escanee el QR y pague…",
    at_terminal: "El cliente está pagando…",
    action_required: "El pago necesita una acción del cliente en la app de Mercado Pago.",
    expired: "El cobro venció sin pagarse.",
    canceled: "El cobro se canceló.",
    failed: "El pago fue rechazado.",
  },
  point: {
    created: "Enviando el cobro al posnet…",
    at_terminal: "El cobro está en el posnet: el cliente puede pasar la tarjeta.",
    action_required:
      "El posnet necesita confirmación. Revisá la pantalla del posnet: si el pago salió aprobado, tocá \"Lo cobré en el posnet\".",
    expired: "El cobro venció en el posnet sin pagarse.",
    canceled: "El cobro se canceló en el posnet.",
    failed: "El pago fue rechazado en el posnet.",
  },
}

const FALLBACK_LABEL: Record<Kind, Record<FallbackMethod, string>> = {
  qr: { efectivo: "Efectivo", transferencia: "Transferencia", posnet_mp: "Posnet MP" },
  point: {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
    posnet_mp: "Lo cobré en el posnet",
  },
}

function isOpen(status: string | null) {
  return status === "created" || status === "at_terminal" || status === "action_required"
}

export function MpPaymentPanel({
  saleId,
  kind,
  qrImageUrl,
  initialStatus,
}: {
  saleId: string
  kind: Kind
  qrImageUrl: string | null
  initialStatus: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (status === "processed") {
      toast.success("Pago recibido")
      router.push(`/ventas/${saleId}`)
      return
    }
    if (!isOpen(status)) return

    const interval = setInterval(async () => {
      const result = await refreshMpPaymentStatus(saleId)
      if (result.status) setStatus(result.status)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [status, saleId, router])

  function retry() {
    startTransition(async () => {
      const result = await startMpPayment(saleId)
      setError(result.error)
      if (!result.error) setStatus(result.status)
    })
  }

  // No order yet (creating it right after the sale failed): try once more on
  // arrival, so the reason shows up without the cashier having to ask.
  useEffect(() => {
    if (initialStatus === null) retry()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, [])

  function settle(method: FallbackMethod) {
    startTransition(async () => {
      const result = await settleMpSaleOtherwise(saleId, method)
      if (result?.status === "processed") setStatus("processed")
      else if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="grid gap-4">
      {kind === "qr" && qrImageUrl && isOpen(status) && (
        // eslint-disable-next-line @next/next/no-img-element -- remote QR served by Mercado Pago
        <img
          src={qrImageUrl}
          alt="QR de Mercado Pago"
          className="mx-auto size-64 rounded-md border bg-white p-2"
        />
      )}

      <p className="text-sm text-muted-foreground">
        {status
          ? (STATUS_MESSAGE[kind][status] ?? `Estado: ${status}`)
          : "Todavía no se generó el cobro en Mercado Pago."}
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isOpen(status) && (
        <Button size="lg" disabled={pending} onClick={retry}>
          {kind === "point" ? "Enviar el cobro al posnet de nuevo" : "Generar el cobro de nuevo"}
        </Button>
      )}

      <div className="grid gap-2">
        <p className="text-sm font-medium">¿Se cobró de otra forma?</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(FALLBACK_LABEL[kind]) as FallbackMethod[]).map((method) => (
            <Button
              key={method}
              variant="outline"
              disabled={pending}
              onClick={() => settle(method)}
              className="h-auto min-h-9 whitespace-normal"
            >
              {FALLBACK_LABEL[kind][method]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
