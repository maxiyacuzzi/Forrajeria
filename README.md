# Forrajería — Sistema de gestión

Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, RLS). Ver [PRD.md](./PRD.md)
para el alcance funcional completo.

Estado actual: **Módulo 1 — Stock y Fraccionamiento**, más el andamiaje transversal
(auth, organizaciones/multi-tenant, roles).

## Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui (estilo `base-nova`,
  sobre [Base UI](https://base-ui.com/) — no Radix).
- **Backend**: Supabase (Postgres + Auth + Row Level Security). Sin backend propio:
  el cliente habla directo con Postgres a través de PostgREST, protegido por RLS.
- **Multi-tenant**: una fila en `organizations` por forrajería cliente; todas las tablas
  de negocio llevan `org_id` y están aisladas con RLS (`auth_org_id()`).
- **Formularios**: react-hook-form + zod.

## Desarrollo local

Requiere [Docker](https://www.docker.com/) corriendo (Supabase local lo usa para
levantar Postgres, Auth, etc.) y el [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase start        # levanta el stack local (primera vez descarga imágenes, tarda)
cp .env.local.example .env.local   # completar con la Anon Key/URL que imprime `supabase start`
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). El primer usuario que se registra
pasa por `/onboarding` para crear su forrajería (organización) y queda como `owner`.

### Migraciones

El esquema vive en `supabase/migrations/`. Para aplicar cambios nuevos contra la base
local:

```bash
supabase db reset      # recrea la DB local y corre todas las migraciones desde cero
```

Después de cualquier cambio de esquema, regenerar los tipos de TypeScript:

```bash
supabase gen types typescript --local > src/lib/types/database.types.ts
```

### Roles

- `owner`: dueño/encargado. Acceso total.
- `deposito`: recibe mercadería, fracciona, ajusta stock.
- `vendedor`: por ahora solo lectura en este módulo (se activa en el módulo de ventas).

## Estructura

```
supabase/migrations/   # esquema versionado (organizations, profiles, products,
                        # stock_movements + trigger, fractionings + RPCs, RLS)
src/app/(auth)/         # login, signup, onboarding
src/app/(dashboard)/    # productos, stock, movimientos, fraccionamiento
src/lib/supabase/       # clientes browser/server + middleware de sesión
src/lib/validations/    # esquemas zod compartidos por formularios y server actions
```

## Fuera de esta pasada

Mezclas/elaboración propia, vencimientos y lotes, ventas/comprobantes y precios
(módulos 2 a 5 del PRD) — el esquema de `stock_movements` ya reserva los tipos de
movimiento para no requerir una migración disruptiva más adelante.
