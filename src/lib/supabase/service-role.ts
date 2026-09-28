import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/types/database.types"

// Bypasses RLS with the service-role key. Only for route handlers that must
// write sensitive rows (e.g. Mercado Pago OAuth tokens) that authenticated
// users have no direct table access to. Never import this from client code.
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
