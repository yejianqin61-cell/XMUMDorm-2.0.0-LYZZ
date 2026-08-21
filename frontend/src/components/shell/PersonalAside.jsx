import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CheckSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LevelProgressBar from '../LevelProgressBar';
import { getScheduleWeek } from '@shared/api/schedule';
import { getTodos } from '@shared/api/todos';

function getTodayCourses(data) {
  const day = new Date().getDay() || 7;
  const courses = data?.days?.[day];
  return Array.isArray(courses) ? [...courses].sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || ''))) : [];
}

export default function PersonalAside() {
  const { isLoggedIn, user } = useAuth();
  const { isZh } = useLanguage();
  const scheduleQuery = useQuery({
    queryKey: ['aside', 'schedule-week'],
    queryFn: () => getScheduleWeek(1),
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });
  const todosQuery = useQuery({
    queryKey: ['aside', 'todos'],
    queryFn: () => getTodos({ status: 'active', pageSize: 20 }),
    enabled: isLoggedIn,
    staleTime: 30 * 1000,
  });
  const courses = useMemo(() => getTodayCourses(scheduleQuery.data), [scheduleQuery.data]);
  const rawTodos = todosQuery.data?.data?.list || todosQuery.data?.list || todosQuery.data?.data || [];
  const todos = Array.isArray(rawTodos) ? rawTodos.slice(0, 2) : [];

  return (
    <div className="personal-aside">
      <section className="personal-aside__section personal-aside__section--schedule">
        <Link to="/myzone/schedule" className="personal-aside__heading">
          <span><CalendarDays size={20} strokeWidth={1.8} />{isZh ? '今日课程' : 'Today'}</span><ChevronRight size={18} />
        </Link>
        {isLoggedIn && courses.length ? courses.slice(0, 2).map((course) => (
          <Link key={course.id || `${course.name}-${course.start_time}`} to="/myzone/schedule" className="personal-aside__row">
            <strong>{course.name || course.course_name || (isZh ? '课程' : 'Course')}</strong>
            <span>{course.start_time}{course.end_time ? ` - ${course.end_time}` : ''}</span>
          </Link>
        )) : <p className="personal-aside__empty">{isZh ? '今天没有课程' : 'No classes today'}</p>}
      </section>

      <section className="personal-aside__section personal-aside__section--todos">
        <Link to="/myzone/todos" className="personal-aside__heading">
          <span><CheckSquare size={20} strokeWidth={1.8} />{isZh ? '待办' : 'To-do'}</span><ChevronRight size={18} />
        </Link>
        {isLoggedIn && todos.length ? todos.map((todo) => (
          <Link key={todo.id} to="/myzone/todos" className="personal-aside__row personal-aside__row--todo">
            <strong>{todo.title}</strong>
          </Link>
        )) : <p className="personal-aside__empty">{isZh ? '没有待办事项' : 'No to-dos'}</p>}
      </section>

      <section className="personal-aside__section personal-aside__section--level">
        <Link to="/myzone" className="personal-aside__heading">
          <span>{isZh ? '成长' : 'Growth'}</span><ChevronRight size={15} />
        </Link>
        {isLoggedIn ? <LevelProgressBar level={user?.level} levelProgress={user?.levelProgress} isZh={isZh} /> : <p className="personal-aside__empty">{isZh ? '登录后查看成长进度' : 'Log in to view progress'}</p>}
      </section>
    </div>
  );
}
