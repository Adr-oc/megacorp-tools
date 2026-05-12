import { pgTable, text, timestamp, jsonb, uniqueIndex, index, uuid } from 'drizzle-orm/pg-core'

// Preferencias por usuario (tema, idioma, etc.)
// key-value flexible: la forma del value vive en Zod schemas (lib/settings/schema.ts)
export const appSetting = pgTable(
  'app_setting',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userKeyUnique: uniqueIndex('app_setting_user_key_uq').on(t.userId, t.key),
  })
)

// Preferencias por organización (branding, SMTP, etc.)
export const orgSetting = pgTable(
  'org_setting',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: text('organization_id').notNull(),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgKeyUnique: uniqueIndex('org_setting_org_key_uq').on(t.organizationId, t.key),
  })
)

// Bitácora de acciones relevantes (invitaciones, cambios de rol, settings, uso de apps)
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id'),
    organizationId: text('organization_id'),
    action: text('action').notNull(),
    target: text('target'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgCreatedIdx: index('audit_log_org_created_idx').on(t.organizationId, t.createdAt),
    userCreatedIdx: index('audit_log_user_created_idx').on(t.userId, t.createdAt),
  })
)
