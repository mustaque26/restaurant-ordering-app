-- Migration: add slug column to tenants and backfill values from name
ALTER TABLE tenants ADD COLUMN slug VARCHAR(255);

-- Backfill: generate a slug from name for databases that support regexp (H2 supports regexp_replace via function)
-- Use a simple update that replaces non-alphanumerics with hyphens and lowercases. For H2, we can use TRANSLATE/REGEXP_REPLACE if configured.

-- H2: use REGEXP_REPLACE if available
UPDATE tenants SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-')) WHERE slug IS NULL;

-- Trim leading/trailing hyphens (best-effort)
UPDATE tenants SET slug = TRIM(BOTH '-' FROM slug) WHERE slug IS NOT NULL;

-- Make column unique if your DB supports it; run separately if constraint addition fails due to duplicates
ALTER TABLE tenants ADD CONSTRAINT uq_tenants_slug UNIQUE (slug);

