import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContextState';
import { useLanguage } from '../context/LanguageContextState';
import { Toast } from '../context/toast';
import { getApiErrorMessage } from '@shared/utils/apiError';
import { createTodo, toggleTodo } from '@shared/api/todos';
import { getScheduleWeek } from '@shared/api/schedule';
import { normalizeTodoDueTime } from '@shared/utils/formatTodoDue';
import {
  classesOn,
  groupTodosByDate,
  holidaysOn,
  localYmd,
  monthGrid,
  shiftMonth,
  summarizeTodos,
  teachingWeekOf,
  teachingWeeksIn,
  todoState,
} from '@shared/utils/studyCalendar';
import { useAllTodos } from '../hooks/useAllTodos';
import './StudyCalendar.css';

const MAX_CHIPS_PER_DAY = 3;

const WEEKDAYS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDayHeading(ymd, isZh) {
  const [y, m, d] = ymd.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay() || 7;
  return isZh ? `${m}月${d}日 ${WEEKDAYS_ZH[weekday - 1]}` : `${WEEKDAYS_EN[weekday - 1]}, ${MONTHS_EN[m - 1].slice(0, 3)} ${d}`;
}

function stateLabel(state, isZh) {
  const labels = {
    overdue: ['已逾期', 'Overdue'],
    today: ['今天截止', 'Due today'],
    soon: ['快到期', 'Due soon'],
    done: ['已完成', 'Done'],
  };
  const pair = labels[state];
  return pair ? (isZh ? pair[0] : pair[1]) : '';
}

