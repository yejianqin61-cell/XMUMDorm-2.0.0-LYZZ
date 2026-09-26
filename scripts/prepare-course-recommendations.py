#!/usr/bin/env python3
"""Extract the course-review section from 厦马选课推荐.xlsx.

The workbook is an irregular export rather than a rectangular table.  This
script reads the worksheet XML directly so it does not depend on Excel or
openpyxl styles, then emits a reviewable JSON/CSV extract and a QA report.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import zipfile
from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
COURSE_COLUMNS = [chr(code) for code in range(ord("C"), ord("Z") + 1)] + ["AA"]
HEADER_ROWS = {4, 78, 118}
COURSE_SECTIONS = {"Art", "Business", "Science", "新设课程"}
NON_REVIEW_SECTIONS = {"老师避雷", "老师推荐", "老师询问", "选课常见问题：专业回答请email学校官方"}
PLACEHOLDERS = {"-", "无评价", "暂无评价", "暂无", "无"}


def read_rows(path: Path):
    with zipfile.ZipFile(path) as book:
        strings = []
        shared = ET.fromstring(book.read("xl/sharedStrings.xml"))
        for item in shared.findall("m:si", NS):
            strings.append("".join(t.text or "" for t in item.iterfind(".//m:t", NS)))

        sheet = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in sheet.findall(".//m:sheetData/m:row", NS):
            number = int(row.attrib["r"])
            values = {}
            for cell in row.findall("m:c", NS):
                value_node = cell.find("m:v", NS)
                value = "" if value_node is None else value_node.text or ""
                if cell.attrib.get("t") == "s" and value:
                    value = strings[int(value)]
                values[cell.attrib["r"]] = value
            rows.append((number, values))
        return rows


def clean_text(value: str) -> str:
    value = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"[ \t\u00a0]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def stable_key(course: str, comment: str) -> str:
    payload = f"{course}\n{comment}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:24]


def extract(path: Path):
    rows = read_rows(path)
    records = []
    report = {
        "source_file": path.name,
        "source_sheet": "工作表1",
        "excluded_sections": [],
        "question_only_rows": [],
        "truncated_comments": [],
        "duplicate_comments": [],
        "ignored_placeholders": 0,
    }
    current_section = None
    current_course = None
    course_rows = []

    for row_number, values in rows:
        a = clean_text(values.get(f"A{row_number}", ""))
        if row_number in HEADER_ROWS or a == "课程名称":
            continue
        if a in COURSE_SECTIONS:
            current_section = a
            current_course = None
            continue
        if a in NON_REVIEW_SECTIONS:
            report["excluded_sections"].append({"row": row_number, "section": a})
            current_section = a
            current_course = None
            continue
        if not (5 <= row_number <= 159):
            continue
        if a:
            current_course = a
            course_rows.append((row_number, current_course, current_section))
        if not current_course:
            continue

        question = clean_text(values.get(f"B{row_number}", ""))
        cells = []
        for column in COURSE_COLUMNS:
            text = clean_text(values.get(f"{column}{row_number}", ""))
            if not text:
                continue
            if text in PLACEHOLDERS:
                report["ignored_placeholders"] += 1
                continue
            if len(text) > 3000:
                report["truncated_comments"].append({"row": row_number, "column": column, "original_length": len(text)})
                text = text[:2997].rstrip() + "..."
            comment = f"问题：{question}\n{text}" if question else text
            cells.append((column, comment))

        if not cells and question and question not in PLACEHOLDERS:
            report["question_only_rows"].append({"row": row_number, "course_name": current_course, "question": question})
        for column, comment in cells:
            records.append({
                "source_row": row_number,
                "source_column": column,
                "source_section": current_section,
                "course_name": current_course,
                "teacher": None,
                "tags": ["GE"],
                "rating": 3,
                "difficulty": 3,
                "comment": comment,
                "term_year": None,
                "term_month": None,
                "source_key": stable_key(current_course, comment),
            })

    seen = {}
    deduped = []
    for record in records:
        if record["source_key"] in seen:
            report["duplicate_comments"].append({"source_key": record["source_key"], "first_row": seen[record["source_key"]], "duplicate_row": record["source_row"]})
            continue
        seen[record["source_key"]] = record["source_row"]
        deduped.append(record)

    report.update({
        "course_rows": len(course_rows),
        "unique_courses": len({x[1] for x in course_rows}),
        "review_rows_before_dedup": len(records),
        "review_rows_after_dedup": len(deduped),
        "duplicate_rows_removed": len(records) - len(deduped),
        "course_names": sorted({x[1] for x in course_rows}, key=str.casefold),
        "notes": [
            "Only rows 5-159, the structured course section, are imported.",
            "Teacher-only and FAQ sections are excluded because they do not map safely to course_reviews.",
            "The source has no structured rating, difficulty, teacher, or term. rating/difficulty default to 3 and can be overridden by the import command.",
            "Imported comments are anonymous source material and are attributed to the explicit --created-by user only for database ownership/audit.",
        ],
    })
    return deduped, report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output-dir", type=Path, default=Path("data/course-recommendations"))
    args = parser.parse_args()
    records, report = extract(args.source)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "course-recommendations.cleaned.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    with (args.output_dir / "course-recommendations.cleaned.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(records[0].keys()))
        writer.writeheader()
        writer.writerows(records)
    (args.output_dir / "course-recommendations.report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ["course_rows", "unique_courses", "review_rows_before_dedup", "review_rows_after_dedup", "duplicate_rows_removed", "ignored_placeholders"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
