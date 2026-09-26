-- Backfill numeric scores for existing food comments with NPC-or-better ratings.
-- Mapping follows the product review scale: NPC=7, 人上人=8, 顶级=9, 夯爆了=10.
-- Safe to run repeatedly: rows with an existing score are left unchanged.

UPDATE product_comments
SET score = CASE rating
  WHEN 'NPC' THEN 7
  WHEN '人上人' THEN 8
  WHEN '顶级' THEN 9
  WHEN '夯爆了' THEN 10
END
WHERE score IS NULL
  AND rating IN ('NPC', '人上人', '顶级', '夯爆了');
