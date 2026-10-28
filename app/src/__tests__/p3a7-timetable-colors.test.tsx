/**
 * P3A7 · 课表课程色与卡片内容
 *
 * 依据：`docs/app/task/课表重做/T2-课程色板与网格重排.md`
 *   · 同课跨周同色，允许不同课程同色；· 卡片同时显示课程名与地点；· 只显示周一–周五。
 */
import * as React from 'react';

import { renderApp } from './helpers/renderApp';
import { TimetableGrid } from '@/proto/P11';
import {
  COURSE_ACCENTS,
  courseAccentMap,
  courseKey,
} from '@/features/tools/timetableView';
import { normalizeTimetableWeek } from '@/features/tools/timetable';

const meeting = (overrides: Record<string, unknown> = {}) => ({
  course_code: 'CS101',
  course_name: 'Algorithms',
  credit: 3,
  lecturer: 'Lim',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '10:00',
  venue: 'B1#201',
  ...overrides,
});

function week(days: Record<string, unknown[]>) {
  return normalizeTimetableWeek({ week: 3, currentWeek: 3, totalWeeks: 20, days })!;
}

describe('P3A7 课表课程色与卡片', () => {
  it('同一课程的所有时段同色（与时间/地点无关）', () => {
    const parsed = week({
      1: [meeting()],
      3: [meeting({ day_of_week: 3, start_time: '14:00', end_time: '16:00', venue: 'C2#105' })],
    });
    const map = courseAccentMap(parsed);
    expect(COURSE_ACCENTS).toContain(map.get('CS101'));
    // 同一身份键（去空白）在不同周次里也指向同一位置
    expect(courseKey({ ...parsed.days[1][0], courseCode: '  CS101  ' })).toBe('CS101');
  });

  it('课程集合变化时，同一课程跨周仍使用相同颜色', () => {
    const first = courseAccentMap(week({ 1: [meeting({ course_code: 'CS101' })] }));
    const next = courseAccentMap(week({ 1: [meeting({ course_code: 'A001' }), meeting({ course_code: 'CS101' })] }));
    expect(next.get('CS101')).toEqual(first.get('CS101'));
  });

  it('不同课程允许共用颜色，但每个颜色均来自课程色板', () => {
    const codes = ['A001', 'B002', 'C003', 'D004', 'E005', 'F006', 'G007'];
    const values = [...courseAccentMap(week({ 1: codes.map((code) => meeting({ course_code: code })) })).values()];
    expect(values).toHaveLength(7);
    values.forEach((accent) => expect(COURSE_ACCENTS).toContain(accent));
    expect(new Set(values.map((accent) => accent.fill)).size).toBeLessThan(7);
  });

  it('卡片同时显示课程名称与上课地点', async () => {
    const parsed = week({
      1: [meeting()],
      3: [meeting({ course_code: 'BSC130', course_name: '数据结构', venue: 'A5#G11', day_of_week: 3 })],
    });
    const view = await renderApp(<TimetableGrid testID="grid" week={parsed} />);
    expect(view.getByText('Algorithms')).toBeTruthy();
    expect(view.getByText('B1#201')).toBeTruthy();
    expect(view.getByText('数据结构')).toBeTruthy();
    expect(view.getByText('A5#G11')).toBeTruthy();
  });

  it('两门课卡片底色不同，且都来自课程色板', async () => {
    const parsed = week({
      1: [meeting({ course_code: 'A001' }), meeting({ course_code: 'B002', start_time: '11:00' })],
    });
    const accents = courseAccentMap(parsed);
    const view = await renderApp(
      <TimetableGrid
        testID="grid"
        week={parsed}
        getCourseAccent={(item) => accents.get(courseKey(item)) ?? COURSE_ACCENTS[0]}
      />
    );
    const first = view.getByTestId('grid-card-A001').props.style;
    const second = view.getByTestId('grid-card-B002').props.style;
    const background = (style: unknown): { backgroundColor?: unknown } =>
      (Array.isArray(style) ? Object.assign({}, ...style.flat()) : style) as { backgroundColor?: unknown };
    expect(background(first).backgroundColor).not.toEqual(background(second).backgroundColor);
  });

  it('只显示周一–周五（不出现周六/周日列头）', async () => {
    const parsed = week({ 1: [meeting()] });
    const view = await renderApp(<TimetableGrid testID="grid" week={parsed} />);
    expect(view.getByTestId('grid-head-1')).toBeTruthy();
    expect(view.queryByTestId('grid-head-6')).toBeNull();
    expect(view.queryByTestId('grid-head-7')).toBeNull();
  });

  it('地点缺失时显示"地点待定"而不是空', async () => {
    const parsed = week({ 1: [meeting({ venue: null })] });
    const view = await renderApp(<TimetableGrid testID="grid" week={parsed} />);
    expect(view.getByText('地点待定')).toBeTruthy();
  });
});
