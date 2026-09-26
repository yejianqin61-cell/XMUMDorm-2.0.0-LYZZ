-- Handbook external articles from 大马口袋.
-- These records are directional links: the web card opens external_url in a new tab.

ALTER TABLE handbook_articles
  ADD COLUMN content_type ENUM('markdown', 'external_link') NOT NULL DEFAULT 'markdown' AFTER content,
  ADD COLUMN external_url VARCHAR(600) NULL AFTER content_type,
  ADD INDEX idx_handbook_article_content_type (content_type);

INSERT INTO handbook_articles
  (tab_id, author_user_id, title, summary, content, content_type, external_url, source_name, source_link, status, published_at)
SELECT
  t.id,
  1,
  seed.title,
  seed.summary,
  '',
  'external_link',
  seed.external_url,
  '大马口袋',
  seed.external_url,
  'published',
  CURRENT_TIMESTAMP
FROM handbook_tabs t
INNER JOIN (
  SELECT 'food' AS tab_slug, '厦马校园餐厅指南' AS title, '校内餐厅与用餐选择的外部指南。' AS summary, 'https://mp.weixin.qq.com/s/7veywunEJxWM4bhRQzqLoQ' AS external_url
  UNION ALL SELECT 'food', '《厦马学生续命指南》——厦马周边隐藏宝藏美食分享', '厦马周边美食的外部推荐。', 'https://mp.weixin.qq.com/s/7I4HpbvI_IROJEzpW0OwOg'
  UNION ALL SELECT 'explore', '厦马校园及周边自习与聚会好去处', '自习、聚会与休闲去处的外部指南。', 'https://mp.weixin.qq.com/s/m1b_cRffLeGJ3uU0xNiJDw'
  UNION ALL SELECT 'campus-guide', '厦马生活一条街', '厦马生活一条街的外部介绍。', 'https://mp.weixin.qq.com/s/jaKUxlBC2YtXuMbaQS6UCQ'
  UNION ALL SELECT 'campus-guide', '厦马校园导览', '校园路线与场所的外部导览。', 'https://mp.weixin.qq.com/s/wnWqjQzxQT9ZjYhUu97CIw'
  UNION ALL SELECT 'campus-guide', '厦马重要办公室介绍', '校内重要办公室与办事入口的外部介绍。', 'https://mp.weixin.qq.com/s/GBL84ZLg30byHfxq3b6qsA'
  UNION ALL SELECT 'campus-guide', '厦马宿舍入住指南', '宿舍入住流程与注意事项的外部指南。', 'https://mp.weixin.qq.com/s/KEzrvZA5cy-_KbUl0-KFuA'
  UNION ALL SELECT 'campus-guide', '厦马校外周边日常采购指南', '校外日常采购的外部指南。', 'https://mp.weixin.qq.com/s/LRW4cc_empofW9bNpc907A'
) AS seed ON seed.tab_slug = t.slug
WHERE t.is_enabled = 1
  AND NOT EXISTS (
    SELECT 1
    FROM handbook_articles existing
    WHERE existing.external_url = seed.external_url
      AND existing.deleted_at IS NULL
  );
