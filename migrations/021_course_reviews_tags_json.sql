-- ============================================
-- Course reviews: multi-select tags
-- - 新增 tags_json 用于多选标签
-- - 兼容旧字段 tag：把 tag 回填进 tags_json
-- ============================================

USE jack_campus;

ALTER TABLE course_reviews
  ADD COLUMN tags_json JSON NULL AFTER tag,
  ADD INDEX idx_tags_json ((CAST(JSON_EXTRACT(tags_json, '$') AS CHAR(200))));

-- 回填：把单选 tag 迁移到多选 tags_json（避免覆盖已有 tags_json）
UPDATE course_reviews
SET tags_json = JSON_ARRAY(COALESCE(NULLIF(tag, ''), 'required'))
WHERE tags_json IS NULL;

