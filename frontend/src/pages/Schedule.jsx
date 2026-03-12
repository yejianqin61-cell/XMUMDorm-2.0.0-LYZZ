import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../context/ToastContext';
import { commitScheduleImport, getScheduleWeek, previewScheduleImport } from '../api/schedule';
import './Schedule.css';

const DAY_LABEL_ZH = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' };
const DAY_LABEL_EN = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

function Schedule() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [tab, setTab] = useState('view'); // 'view' | 'import'

  const FIXED_WEEK = 1;
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [weekData, setWeekData] = useState(null);

  const [text, setText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);

  const dayLabel = useMemo(() => (isZh ? DAY_LABEL_ZH : DAY_LABEL_EN), [isZh]);

  const loadWeek = async (w) => {
    setLoadingWeek(true);
    try {
      const data = await getScheduleWeek(w);
      setWeekData(data);
    } catch (e) {
      Toast.error(e?.message || (isZh ? '获取课表失败' : 'Failed to load schedule'));
    } finally {
      setLoadingWeek(false);
    }
  };

  useEffect(() => {
    loadWeek(FIXED_WEEK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreview = async () => {
    if (!text || text.trim().length < 10) {
      Toast.error(isZh ? '请先粘贴课程表文本' : 'Paste timetable text first');
      return;
    }
    setPreviewing(true);
    try {
      const data = await previewScheduleImport(text);
      setPreview(data);
      Toast.success(isZh ? '解析完成' : 'Parsed');
    } catch (e) {
      Toast.error(e?.message || (isZh ? '解析失败' : 'Parse failed'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!text || text.trim().length < 10) {
      Toast.error(isZh ? '请先粘贴课程表文本' : 'Paste timetable text first');
      return;
    }
    setPreviewing(true);
    try {
      await commitScheduleImport(text);
      Toast.success(isZh ? '导入成功' : 'Imported');
      setTab('view');
      setPreview(null);
      await loadWeek(FIXED_WEEK);
    } catch (e) {
      Toast.error(e?.message || (isZh ? '导入失败' : 'Import failed'));
    } finally {
      setPreviewing(false);
    }
  };

  const renderWeek = () => {
    const days = weekData?.days || {};
    return (
      <div className="schedule-week">
        <div className="schedule-week-toolbar">
          <div className="schedule-week-fixed">
            {isZh ? '固定课表（仅在重新导入后更新）' : 'Fixed schedule (updates only after re-import)'}
          </div>
          <button
            type="button"
            className="schedule-btn schedule-btn-primary"
            onClick={() => loadWeek(FIXED_WEEK)}
            disabled={loadingWeek}
          >
            {loadingWeek ? (isZh ? '加载中…' : 'Loading…') : (isZh ? '刷新' : 'Refresh')}
          </button>
        </div>

        <div className="schedule-days">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const list = Array.isArray(days[d]) ? days[d] : [];
            return (
              <section key={d} className="schedule-day">
                <h2 className="schedule-day-title">{dayLabel[d]}</h2>
                {list.length === 0 ? (
                  <div className="schedule-empty">{isZh ? '无课程' : 'No classes'}</div>
                ) : (
                  <ul className="schedule-class-list">
                    {list.map((c, idx) => (
                      <li key={`${c.course_code}-${c.start_time}-${idx}`} className="schedule-class">
                        <div className="schedule-class-main">
                          <div className="schedule-class-name">{c.course_name}</div>
                          <div className="schedule-class-meta">
                            <span className="schedule-class-time">
                              {String(c.start_time).slice(0, 5)}-{String(c.end_time).slice(0, 5)}
                            </span>
                            {c.venue ? <span className="schedule-class-venue">{c.venue}</span> : null}
                          </div>
                        </div>
                        <div className="schedule-class-code">{c.course_code}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  };

  const renderImport = () => {
    const stats = preview?.stats;
    const errors = Array.isArray(preview?.errors) ? preview.errors : [];
    return (
      <div className="schedule-import">
        <div className="schedule-import-card">
          <div className="schedule-import-title">{isZh ? '粘贴课程表文本' : 'Paste timetable text'}</div>
          <div className="schedule-import-guide">
            <div className="schedule-import-guide-title">{isZh ? '使用方法' : 'How to use'}</div>
            <ol className="schedule-import-guide-list">
              <li>{isZh ? '进入学校 AC 系统' : 'Open the university AC system'}</li>
              <li>{isZh ? '进入 Course List' : 'Go to Course List'}</li>
              <li>
                {isZh
                  ? '从表格左上角复制到右下角的所有文字'
                  : 'Select and copy all text from the top-left to the bottom-right of the table'}
              </li>
              <li>{isZh ? '粘贴至导入框' : 'Paste into the import box'}</li>
              <li>{isZh ? '点击导入' : 'Click Import'}</li>
            </ol>
          </div>
          <textarea
            className="schedule-import-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isZh ? '把选课系统复制出来的课程表整段粘贴到这里…' : 'Paste the copied timetable text here…'}
          />
          <div className="schedule-import-actions">
            <button
              type="button"
              className="schedule-btn schedule-btn-secondary"
              onClick={handlePreview}
              disabled={previewing}
            >
              {previewing ? (isZh ? '处理中…' : 'Working…') : (isZh ? '解析预览' : 'Preview')}
            </button>
            <button
              type="button"
              className="schedule-btn schedule-btn-primary"
              onClick={handleCommit}
              disabled={previewing}
            >
              {isZh ? '确认导入' : 'Import'}
            </button>
          </div>
        </div>

        {preview && (
          <div className="schedule-preview-card">
            <div className="schedule-preview-title">
              {isZh ? '解析结果' : 'Parsed result'}
              {stats ? (
                <span className="schedule-preview-stats">
                  {isZh ? `（${stats.courseCount} 门课 / ${stats.meetingCount} 条时间）` : ` (${stats.courseCount} courses / ${stats.meetingCount} meetings)`}
                </span>
              ) : null}
            </div>
            {errors.length > 0 && (
              <div className="schedule-preview-errors">
                <div className="schedule-preview-errors-title">{isZh ? '提示/错误' : 'Warnings/Errors'}</div>
                <ul className="schedule-preview-errors-list">
                  {errors.slice(0, 10).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {errors.length > 10 ? (
                  <div className="schedule-preview-more">{isZh ? `还有 ${errors.length - 10} 条…` : `${errors.length - 10} more…`}</div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="schedule-page">
      <div className="schedule-tabs" role="tablist" aria-label={isZh ? '课程表' : 'Schedule'}>
        <button
          type="button"
          className={`schedule-tab ${tab === 'view' ? 'active' : ''}`}
          onClick={() => setTab('view')}
        >
          {isZh ? '课表' : 'Schedule'}
        </button>
        <button
          type="button"
          className={`schedule-tab ${tab === 'import' ? 'active' : ''}`}
          onClick={() => setTab('import')}
        >
          {isZh ? '导入' : 'Import'}
        </button>
      </div>

      {tab === 'view' ? renderWeek() : renderImport()}
    </div>
  );
}

export default Schedule;

