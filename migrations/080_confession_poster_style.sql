-- description: Persist mobile wall style, publication retry keys, and edit revisions.
-- depends: 064_confessions
-- note: renumbered from 078 after origin/main added 078_user_follows and 079_dorm_ids.
ALTER TABLE confessions
  ADD COLUMN poster_style JSON NULL,
  ADD COLUMN publish_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 0,
  ADD UNIQUE KEY uq_confessions_author_publish (user_id, publish_key);
