-- ============================================
-- 其它高频只读接口索引：tags / regions
-- ============================================
-- 使用：
-- mysql -u root -p jack_campus < migrations/016_misc_perf_indexes.sql
--
USE jack_campus;

-- /api/posts/tags: ORDER BY created_at ASC, id ASC
CREATE INDEX idx_tags_created_id
  ON tags(created_at, id);

-- /api/canteen/regions: ORDER BY sort_order ASC
CREATE INDEX idx_regions_sort
  ON regions(sort_order, id);

