-- Migration: add tenant_id column to menu_items so menu items can be tenant-specific
-- Run this against your existing DB. This is a no-op if the column already exists.

ALTER TABLE menu_items ADD COLUMN tenant_id BIGINT;

-- Optionally: if you want to mark all existing rows as global (NULL) this is already default.
-- You can also backfill tenant-specific items later with UPDATE statements.

