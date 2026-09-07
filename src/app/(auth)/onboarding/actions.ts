"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { AuthActionState } from "../actions"

export async function createOrganization(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const orgName = String(formData.get("org_name") ?? "").trim()

  if (!orgName) {
    return { error: "Ingresá el nombre de la forrajería" }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("create_org_with_owner", {
    org_name: orgName,
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/")
}
