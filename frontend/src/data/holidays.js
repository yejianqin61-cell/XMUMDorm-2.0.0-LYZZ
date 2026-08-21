export const HOLIDAYS_2027 = [
  { id: 'cny', start: '2027-02-06', end: '2027-02-08', nameZh: '春节', nameEn: 'Chinese New Year' },
  { id: 'wesak', start: '2027-05-20', end: '2027-05-20', nameZh: '卫塞节', nameEn: 'Wesak Day' },
  { id: 'malaysia-day', start: '2027-09-16', end: '2027-09-16', nameZh: '马来西亚日', nameEn: 'Malaysia Day' },
  { id: 'awal-muharram', start: '2027-06-06', end: '2027-06-07', nameZh: '回历元旦', nameEn: 'Awal Muharram' },
  { id: 'deepavali', start: '2027-10-28', end: '2027-10-28', nameZh: '屠妖节', nameEn: 'Deepavali' },
  { id: 'aidilfitri', start: '2027-03-10', end: '2027-03-11', nameZh: '开斋节', nameEn: 'Hari Raya Aidilfitri' },
  { id: 'agong-birthday', start: '2027-06-07', end: '2027-06-07', nameZh: '国家元首诞辰', nameEn: "Agong's Birthday" },
  { id: 'selangor-sultan', start: '2027-12-11', end: '2027-12-11', nameZh: '雪兰莪苏丹诞辰', nameEn: "Sultan of Selangor's Birthday" },
  { id: 'labour-day', start: '2027-05-01', end: '2027-05-01', nameZh: '劳动节', nameEn: 'Labour Day' },
  { id: 'prophet-birthday', start: '2027-08-15', end: '2027-08-16', nameZh: '穆罕默德先知诞辰', nameEn: "Prophet Muhammad's Birthday" },
  { id: 'christmas', start: '2027-12-25', end: '2027-12-25', nameZh: '圣诞节', nameEn: 'Christmas Day' },
  { id: 'hari-raya-haji', start: '2027-05-17', end: '2027-05-17', nameZh: '哈芝节', nameEn: 'Hari Raya Haji' },
  { id: 'merdeka', start: '2027-08-31', end: '2027-08-31', nameZh: '国庆日', nameEn: 'Merdeka Day' },
];

export function holidayDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function daysUntil(value, today = new Date()) {
  const start = holidayDate(value);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((start - day) / 86400000));
}

export function upcomingHolidays(today = new Date()) {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return HOLIDAYS_2027
    .filter((holiday) => holidayDate(holiday.end) >= current)
    .sort((a, b) => holidayDate(a.start) - holidayDate(b.start));
}

export function formatHolidayDate(holiday, isZh) {
  const start = holidayDate(holiday.start);
  const end = holidayDate(holiday.end);
  if (isZh) {
    const suffix = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
      ? `${start.getMonth() + 1}月${start.getDate()}日–${end.getDate()}日`
      : `${start.getMonth() + 1}月${start.getDate()}日–${end.getMonth() + 1}月${end.getDate()}日`;
    return `${start.getFullYear()}年${suffix}`;
  }
  const formatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
  return start.getTime() === end.getTime() ? formatter.format(start) : `${formatter.format(start)}–${formatter.format(end)}`;
}
