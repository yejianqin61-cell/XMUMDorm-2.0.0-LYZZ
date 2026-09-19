const { parseScheduleText } = require('../../utils/scheduleParser');

describe('parseScheduleText', () => {
  test('merges repeated course blocks and keeps every meeting', () => {
    const text = [
      '1\tCST204\tAlgorithms\t3\tTeacher A\tMonday 9.00am-11.00am(A1)(Week 1-14)',
      '2\tCST204\tAlgorithms\t3\tTeacher A\tWednesday 2.00pm-4.00pm(A2)(Week 1-14)',
    ].join('\n');

    const parsed = parseScheduleText(text);

    expect(parsed.courses).toHaveLength(1);
    expect(parsed.courses[0].course_code).toBe('CST204');
    expect(parsed.meetings).toHaveLength(2);
    expect(parsed.meetings.map((meeting) => meeting.course_code)).toEqual(['CST204', 'CST204']);
    expect(parsed.errors).toContain('重复课程号已合并：CST204');
  });
});
