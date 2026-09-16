import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/types/database.types"

/**
 * Looks up the current user's org_id. Callers used to run
 * `.from("profiles").select("org_id").single()` with no filter — that only
 * worked by accident while every org had exactly one member, since RLS lets
 * a user see every profile in their org, not just their own. Once an org
 * gets a second member, that unfiltered query returns 2+ rows and
 * `.single()` errors out, so this always scopes to the caller's own row.
 */
export async function getUserOrgId(
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single()

  return profile?.org_id ?? null
}

/** Same unfiltered-`.single()` pitfall as {@link getUserOrgId}, for role checks. */
export async function getUserRole(
  supabase: SupabaseClient<Database>
): Promise<Database["public"]["Enums"]["user_role"] | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return profile?.role ?? null
}
