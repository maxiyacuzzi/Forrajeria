"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { signOut } from "../(auth)/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/types/database.types"

type Role = Database["public"]["Enums"]["user_role"]

const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/productos", label: "Productos", roles: ["owner", "vendedor", "deposito"] },
  { href: "/stock", label: "Stock", roles: ["owner", "vendedor", "deposito"] },
  {
    href: "/stock/movimientos",
    label: "Movimientos",
    roles: ["owner", "vendedor", "deposito"],
  },
  {
    href: "/fraccionamiento",
    label: "Fraccionamiento",
    roles: ["owner", "deposito"],
  },
]

export function DashboardNav({
  orgName,
  fullName,
  role,
}: {
  orgName: string
  fullName: string | null
  role: Role
}) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col gap-4 border-b p-4 md:h-svh md:border-b-0 md:border-r md:p-6">
      <div>
        <p className="font-semibold leading-tight">{orgName}</p>
        <p className="text-xs text-muted-foreground">
          {fullName} · {ROLE_LABEL[role]}
        </p>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-muted",
              pathname === item.href && "bg-muted font-medium"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form action={signOut} className="mt-auto">
        <Button type="submit" variant="ghost" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </aside>
  )
}

const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  vendedor: "Vendedor",
  deposito: "Depósito",
}
