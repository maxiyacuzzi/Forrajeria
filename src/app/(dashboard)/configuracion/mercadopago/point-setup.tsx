"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { MercadoPagoTerminal } from "@/lib/mercadopago-orders"
import { listPointTerminals, removePointTerminal, selectPointTerminal } from "./actions"

export function PointSetup({ terminalId }: { terminalId: string | null }) {
  const [terminals, setTerminals] = useState<MercadoPagoTerminal[] | null>(null)
  const [pending, startTransition] = useTransition()

  function search() {
    startTransition(async () => {
      const result = await listPointTerminals()
      if (result.error) toast.error(result.error)
      else setTerminals(result.terminals)
    })
  }

  function select(id: string) {
    startTransition(async () => {
      const result = await selectPointTerminal(id)
      if (result.error) toast.error(result.error)
      else {
        toast.success("Posnet configurado. Si no toma los cobros, reinicialo.")
        setTerminals(null)
      }
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await removePointTerminal()
      if (result.error) toast.error(result.error)
    })
  }

  if (terminalId) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">
          Posnet integrado: <span className="font-mono">{terminalId}</span>
        </p>
        <Button variant="outline" size="sm" disabled={pending} onClick={remove}>
          Dejar de usarlo
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <Button variant="outline" disabled={pending} onClick={search} className="w-fit">
        {pending && !terminals ? "Buscando..." : "Buscar posnets de la cuenta"}
      </Button>

      {terminals?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay posnets Point vinculados a esta cuenta. Vinculalo desde la app de Mercado
          Pago (Point Smart o Point Pro) y buscá de nuevo.
        </p>
      )}

      {terminals?.map((terminal) => (
        <div
          key={terminal.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
        >
          <div className="grid gap-1">
            <span className="font-mono text-sm">{terminal.id}</span>
            <Badge variant={terminal.operating_mode === "PDV" ? "default" : "secondary"}>
              {terminal.operating_mode === "PDV" ? "Modo integrado" : "Modo manual"}
            </Badge>
          </div>
          <Button size="sm" disabled={pending} onClick={() => select(terminal.id)}>
            Usar este posnet
          </Button>
        </div>
      ))}
    </div>
  )
}
