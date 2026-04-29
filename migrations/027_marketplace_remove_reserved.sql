-- ============================================
-- 027 - Marketplace: remove reserved status
-- - Backfill reserved -> on_sale
-- - Alter ENUM to only on_sale / sold
-- ============================================

-- backfill legacy reserved
UPDATE marketplace_items
SET status = 'on_sale'
WHERE status = 'reserved';

-- remove enum value 'reserved'
ALTER TABLE marketplace_items
  MODIFY COLUMN status ENUM('on_sale','sold') NOT NULL DEFAULT 'on_sale';

