import { type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // The Mercado Pago webhook is called without a session; it checks its own signature.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|api/mercadopago/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
