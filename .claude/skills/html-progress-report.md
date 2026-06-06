---
name: html-progress-report
description: Generate HTML progress bulletins (开发公报) summarizing development progress across all modules, with statistics, charts, and visual summaries.
---

# HTML Progress Report

## Purpose
Generate professional HTML progress reports (开发公报) that summarize the current state of development across all modules. These serve as stakeholder-facing progress snapshots.

## When to Use
- End of a development phase/sprint
- Before a release
- User asks "generate progress report" or "开发公报"
- Monthly/quarterly project review

## Workflow Stage
`07-Implementation` (records phase)

## Inputs
- `docs/07-Implement/` — Recent implementation records
- `docs/08-Test/全项目测试报告_V3.0.md` — Latest test report
- `docs/06-Analyze/全项目模块开发评估_V3.0.md` — Module evaluation
- Git log — Recent commits

## Outputs
- `docs/07-Implement/开发公报/开发公报_V<version>.html` — HTML report
- `docs/07-Implement/开发公报/开发公报_V<version>.pdf` — PDF export (via scripts/html2pdf.js)

## Report Sections

1. **Header** — Project name, version, date range
2. **Executive Summary** — Key achievements, key metrics
3. **Module Progress** — Per-module completion %, changes
4. **Test Results** — Test count, pass rate, coverage
5. **Code Statistics** — Lines added/removed, commits
6. **Issues & Risks** — Open defects, blockers
7. **Next Steps** — Upcoming priorities

## Design
- Clean, professional layout
- Project branding (Dorm / 厦马小筑)
- Responsive design
- Print-friendly
- Charts: progress bars, completion rings
- Color coding: green (done), yellow (in progress), red (blocked)

## Generation
Use the existing `scripts/html2pdf.js` for PDF export from HTML.