export default function StudyCalendar() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { isZh } = useLanguage();
  const queryClient = useQueryClient();

  const todayYmd = localYmd();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [selected, setSelected] = useState(todayYmd);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');

  const cells = useMemo(() => monthGrid(cursor.year, cursor.monthIndex), [cursor]);
  const weeks = useMemo(() => teachingWeeksIn(cells), [cells]);

  const todosQuery = useAllTodos(isLoggedIn);
  const todos = useMemo(() => todosQuery.data || [], [todosQuery.data]);

  const scheduleQueries = useQueries({
    queries: weeks.map((week) => ({
      queryKey: ['calendar', 'schedule-week', week],
      queryFn: () => getScheduleWeek(week),
      enabled: isLoggedIn,
      staleTime: 5 * 60 * 1000,
    })),
  });
  // 以周次为键的课表数据（最多 6 周，每次渲染直接组装即可）
  const weekData = {};
  weeks.forEach((week, index) => {
    if (scheduleQueries[index]?.data) weekData[week] = scheduleQueries[index].data;
  });
  const scheduleFailed = scheduleQueries.some((q) => q.isError);

  const summary = useMemo(() => summarizeTodos(todos, todayYmd), [todos, todayYmd]);
  const todosByDate = useMemo(() => groupTodosByDate(todos), [todos]);

  const invalidateTodos = () => queryClient.invalidateQueries({ queryKey: ['todos'] });
  const toggleMutation = useMutation({
    mutationFn: toggleTodo,
    onSuccess: invalidateTodos,
    onError: (error) => Toast.error(getApiErrorMessage(error)),
  });
  const createMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      invalidateTodos();
      setNewTitle('');
      setNewTime('');
      Toast.success(isZh ? '已添加待办' : 'To-do added');
    },
    onError: (error) => Toast.error(getApiErrorMessage(error)),
  });

  const goMonth = (delta) => setCursor((current) => shiftMonth(current.year, current.monthIndex, delta));
  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), monthIndex: now.getMonth() });
    setSelected(todayYmd);
  };
  const selectDay = (cell) => {
    setSelected(cell.ymd);
    if (!cell.inMonth) {
      const [y, m] = cell.ymd.split('-').map(Number);
      setCursor({ year: y, monthIndex: m - 1 });
    }
  };

  const handleAdd = (event) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || createMutation.isPending) return;
    createMutation.mutate({ title, due_date: selected, due_time: newTime || null, list_type: 'personal', priority: 0 });
  };

  if (!isLoggedIn) {
    return (
      <div className="study-calendar">
        <div className="state-empty" style={{ paddingTop: 80 }}>{isZh ? '请先登录' : 'Please log in first'}</div>
      </div>
    );
  }

  const monthLabel = isZh ? `${cursor.year}年${cursor.monthIndex + 1}月` : `${MONTHS_EN[cursor.monthIndex]} ${cursor.year}`;
  const selectedWeek = teachingWeekOf(selected);
  const selectedHolidays = holidaysOn(selected);
  const selectedClasses = classesOn(selected, weekData);
  const selectedTodos = todosByDate.get(selected) || [];

  return (
    <div className="study-calendar">
      <div className="study-calendar__inner">
        <button type="button" className="study-calendar__back" onClick={() => navigate('/myzone')}>
          ‹ {isZh ? '我的' : 'My Zone'}
        </button>

        <div className="study-calendar__title-row">
          <span className="study-calendar__icon" aria-hidden="true"><CalendarRange size={24} strokeWidth={1.8} /></span>
          <div>
            <h1>{isZh ? '学习日历' : 'Study Calendar'}</h1>
            <p>{isZh ? '待办、课表和马来西亚公共假期在同一张月历上' : 'To-dos, classes and Malaysian public holidays on one calendar'}</p>
          </div>
        </div>

        <section className="study-calendar__summary" aria-live="polite">
          <div className="study-calendar__count">
            {todosQuery.isLoading ? (isZh ? '正在读取待办…' : 'Loading to-dos…') : summary.open ? (
              <>{isZh ? '今天还有' : 'You have'}<strong>{summary.open}</strong>{isZh ? '项待办' : summary.open === 1 ? 'open to-do' : 'open to-dos'}</>
            ) : (isZh ? '没有未完成的待办' : 'No open to-dos')}
          </div>
          <div className="study-calendar__tags">
            {summary.overdue ? <span className="study-calendar__tag study-calendar__tag--overdue">{isZh ? `${summary.overdue} 项已逾期` : `${summary.overdue} overdue`}</span> : null}
            {summary.dueToday ? <span className="study-calendar__tag study-calendar__tag--today">{isZh ? `${summary.dueToday} 项今天截止` : `${summary.dueToday} due today`}</span> : null}
            {summary.dueSoon ? <span className="study-calendar__tag study-calendar__tag--soon">{isZh ? `${summary.dueSoon} 项 3 天内截止` : `${summary.dueSoon} due in 3 days`}</span> : null}
            {summary.undated ? <span className="study-calendar__tag">{isZh ? `${summary.undated} 项无截止日期` : `${summary.undated} without date`}</span> : null}
          </div>
          <Link to="/myzone/todos" className="study-calendar__summary-link">{isZh ? '管理待办' : 'Manage to-dos'} <ChevronRight size={15} /></Link>
        </section>

        {todosQuery.isError ? <p className="study-calendar__notice">{isZh ? '待办加载失败，请刷新页面重试。' : 'Could not load to-dos. Refresh to try again.'}</p> : null}
        {scheduleFailed ? <p className="study-calendar__notice">{isZh ? '部分周的课表加载失败，日历里可能缺少课程。' : 'Some weeks of your timetable failed to load.'}</p> : null}

        <div className="study-calendar__layout">
          <section className="study-calendar__month" aria-label={monthLabel}>
            <div className="study-calendar__toolbar">
              <h2>{monthLabel}</h2>
              <div className="study-calendar__nav">
                <button type="button" onClick={() => goMonth(-1)} aria-label={isZh ? '上个月' : 'Previous month'}><ChevronLeft size={18} /></button>
                <button type="button" className="study-calendar__today-btn" onClick={goToday}>{isZh ? '今天' : 'Today'}</button>
                <button type="button" onClick={() => goMonth(1)} aria-label={isZh ? '下个月' : 'Next month'}><ChevronRight size={18} /></button>
              </div>
            </div>
            <div className="study-calendar__legend" aria-hidden="true">
              <span><i className="study-calendar__dot study-calendar__dot--todo" />{isZh ? '待办' : 'To-do'}</span>
              <span><i className="study-calendar__dot study-calendar__dot--overdue" />{isZh ? '逾期/今天' : 'Overdue/today'}</span>
              <span><i className="study-calendar__dot study-calendar__dot--holiday" />{isZh ? '假期' : 'Holiday'}</span>
              <span><i className="study-calendar__dot study-calendar__dot--class" />{isZh ? '有课' : 'Classes'}</span>
            </div>

            <div className="study-calendar__grid" role="grid" aria-label={isZh ? '月历' : 'Month'}>
              {(isZh ? WEEKDAYS_ZH : WEEKDAYS_EN).map((label) => (
                <div key={label} className="study-calendar__weekday" role="columnheader">{label}</div>
              ))}
              {cells.map((cell) => {
                const dayTodos = todosByDate.get(cell.ymd) || [];
                const dayHolidays = holidaysOn(cell.ymd);
                const dayClasses = classesOn(cell.ymd, weekData);
                const week = cell.weekday === 1 ? teachingWeekOf(cell.ymd) : null;
                const className = [
                  'study-calendar__day',
                  cell.inMonth ? '' : 'study-calendar__day--outside',
                  cell.ymd === todayYmd ? 'study-calendar__day--today' : '',
                  cell.ymd === selected ? 'study-calendar__day--selected' : '',
                  dayHolidays.length ? 'study-calendar__day--holiday' : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    key={cell.ymd}
                    type="button"
                    role="gridcell"
                    className={className}
                    aria-selected={cell.ymd === selected}
                    aria-label={`${formatDayHeading(cell.ymd, isZh)}${dayTodos.length ? (isZh ? `，${dayTodos.length} 项待办` : `, ${dayTodos.length} to-dos`) : ''}`}
                    onClick={() => selectDay(cell)}
                  >
                    <span className="study-calendar__day-head">
                      <span className="study-calendar__date">{cell.day}</span>
                      {week ? <span className="study-calendar__week">{isZh ? `第${week.week}周` : `W${week.week}`}</span> : null}
                    </span>
                    {dayHolidays.map((holiday) => (
                      <span key={holiday.id} className="study-calendar__chip study-calendar__chip--holiday">{isZh ? holiday.nameZh : holiday.nameEn}</span>
                    ))}
                    {dayClasses.length ? (
                      <span className="study-calendar__chip study-calendar__chip--class">{isZh ? `${dayClasses.length} 节课` : `${dayClasses.length} class${dayClasses.length > 1 ? 'es' : ''}`}</span>
                    ) : null}
                    {dayTodos.slice(0, MAX_CHIPS_PER_DAY).map((todo) => {
                      const state = todoState(todo, todayYmd);
                      return (
                        <span key={todo.id} className={`study-calendar__chip study-calendar__chip--todo study-calendar__chip--${state}`}>
                          {todo.title}
                        </span>
                      );
                    })}
                    {dayTodos.length > MAX_CHIPS_PER_DAY ? (
                      <span className="study-calendar__more">{isZh ? `还有 ${dayTodos.length - MAX_CHIPS_PER_DAY} 项` : `+${dayTodos.length - MAX_CHIPS_PER_DAY} more`}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="study-calendar__day-panel" aria-label={formatDayHeading(selected, isZh)}>
            <h3>{formatDayHeading(selected, isZh)}</h3>
            <p className="study-calendar__day-sub">
              {selectedWeek ? (isZh ? `第 ${selectedWeek.week} 教学周` : `Teaching week ${selectedWeek.week}`) : (isZh ? '不在教学周内' : 'Outside teaching weeks')}
            </p>

            {selectedHolidays.map((holiday) => (
              <div key={holiday.id} className="study-calendar__holiday-row">
                <strong>{isZh ? holiday.nameZh : holiday.nameEn}</strong>
                <span>{isZh ? '公共假期' : 'Public holiday'}</span>
              </div>
            ))}

            <h4>{isZh ? '课程' : 'Classes'}</h4>
            {selectedClasses.length ? (
              <ul className="study-calendar__list">
                {selectedClasses.map((course, index) => (
                  <li key={`${course.course_code}-${course.start_time}-${index}`} className="study-calendar__class">
                    <time>{String(course.start_time || '').slice(0, 5)}–{String(course.end_time || '').slice(0, 5)}</time>
                    <div>
                      <strong>{[course.course_code, course.course_name].filter(Boolean).join(' · ')}</strong>
                      {course.venue ? <span>{course.venue}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="study-calendar__empty">
                {selectedWeek ? (isZh ? '这天没有课' : 'No classes') : (isZh ? '只显示本学期教学周的课程' : 'Classes show only in teaching weeks')}
              </p>
            )}

            <h4>{isZh ? '待办' : 'To-dos'}</h4>
            {selectedTodos.length ? (
              <ul className="study-calendar__list">
                {selectedTodos.map((todo) => {
                  const state = todoState(todo, todayYmd);
                  const time = normalizeTodoDueTime(todo.due_time);
                  return (
                    <li key={todo.id} className={`study-calendar__todo study-calendar__todo--${state}`}>
                      <button
                        type="button"
                        className="study-calendar__check"
                        aria-label={todo.is_completed ? (isZh ? '标记为未完成' : 'Mark as not done') : (isZh ? '标记为完成' : 'Mark as done')}
                        aria-pressed={!!todo.is_completed}
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(todo.id)}
                      />
                      <div>
                        <strong>{todo.title}</strong>
                        <span>{[time, stateLabel(state, isZh)].filter(Boolean).join(' · ')}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="study-calendar__empty">{isZh ? '这天没有待办' : 'Nothing due'}</p>
            )}

            <form className="study-calendar__add" onSubmit={handleAdd}>
              <label htmlFor="study-calendar-title">{isZh ? '添加到这一天' : 'Add to this day'}</label>
              <input
                id="study-calendar-title"
                type="text"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder={isZh ? '要做什么？' : 'What needs doing?'}
                maxLength={500}
              />
              <div className="study-calendar__add-row">
                <input
                  id="study-calendar-time"
                  type="time"
                  value={newTime}
                  onChange={(event) => setNewTime(event.target.value)}
                  aria-label={isZh ? '截止时间（可选）' : 'Due time (optional)'}
                />
                <button type="submit" disabled={!newTitle.trim() || createMutation.isPending}>
                  {isZh ? '添加' : 'Add'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
