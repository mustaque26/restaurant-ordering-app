-- V2: add slug column to tenants and backfill values from name
ALTER TABLE tenants ADD COLUMN slug VARCHAR(255);

-- H2: backfill using REGEXP_REPLACE if supported; otherwise run manual updates
UPDATE tenants SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-')) WHERE slug IS NULL;
UPDATE tenants SET slug = TRIM(BOTH '-' FROM slug) WHERE slug IS NOT NULL;

-- Add unique constraint for slug (best-effort; may fail if duplicates exist)
ALTER TABLE tenants ADD CONSTRAINT uq_tenants_slug UNIQUE (slug);

