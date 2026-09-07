"use client"

import { useActionState } from "react"

import { createOrganization } from "./actions"
import type { AuthActionState } from "../actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: AuthActionState = { error: null }

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createOrganization,
    initialState
  )

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Creá tu forrajería</CardTitle>
        <CardDescription>
          Vas a ser el administrador de esta cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="org_name">Nombre de la forrajería</Label>
            <Input id="org_name" name="org_name" required autoFocus />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
