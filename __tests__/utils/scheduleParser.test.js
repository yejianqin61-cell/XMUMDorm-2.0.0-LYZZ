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
    expect(parsed.errors).toEqual([]);
  });

  test('parses the AC course-list format with repeated codes, multiple lecturers, and multiple meetings', () => {
    const text = [
      'No.\tCourse Code\tCourse Name (by group)\tCredit\tLecturer\tTime & Venue\tTeaching Week\tRegistration Type\tStudent No.',
      '1\tCST204\tData Structures (Lab CST) (Group 3)\t4\tLiu Xin\tWednesday 10.00am-12.00pm(A1#109)(Week 1-14)\t1-14\tNormal\t34',
      '2\tCST204\tData Structures (Lecture CST)\t4\tLiu Xin\tMonday 4.00pm-6.00pm(A3#509)(Week 1-14)\t1-14\tNormal\t100',
      '3\tBSC107\tGeneral Physics II (CST)\t4\tHuang Nay Ming\tTuesday 4.00pm-6.00pm(A4#G01)(Week 1-14)\t1-14\tNormal\t95',
      'Wednesday 5.00pm-7.00pm(A2#G07)(Week 1-14)\t1-14\tNormal\t95',
      '4\tBSC108\tGeneral Physics Laboratory (CST)\t2\tLim Lih Wei',
      'Chua Chong Lim',
      'Turgut Yilmaz',
      'Yap Seong Shan',
      'Chong Su Sin',
      'Muhamad Rasydan Bin Mokhtar',
      'Pylnev Mikhail\tTuesday 9.00am-12.00pm(A4#202-Physics Lab 6)(Week 1-14)\t1-14\tNormal\t103',
      '5\tSWE203\tHuman Computer Interaction (CST)\t3\tIli Farhana Binti Md Mahtar\tThursday 9.00am-12.00pm(A3#518)(Week 1-14)\t1-14\tNormal\t103',
      '6\tBSC125\tProbability and Statistics A (Group 2 - CST)\t4\tDedi Rosadi\tWednesday 2.00pm-4.00pm(A3#502)(Week 1-14)\t1-14\tNormal\t49',
      'Thursday 2.00pm-4.00pm(A2#G02)(Week 1-14)\t1-14\tNormal\t49',
    ].join('\n');

    const parsed = parseScheduleText(text);

    expect(parsed.stats).toEqual({ courseCount: 5, meetingCount: 8, errorCount: 0 });
    expect(parsed.errors).toEqual([]);
    expect(parsed.courses.find((course) => course.course_code === 'BSC108').lecturer).toBe(
      'Lim Lih Wei / Chua Chong Lim / Turgut Yilmaz / Yap Seong Shan / Chong Su Sin / Muhamad Rasydan Bin Mokhtar / Pylnev Mikhail'
    );
    expect(parsed.meetings.map((meeting) => [meeting.course_code, meeting.day_of_week, meeting.start_time, meeting.venue])).toEqual([
      ['CST204', 3, '10:00:00', 'A1#109'],
      ['CST204', 1, '16:00:00', 'A3#509'],
      ['BSC107', 2, '16:00:00', 'A4#G01'],
      ['BSC107', 3, '17:00:00', 'A2#G07'],
      ['BSC108', 2, '09:00:00', 'A4#202-Physics Lab 6'],
      ['SWE203', 4, '09:00:00', 'A3#518'],
      ['BSC125', 3, '14:00:00', 'A3#502'],
      ['BSC125', 4, '14:00:00', 'A2#G02'],
    ]);
  });
});
