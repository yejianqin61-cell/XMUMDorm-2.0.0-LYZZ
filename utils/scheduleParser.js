/**
 * 课程表导入解析器（文本 → 结构化课程/上课时间）
 * - 输入通常来自选课系统复制的表格文本（含制表符 + 多行 Time & Venue）
 * - 目标：尽量宽松解析，失败时返回 errors 而不是直接崩
 */

const DAY_MAP = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
};

// 课程号兼容：G0173 / BSC130 / MPU4.1 / CST108 / AB12.3 等
const COURSE_CODE_RE = /^[A-Z]{1,6}[A-Z0-9]*\d+(?:\.\d+)?$/i;

function normalizeLines(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function isCourseStartLine(line) {
  // 常见：`1\tG0173\tNew Media ...` 或 `1  G0173  ...`
  const cols = splitColumns(String(line || ''));
  if (cols.length < 2) return false;
  // 第一列通常是 No.，第二列是课程号
  const no = String(cols[0] || '').trim();
  const code = String(cols[1] || '').trim();
  return /^\d+$/.test(no) && COURSE_CODE_RE.test(code);
}

function splitColumns(line) {
  // 优先按 tab 拆；没有 tab 则按 2+ 空格拆
  const byTab = line.split(/\t+/).map((s) => s.trim()).filter(Boolean);
  if (byTab.length >= 5) return byTab;
  return line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
}

function to24h(hour, minute, ampm) {
  let h = Number(hour);
  const m = Number(minute);
  const ap = String(ampm || '').toLowerCase();
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return { h, m };
}

function fmtTime({ h, m }) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function parseTimeRange(raw) {
  // 3.00pm-6.00pm / 9.00am-12.00pm
  const m = raw.match(/(\d{1,2})\.(\d{2})(am|pm)\s*-\s*(\d{1,2})\.(\d{2})(am|pm)/i);
  if (!m) return null;
  const start = to24h(m[1], m[2], m[3]);
  const end = to24h(m[4], m[5], m[6]);
  return { start: fmtTime(start), end: fmtTime(end) };
}

function parseMeetingLine(line) {
  // Monday 3.00pm-6.00pm(A5#G11)(Week 1-5)
  const dayMatch = line.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i);
  if (!dayMatch) return null;
  const dayKey = dayMatch[1].toLowerCase();
  const day = DAY_MAP[dayKey];
  const time = parseTimeRange(line);
  if (!time) return null;

  const venueMatch = line.match(/\(([^()#]+#?[^()]*)\)\s*\(Week/i); // 宽松抓第一个 (...) 作为 venue
  const venue = venueMatch ? venueMatch[1].trim() : null;

  const weekMatch = line.match(/\(Week\s*(\d+)\s*-\s*(\d+)\s*\)/i);
  const week_start = weekMatch ? Number(weekMatch[1]) : null;
  const week_end = weekMatch ? Number(weekMatch[2]) : null;

  return {
    day_of_week: day,
    start_time: time.start,
    end_time: time.end,
    venue,
    week_start,
    week_end,
    raw_line: line
  };
}

function extractMeetingSegments(line) {
  // 有些文本把第一条上课时间放在课程首行的某列中（不在行首）。
  // 这里从任意位置提取形如 "Monday ... (Week x-y)" 的片段，并拆分出多个天的片段。
  const re = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi;
  const matches = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    matches.push({ idx: m.index, day: m[1] });
  }
  if (matches.length === 0) return [];
  const segs = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : line.length;
    const seg = line.slice(start, end).trim();
    if (seg) segs.push(seg);
  }
  return segs;
}

function parseCourseBlock(blockLines) {
  const errors = [];
  const first = blockLines[0] || '';
  const cols = splitColumns(first);

  // 期待列：No, Course Code, Course Name, Credit, Lecturer, Time & Venue, Teaching Week, ...
  // 现实中 Time & Venue 往往会在后续多行出现，所以这里只取前 5 列兜底
  const no = cols[0];
  const code = cols[1];
  const name = cols[2];
  const credit = cols[3] != null ? Number(cols[3]) : null;
  const lecturer = cols[4] || null;

  if (!code || !COURSE_CODE_RE.test(code)) errors.push(`课程号解析失败：${first}`);
  if (!name) errors.push(`课程名解析失败：${first}`);

  const meetings = [];
  // 有些粘贴会把第一条上课时间放在首行的 Time&Venue 列中（与其他行并存），因此首行也要尝试解析
  for (const seg of extractMeetingSegments(first)) {
    const mt = parseMeetingLine(seg);
    if (mt) meetings.push(mt);
  }
  for (const line of blockLines.slice(1)) {
    const mt = parseMeetingLine(line);
    if (mt) meetings.push(mt);
  }
  if (meetings.length === 0) {
    errors.push(`未解析到上课时间（Course Code=${code || 'unknown'}）`);
  }

  return {
    course: {
      no: no != null ? String(no).trim() : null,
      course_code: code ? String(code).trim() : null,
      course_name: name ? String(name).trim() : null,
      credit: Number.isFinite(credit) ? credit : null,
      lecturer: lecturer ? String(lecturer).trim() : null,
      raw_block: blockLines.join('\n')
    },
    meetings,
    errors
  };
}

function parseScheduleText(text) {
  const lines = normalizeLines(text);
  const errors = [];
  const blocks = [];

  // 跳过表头行（包含 Course Code 之类）
  const filtered = lines.filter((l) => !/Course Code|Course Name|Teaching Week|Time & Venue/i.test(l));

  let cur = [];
  for (const line of filtered) {
    if (isCourseStartLine(line)) {
      if (cur.length > 0) blocks.push(cur);
      cur = [line];
    } else {
      if (cur.length === 0) {
        // 未命中课程开头但有内容，忽略并记录（避免解析器崩）
        errors.push(`无法归属的行已忽略：${line}`);
        continue;
      }
      cur.push(line);
    }
  }
  if (cur.length > 0) blocks.push(cur);

  const courses = [];
  const meetings = [];
  let errorCount = errors.length;

  for (const block of blocks) {
    const parsed = parseCourseBlock(block);
    courses.push(parsed.course);
    for (const m of parsed.meetings) meetings.push({ course_code: parsed.course.course_code, ...m });
    for (const e of parsed.errors) errors.push(e);
    errorCount += parsed.errors.length;
  }

  return {
    courses,
    meetings,
    errors,
    stats: {
      courseCount: courses.length,
      meetingCount: meetings.length,
      errorCount: errors.length
    }
  };
}

module.exports = {
  parseScheduleText
};

