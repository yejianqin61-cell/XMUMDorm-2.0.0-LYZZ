-- Add Major as an organization type. Major notices are shown in the college feed.
USE jack_campus;

ALTER TABLE organizations
  MODIFY COLUMN type ENUM('SchoolDepartment', 'College', 'Major', 'Official') NOT NULL
  COMMENT 'SchoolDepartment=学校部门, College=学院, Major=专业, Official=官方号';
