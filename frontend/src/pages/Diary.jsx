import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { getDiaryDay, getDiaryOverview, saveDiaryDay } from '../api/diary';
import './Schedule.css';
import './Diary.css';

function Diary() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overview, setOverview] = useState(null);
  const [currentDate, setCurrentDate] = useState(null); // YYYY-MM-DD
  const [currentLabel, setCurrentLabel] = useState('');
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryContent, setDiaryContent] = useState('');
  const [hasDiaryToday, setHasDiaryToday] = useState(false);
  const [saving, setSaving] = useState(false);

  const todayLabel = useMemo(() => overview?.today?.label ?? '', [overview]);

  const loadOverview = async (date) => {
    setLoadingOverview(true);
    try {
      const data = await getDiaryOverview(date);
      setOverview(data);
      if (!currentDate) {
        setCurrentDate(data.today.date);
        setCurrentLabel(data.today.label);
      }
    } catch (e) {
      Toast.error(e?.message || (isZh ? '获取日记概览失败' : 'Failed to load diary overview'));
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadDay = async (date) => {
    setDiaryLoading(true);
    try {
      const data = await getDiaryDay(date);
      setDiaryContent(data.content || '');
      setHasDiaryToday(!!(data.content && String(data.content).trim()));
    } catch (e) {
      Toast.error(e?.message || (isZh ? '获取日记失败' : 'Failed to load diary'));
    } finally {
      setDiaryLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentDate) return;
    loadDay(currentDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const handleSave = async () => {
    if (!currentDate) return;
    setSaving(true);
    try {
      await saveDiaryDay({ date: currentDate, content: diaryContent });
      Toast.success(isZh ? '已保存' : 'Saved');
      await loadOverview(currentDate);
      await loadDay(currentDate);
    } catch (e) {
      Toast.error(e?.message || (isZh ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const sameDayPastYears = overview?.sameDayPastYears || [];
  const recentDays = overview?.recentDays || [];

  return (
    <div className="diary-page">
      <header className="diary-header">
        <div className="diary-header-left">
          <div className="diary-header-date">
            {currentLabel || todayLabel || (isZh ? '今日' : 'Today')}
          </div>
        </div>
        <div className="diary-header-right">
          <button
            type="button"
            className="schedule-btn schedule-btn-primary"
            onClick={handleSave}
            disabled={saving || !currentDate}
          >
            {saving
              ? isZh ? '保存中…' : 'Saving…'
              : hasDiaryToday
              ? (isZh ? '编辑今日' : 'Edit today')
              : (isZh ? '记录今日' : 'Write today')}
          </button>
        </div>
      </header>

      <div className="diary-layout">
        <aside className="diary-sidebar" aria-label={isZh ? '日记日期列表' : 'Diary dates'}>
          <div className="diary-sidebar-card">
            <div className="diary-sidebar-section-title">
              {isZh ? '往年今日' : 'On this day'}
            </div>
            {loadingOverview ? (
              <p className="diary-sidebar-loading">{isZh ? '加载中…' : 'Loading…'}</p>
            ) : sameDayPastYears.length === 0 ? (
              <p className="diary-sidebar-empty">
                {isZh ? '暂无往年今日记录' : 'No past records'}
              </p>
            ) : (
              <ul className="diary-sidebar-list">
                {sameDayPastYears.map((item) => (
                  <li key={item.date}>
                    <button
                      type="button"
                      className={`diary-sidebar-item ${currentDate === item.date ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentDate(item.date);
                        setCurrentLabel(`${item.year}.${new Date(item.date).getMonth() + 1}.${new Date(item.date).getDate()}`);
                      }}
                    >
                      <span className="diary-sidebar-item-main">
                        {item.year}.{new Date(item.date).getMonth() + 1}.{new Date(item.date).getDate()}
                      </span>
                      {item.hasDiary && <span className="diary-sidebar-dot" aria-hidden />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="diary-sidebar-card diary-sidebar-card-scroll">
            <div className="diary-sidebar-section-title">
              {isZh ? '最近日记' : 'Recent days'}
            </div>
            {loadingOverview ? (
              <p className="diary-sidebar-loading">{isZh ? '加载中…' : 'Loading…'}</p>
            ) : (
              <ul className="diary-sidebar-list">
                {recentDays.map((item) => {
                  const d = new Date(item.date);
                  const label = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
                  return (
                    <li key={item.date}>
                      <button
                        type="button"
                        className={`diary-sidebar-item ${currentDate === item.date ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentDate(item.date);
                          setCurrentLabel(label);
                        }}
                      >
                        <span className="diary-sidebar-item-main">{label}</span>
                        {item.hasDiary && <span className="diary-sidebar-dot" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className="diary-main">
          <div className="diary-editor-card">
            <textarea
              className="diary-textarea"
              value={diaryContent}
              onChange={(e) => setDiaryContent(e.target.value)}
              placeholder={isZh ? '写下今天的想法、心情与故事…' : 'Write your thoughts and stories for today…'}
              disabled={diaryLoading || !currentDate}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Diary;

