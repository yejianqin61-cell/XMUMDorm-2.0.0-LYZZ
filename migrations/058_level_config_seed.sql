-- 058_level_config_seed.sql
-- 等级系统配置种子数据（幂等）
INSERT IGNORE INTO system_configs (config_key, config_value, description) VALUES
  ('level_thresholds', '{"1":0,"2":100,"3":300,"4":800,"5":1800,"6":4000,"7":8000}', '等级经验阈值（累计经验达到即升级）'),
  ('exp_daily_caps', '{"login":5,"like":30,"comment":50,"post":30,"canteen_review":30}', '每日经验上限（按行为类型）'),
  ('exp_action_rewards', '{"login":5,"like":1,"comment":2,"post":10,"canteen_review":5}', '单次行为经验奖励');
