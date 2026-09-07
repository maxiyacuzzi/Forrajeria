import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { DashboardNav } from "./dashboard-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, org_id, organizations(name)")
    .eq("id", user.id)
    .single()

  if (!profile?.org_id) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-svh md:grid md:grid-cols-[220px_1fr]">
      <DashboardNav
        orgName={profile.organizations?.name ?? ""}
        fullName={profile.full_name}
        role={profile.role}
      />
      <main className="p-4 md:p-8">{children}</main>
    </div>
  )
}
