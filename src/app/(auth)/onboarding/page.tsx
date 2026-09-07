import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single()

  if (profile?.org_id) {
    redirect("/")
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <OnboardingForm />
    </div>
  )
}
