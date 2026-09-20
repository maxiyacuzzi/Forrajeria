"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { signOut } from "../(auth)/actions"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/types/database.types"

type Role = Database["public"]["Enums"]["user_role"]

const NAV_ITEMS: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Inicio", roles: ["owner", "vendedor", "deposito"] },
  { href: "/reportes", label: "Reportes", roles: ["owner"] },
  { href: "/clientes", label: "Clientes", roles: ["owner", "vendedor", "deposito"] },
  { href: "/fidelidad", label: "Fidelidad", roles: ["owner", "vendedor", "deposito"] },
  { href: "/ventas", label: "Ventas", roles: ["owner", "vendedor", "deposito"] },
  { href: "/caja", label: "Caja", roles: ["owner", "vendedor"] },
  { href: "/gastos", label: "Gastos", roles: ["owner", "vendedor"] },
  { href: "/productos", label: "Productos", roles: ["owner", "vendedor", "deposito"] },
  { href: "/proveedores", label: "Proveedores", roles: ["owner", "deposito"] },
  { href: "/stock", label: "Stock", roles: ["owner", "vendedor", "deposito"] },
  {
    href: "/stock/movimientos",
    label: "Movimientos",
    roles: ["owner", "vendedor", "deposito"],
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
    <aside className="flex flex-col gap-4 border-b border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:h-svh md:overflow-y-auto md:border-b-0 md:border-r md:p-6">
      <div className="flex items-center gap-2">
        <Image
          src="/logo-mark.png"
          alt=""
          width={36}
          height={36}
          className="shrink-0"
        />
        <div>
          <p className="font-semibold leading-tight">{orgName}</p>
          <p className="text-xs text-sidebar-foreground/70">
            {fullName} · {ROLE_LABEL[role]}
          </p>
        </div>
      </div>

      <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-sidebar-accent",
              pathname === item.href && "bg-sidebar-accent font-medium"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between gap-2">
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            Cerrar sesión
          </Button>
        </form>
        <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
      </div>
    </aside>
  )
}

const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  vendedor: "Vendedor",
  deposito: "Depósito",
}
