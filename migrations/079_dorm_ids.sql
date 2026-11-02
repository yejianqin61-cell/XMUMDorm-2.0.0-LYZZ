ALTER TABLE users ADD COLUMN dorm_id VARCHAR(21) NULL AFTER student_id;

UPDATE users
   SET dorm_id = CONCAT('DORM-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 16)))
 WHERE dorm_id IS NULL OR dorm_id = '';

ALTER TABLE users MODIFY dorm_id VARCHAR(21) NOT NULL;

CREATE UNIQUE INDEX uq_users_dorm_id ON users (dorm_id);
