# MegaTools — Spec: Multi-organización + Super Admins

> Estado: **PROPUESTA** (pendiente de validación de Adroc antes de implementar).
> Fecha: 2026-05-26. Autor: TARS (asistido). Codificación SGCS sugerida: P-XX.

## 1. Objetivo

Pasar de un modelo de **una sola organización (MEGACORP)** a **multi-organización**, para
que el grupo MEGACORP modele sus afiliadas (EGAMSA, 301 Megapólizas, assukargo,
ERPConnectAI, Portal Santa Elena, etc.) como organizaciones separadas dentro del
mismo portal, con permisos delegados.

## 2. Modelo de roles (lo que pidió Adroc)

Dos niveles de autoridad:

| Rol | Alcance | Puede |
|---|---|---|
| **Super Admin** (nuevo, global) | Todo el portal / todas las orgs | Crear/editar/borrar organizaciones; crear/editar/mover usuarios de cualquier org; asignar owners; ver todo. |
| **Owner** (existente, por org) | Solo SU organización | Modificar datos, miembros, settings y herramientas **de su propia org únicamente**. NO ve ni toca otras orgs. |
| **Admin** (existente, por org) | Solo SU organización | Gestión delegada dentro de su org (según ya está). |
| **Member** (existente, por org) | Solo SU organización | Usar herramientas, editar su propio perfil. |

Clave: **Super Admin es global y por encima de los owners**. El owner queda
acotado a su propia organización (como hoy, pero ahora hay varias orgs).

## 3. Estado actual (lo que hay que cambiar)

En `src/lib/auth/server.ts`, plugin organization:
```
allowUserToCreateOrganization: false   // nadie crea orgs
organizationLimit: 1                   // 1 org por usuario
```
Better Auth ya soporta nativamente: múltiples orgs, roles por org (owner/admin/member),
invitaciones por org, y `activeOrganizationId` en la sesión. El modelo de datos
(`organization`, `member`, `invitation`) ya es multi-org. **Falta activarlo y
agregar la capa de Super Admin** (que Better Auth NO trae de fábrica para "global").

## 4. Cambios necesarios

### 4.1 Concepto de Super Admin (global)
Better Auth organiza permisos POR organización, no tiene "super admin global" nativo.
Opciones:
- **(A) Campo en user**: agregar `user.isSuperAdmin: boolean` (additionalFields, como ya se
  hace con accentColor/onboardedAt). Simple, directo. **Recomendado.**
- (B) Plugin admin de Better Auth: tiene roles globales (admin/user) y banear/impersonar.
  Más potente pero más superficie. Evaluar si se quiere impersonación.

Recomendación: **(A)** para empezar — un flag `isSuperAdmin`. Los super admins se
asignan vía script/seed (como el bootstrap actual) o desde un panel super-admin.

### 4.2 Activar multi-org
- `organizationLimit`: subir (ej. 50) o quitar el cap — un usuario puede pertenecer a varias orgs.
- `allowUserToCreateOrganization`: mantener `false` (que NO cualquiera cree orgs); la
  creación de orgs queda restringida a Super Admins vía acción server propia.

### 4.3 Selector de organización (NUEVO — no existe hoy)
Si un usuario pertenece a varias orgs, necesita un **switcher** para cambiar la org activa
(setea `activeOrganizationId` en la sesión). Va en el header o el footer del sidebar.
Para usuarios de una sola org, se oculta o muestra estática.

### 4.4 Panel de Super Admin (NUEVO)
Ruta nueva, ej. `/app/admin` (gateada por `isSuperAdmin`):
- **Organizaciones**: listar, crear, editar, borrar; asignar/ver owners.
- **Usuarios**: listar (cross-org), crear, editar, mover entre orgs, asignar roles.
- Todo lo que hace un owner pero sobre CUALQUIER org.

### 4.5 Gates de permiso
- `requireApp` y las server actions ya verifican rol POR org activa. Bien.
- Agregar helper `requireSuperAdmin()` (server) que verifica `user.isSuperAdmin`.
- Las acciones de gestión cross-org pasan por `requireSuperAdmin`.
- Los owners SIGUEN acotados a su `activeOrganizationId` (sin cambios).

