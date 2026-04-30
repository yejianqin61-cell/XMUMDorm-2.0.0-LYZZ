-- ============================================
-- 028 - Marketplace: delivery method + dorm area
-- - Remove contact input requirement (frontend); keep columns for backward compat
-- - Add required fields for listing display: delivery_method, dorm_area
-- ============================================

ALTER TABLE marketplace_items
  ADD COLUMN delivery_method ENUM('pickup','delivery') NOT NULL DEFAULT 'pickup' AFTER tags_json,
  ADD COLUMN dorm_area VARCHAR(10) NOT NULL DEFAULT 'LY1' AFTER delivery_method;

-- Optional: index for filtering/sorting in future
CREATE INDEX idx_marketplace_items_dorm_delivery ON marketplace_items (dorm_area, delivery_method, created_at, id);

