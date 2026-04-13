-- V1: add tenant_id column to menu_items
ALTER TABLE menu_items ADD COLUMN tenant_id BIGINT;

