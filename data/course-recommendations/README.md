# 厦马选课推荐清洗结果

来源：`厦马选课推荐.xlsx`，工作表 `工作表1`。

## 输出文件

- `course-recommendations.cleaned.json`：迁移脚本使用的结构化记录。
- `course-recommendations.cleaned.csv`：便于人工审阅的同一份记录。
- `course-recommendations.report.json`：清洗统计、排除范围和待确认项。

## 字段映射

| 清洗字段 | `course_reviews` 字段 | 处理方式 |
| --- | --- | --- |
| `course_name` | `course_name` | A 列课程名称，去除首尾空白；空白行沿用上一门课程。 |
| `teacher` | `teacher` | 源课程区没有稳定的教师列，保留 `NULL`。 |
| `tags` | `tag` / `tags_json` | 该表是选修推荐，使用 `GE`；脚本写入首标签和 JSON 多选字段。 |
| `rating` | `rating` | 源表没有结构化评分，清洗值为 3；迁移时可用 `--rating 1-5` 覆盖。 |
| `difficulty` | `difficulty` | 源表没有结构化难度，清洗值为 3；迁移时可用 `--difficulty 1-5` 覆盖。 |
| `comment` | `comment` | B 列问题与 C:AA 的回答拼接，保留换行；超过 3000 字符会截断并记录在报告。 |
| `term_year`, `term_month` | 同名字段 | 源表未给出学期，保留 `NULL`。 |
| `source_row`, `source_column`, `source_key` | 不入库 | 用于追溯和幂等去重。 |

课程区以外的“老师避雷、老师推荐、老师询问”和选课 FAQ 没有课程评价所需的稳定课程归属，因此只在报告中记录为排除项，没有混入 `course_reviews`。

## 迁移脚本

默认是 dry-run，只读检查目标库并统计将新增的记录：

```bash
node scripts/import-course-recommendations.js --created-by <已有 users.id>
```

确认结果后才执行写入：

```bash
node scripts/import-course-recommendations.js --apply --created-by <已有 users.id>
```

脚本从 `.env` 读取 `DATABASE_URL`、`MYSQL_URL` 或 `RAILWAY_MYSQL_URL`，也支持 `DB_*` 配置。它会校验用户和 `course_reviews` 表，使用事务写入，并按创建者、课程、教师、评论、学期组合跳过已存在记录。
