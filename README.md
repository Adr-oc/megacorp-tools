# MegaTools

Portal interno de herramientas del grupo MEGACORP.

## Stack

- Next.js 16 (App Router, TypeScript estricto)
- Tailwind CSS 4 + shadcn/ui (sobre Base UI)
- PostgreSQL 16 + Drizzle ORM
- Better Auth (con plugin organization + magicLink)
- Resend (email transaccional)
- Playwright (tests E2E)

## Desarrollo local

### Pre-requisitos
- Node 22+ con corepack habilitado
- pnpm
- Docker

### Setup

1. Clonar y entrar al directorio:
   ```bash
   git clone <repo> megacorp-tools
   cd megacorp-tools
   ```

2. Instalar dependencias:
   ```bash
   pnpm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar .env:
   #   - BETTER_AUTH_SECRET: generar con `openssl rand -base64 32`
   #   - RESEND_API_KEY: obtener en https://resend.com (necesaria en Fase 3+)
   ```

4. Levantar Postgres de desarrollo:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

5. Aplicar migraciones:
   ```bash
   pnpm db:migrate
   ```

6. Crear superadmin + organización inicial:
   ```bash
   pnpm bootstrap --email admin@megacorp.local --password "TuPasswordSegura!" --org "MEGACORP"
   ```

7. Levantar el servidor de dev:
   ```bash
   pnpm dev
   ```

Visitar http://localhost:3000.

### Scripts útiles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo con Turbopack |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción (después de build) |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generar migración Drizzle |
| `pnpm db:migrate` | Aplicar migraciones |
| `pnpm db:studio` | UI web de Drizzle Studio |
| `pnpm bootstrap` | CLI para crear superadmin + org inicial |
| `pnpm test:e2e` | Tests E2E con Playwright |

## Deploy en producción

1. Crear `.env.production` basado en `.env.production.example`:
   ```bash
   cp .env.production.example .env.production
   # Editar con valores reales
   ```

2. Build y levantar:
   ```bash
   docker compose --env-file .env.production up -d --build
   ```

3. Aplicar migraciones desde el container:
   ```bash
   docker compose --env-file .env.production exec app pnpm db:migrate
   ```

4. Bootstrap del superadmin (primera vez):
   ```bash
   docker compose --env-file .env.production exec app \
     pnpm bootstrap --email admin@tu-dominio.com --password "PasswordSegura!" --org "MEGACORP"
   ```

## Arquitectura

Ver `docs/superpowers/specs/2026-05-12-megacorp-tools-fundacion-design.md` para detalles arquitectónicos.

Resumen:
- App única con módulos internos (Next.js App Router)
- Multi-tenant por organización con RBAC simple (owner/admin/member)
- Registry de apps en `src/lib/apps/registry.ts` (single source of truth)
- Cada herramienta = una entrada en el registry + una carpeta en `src/app/(app)/tools/`

## Diseño

El portal sigue el brief en `docs/brand/2026-05-megatools-brief-v1.html`:
paleta cream paper / navy ink, tipografías Geist + JetBrains Mono +
Instrument Serif (italic, hero), logo MEGACORP en 3 tratamientos
(brand para marketing, mono adaptativo al tema para in-product) y
**accent color por usuario** con 6 presets (Mustard por default). Cada
persona elige el suyo en `Settings → Apariencia` y acompaña sus CTAs,
focus rings, estados activos de nav y links en todo el portal.

## Herramientas disponibles

- **PDF Workbench** (`/app/tools/pdf-workbench`) — Combiná, separá, reordená y editá páginas de uno o varios PDFs. Procesamiento 100% en el navegador, los archivos nunca tocan el servidor.

## Próximas herramientas

- Procesador de imágenes con IA (Sprint 2)
