import { useNavigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { HOLIDAYS_2027, daysUntil, formatHolidayDate } from '../data/holidays';
import './Holidays.css';

export default function Holidays() {
  const navigate = useNavigate();
  const { isZh } = useLanguage();
  const today = new Date();

  return (
    <div className="holidays-page">
      <div className="holidays-page__inner">
        <button type="button" className="holidays-page__back" onClick={() => navigate('/myzone')}>
          ‹ {isZh ? '我的' : 'My Zone'}
        </button>
        <div className="holidays-page__title-row">
          <span className="holidays-page__icon" aria-hidden="true"><CalendarDays size={24} strokeWidth={1.8} /></span>
          <div>
            <h1>{isZh ? '放假日' : 'Holidays'}</h1>
            <p>{isZh ? '2027 年马来西亚公共假期' : 'Malaysia public holidays · 2027'}</p>
          </div>
        </div>
        <section className="holidays-list" aria-label={isZh ? '假日列表' : 'Holiday list'}>
          {HOLIDAYS_2027.map((holiday) => {
            const countdown = daysUntil(holiday.start, today);
            return (
              <div className="holidays-list__row" key={holiday.id}>
                <div className="holidays-list__date">{formatHolidayDate(holiday, isZh)}</div>
                <div className="holidays-list__name">
                  <strong>{isZh ? holiday.nameZh : holiday.nameEn}</strong>
                  <span>{isZh ? holiday.nameEn : holiday.nameZh}</span>
                </div>
                <div className="holidays-list__countdown">
                  <strong>{countdown}</strong>
                  <span>{isZh ? '天后' : countdown === 1 ? 'day' : 'days'}</span>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
