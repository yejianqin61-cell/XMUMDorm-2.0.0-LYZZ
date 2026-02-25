-- ============================================
-- 排行榜系统：商品/店铺/用户统计字段
-- ============================================
-- 执行前需已执行 002_canteen_system.sql
-- 使用: mysql -u root -p jack_campus < migrations/003_ranking_system.sql
-- 说明：若库中已有商品评论，本迁移不会回填历史数据，新点评将自动累计；可选单独运行回填脚本。

USE jack_campus;

-- ---------- 1. 商品表：各等级点评数、总点评数、累计综合评分 ----------
-- 等级顺序：1=夯爆了(10分) 2=顶级(7) 3=人上人(4) 4=NPC(1) 5=拉完了(-1)
ALTER TABLE products
  ADD COLUMN count_rating_1 INT NOT NULL DEFAULT 0 COMMENT '夯爆了 条数',
  ADD COLUMN count_rating_2 INT NOT NULL DEFAULT 0 COMMENT '顶级 条数',
  ADD COLUMN count_rating_3 INT NOT NULL DEFAULT 0 COMMENT '人上人 条数',
  ADD COLUMN count_rating_4 INT NOT NULL DEFAULT 0 COMMENT 'NPC 条数',
  ADD COLUMN count_rating_5 INT NOT NULL DEFAULT 0 COMMENT '拉完了 条数',
  ADD COLUMN review_count INT NOT NULL DEFAULT 0 COMMENT '一级点评总数',
  ADD COLUMN comprehensive_score DECIMAL(5,2) NULL COMMENT '累计综合评分 S_dish，0点评为NULL';

-- ---------- 2. 店铺表：各等级点评数、总点评数、综合评分、当周点评数 ----------
ALTER TABLE shops
  ADD COLUMN count_rating_1 INT NOT NULL DEFAULT 0 COMMENT '夯爆了 条数',
  ADD COLUMN count_rating_2 INT NOT NULL DEFAULT 0 COMMENT '顶级 条数',
  ADD COLUMN count_rating_3 INT NOT NULL DEFAULT 0 COMMENT '人上人 条数',
  ADD COLUMN count_rating_4 INT NOT NULL DEFAULT 0 COMMENT 'NPC 条数',
  ADD COLUMN count_rating_5 INT NOT NULL DEFAULT 0 COMMENT '拉完了 条数',
  ADD COLUMN review_count INT NOT NULL DEFAULT 0 COMMENT '一级点评总数',
  ADD COLUMN comprehensive_score DECIMAL(5,2) NULL COMMENT '商家综合评分 S_shop',
  ADD COLUMN weekly_review_count INT NOT NULL DEFAULT 0 COMMENT '当周点评数，每周一0点东八区重置';

-- ---------- 3. 用户表：当周点评数（点评达人榜、个人空间展示） ----------
ALTER TABLE users
  ADD COLUMN weekly_comment_count INT NOT NULL DEFAULT 0 COMMENT '当周点评数，每周一0点东八区重置';
