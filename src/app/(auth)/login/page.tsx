"use client"

import { useActionState, useState } from "react"

import { signIn, signUp, type AuthActionState } from "../actions"
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

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    initialState
  )
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    initialState
  )

  const state = mode === "login" ? loginState : signupState

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            Sistema de gestión para forrajerías
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form action={loginAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </div>
              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <Button type="submit" disabled={loginPending}>
                {loginPending ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          ) : (
            <form action={signupAction} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Tu nombre</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup_email">Email</Label>
                <Input
                  id="signup_email"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup_password">Contraseña</Label>
                <Input
                  id="signup_password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <Button type="submit" disabled={signupPending}>
                {signupPending ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>
          )}

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
          >
            {mode === "login"
              ? "¿No tenés cuenta? Creá una"
              : "¿Ya tenés cuenta? Iniciá sesión"}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