### 4.6 Aislamiento de datos por org (verificar)
- Las tools ya separan por `organizationId` (orgSetting, email-signature, etc.). ✅
- `appSetting` es por usuario (global al usuario, no por org) — revisar si los datos de
  usuario deben ser por-org o globales. Para firmas de correo: probablemente por-org
  (distinta firma según la empresa). DECISIÓN PENDIENTE.

## 5. Decisiones (RESUELTAS por Adroc 2026-05-26)

1. **Super Admin = flag simple (A).** Campo `user.isSuperAdmin`.
2. **Super Admin inicial: `it@erpconnectai.com`.**
3. **Datos de usuario = POR ORGANIZACIÓN.** Las prefs/firma de un usuario son por org
   activa, no globales. Implica: mover `appSetting` de clave `(userId, key)` a
   `(userId, organizationId, key)` — o usar orgSetting+userId. Ver §8.
4. **Jerarquía: orgs MADRE → afiliadas.** MEGACORP es madre de sus afiliadas (EGAMSA,
   301, assukargo, etc.). El patrón se repite: el Super Admin puede crear OTRAS orgs
   madre, cada una con sus propias afiliadas. Es un árbol de 2 niveles
   (madre → hijas). Ver §9.
5. **Creación de orgs: solo Super Admin** (allowUserToCreateOrganization sigue false).

## 8. Datos por organización (decisión #3)

Hoy `appSetting (userId, key, value)` con unique en (userId,key) → un usuario tiene UNOS
datos globales. Como ahora son por-org:
- Cambiar a clave compuesta `(userId, organizationId, key)` con su unique index.
- REQUIERE migración de schema Drizzle (nueva columna organizationId + reindex).
- Las server actions de tools (email-signature data, prefs) pasan a leer/escribir con
  el `activeOrganizationId` de la sesión.
- Migración de datos existentes: los appSetting actuales se atan a la org actual del
  usuario (MEGACORP) al migrar.

## 9. Jerarquía madre → afiliadas (decisión #4)

Better Auth NO soporta jerarquía de orgs nativamente. Hay que agregarla:
- Nueva columna `organization.parentOrganizationId` (nullable; null = org madre/raíz).
- Una org madre tiene parentId = null; las afiliadas apuntan a su madre.
- Árbol de 2 niveles: madre → hijas (no se permite más profundidad por ahora).
- El Super Admin crea madres (parentId null) y afiliadas (parentId = una madre).
- **Implicaciones a definir más adelante (no bloquean Fase A):**
  - ¿El owner de la org MADRE ve/gestiona sus afiliadas, o solo el Super Admin?
    (Adroc dijo: owner solo ve lo suyo → por defecto el owner de la madre NO gestiona
    hijas; eso lo hace el Super Admin. CONFIRMAR si la madre debe tener visibilidad.)
  - Reportería consolidada del grupo (madre agrega datos de hijas) → futuro, no existe aún.

## 10. Fases de implementación (actualizado)

- **Fase A** (base): `user.isSuperAdmin` + seed para it@erpconnectai.com +
  `requireSuperAdmin()` helper + activar multi-org (subir organizationLimit) +
  `organization.parentOrganizationId` (columna, migración). Sin UI todavía.
- **Fase B**: selector de organización en el shell (cambiar org activa).
- **Fase C**: panel Super Admin `/app/admin` — CRUD de orgs (madre/afiliada con
  jerarquía) + CRUD de usuarios cross-org + asignar owners.
- **Fase D**: datos de usuario por-org (migración appSetting §8) + aislamiento + auditoría + tests de seguridad.

El orden permite tener super-admin + multi-org funcionando (A-C) antes de la migración
de datos por-org (D), que es la más delicada.

## 6. Alcance / esfuerzo

Cambio **grande pero incremental**. Fases sugeridas:
- **Fase A**: flag isSuperAdmin + helper requireSuperAdmin + activar multi-org (límites).
- **Fase B**: selector de org en el shell.
- **Fase C**: panel Super Admin (orgs CRUD + usuarios CRUD cross-org).
- **Fase D**: pulido de aislamiento de datos por org + auditoría.

No rompe las herramientas existentes (ya son org-aware). El riesgo principal es de
**seguridad** (gates correctos: que un owner NUNCA toque otra org) → requiere tests.

## 7. Cumplimiento (MS-IA-01)
Toca auth, permisos y datos de múltiples afiliadas → cambio sensible. Validación humana
antes de producción (§4). Implementar en rama feature, probar en staging con usuarios
de prueba por org antes de exponer.
