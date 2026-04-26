/**
 * Add performance indexes for posts/tags/comments.
 *
 * Usage:
 *   node scripts/migrate_014_perf_indexes_posts_comments.js
 */
const { query } = require('../database');

async function indexExists(table, indexName) {
  const rows = await query(
    `SELECT 1
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?
     LIMIT 1`,
    [table, indexName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function addIndex(table, indexName, ddl) {
  try {
    if (await indexExists(table, indexName)) {
      console.log(`[skip] ${table}.${indexName} already exists`);
      return;
    }
    console.log(`[run] ${ddl}`);
    await query(ddl);
    console.log(`[ok] ${table}.${indexName}`);
  } catch (e) {
    console.warn(`[warn] failed to add ${table}.${indexName}: ${e.message || e}`);
  }
}

async function main() {
  // posts profile: WHERE user_id=? AND deleted_at IS NULL AND hidden_by_admin=0 ORDER BY created_at DESC
  await addIndex(
    'posts',
    'idx_posts_user_deleted_hidden_created',
    'ALTER TABLE posts ADD INDEX idx_posts_user_deleted_hidden_created (user_id, deleted_at, hidden_by_admin, created_at)'
  );

  // comments list: WHERE post_id=? AND deleted_at IS NULL ORDER BY created_at ASC
  await addIndex(
    'comments',
    'idx_comments_post_deleted_created',
    'ALTER TABLE comments ADD INDEX idx_comments_post_deleted_created (post_id, deleted_at, created_at)'
  );

  // likes: existence check (user_id, post_id) and counting by post_id
  await addIndex(
    'post_likes',
    'idx_post_likes_user_post',
    'ALTER TABLE post_likes ADD INDEX idx_post_likes_user_post (user_id, post_id)'
  );
  await addIndex(
    'post_likes',
    'idx_post_likes_post',
    'ALTER TABLE post_likes ADD INDEX idx_post_likes_post (post_id)'
  );

  // images: join on post_id + sort_order
  await addIndex(
    'post_images',
    'idx_post_images_post_sort',
    'ALTER TABLE post_images ADD INDEX idx_post_images_post_sort (post_id, sort_order)'
  );

  // notifications: unread announcements & list
  await addIndex(
    'notifications',
    'idx_notifications_user_type_read_created',
    'ALTER TABLE notifications ADD INDEX idx_notifications_user_type_read_created (user_id, type, is_read, created_at)'
  );

  // tags mapping: WHERE post_id IN (...) and join tag_id
  await addIndex(
    'post_tag_map',
    'idx_post_tag_map_post',
    'ALTER TABLE post_tag_map ADD INDEX idx_post_tag_map_post (post_id)'
  );
  await addIndex(
    'post_tag_map',
    'idx_post_tag_map_post_tag',
    'ALTER TABLE post_tag_map ADD INDEX idx_post_tag_map_post_tag (post_id, tag_id)'
  );
}

main()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

