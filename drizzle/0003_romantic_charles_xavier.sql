ALTER TABLE "organization" ADD COLUMN "parent_organization_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;