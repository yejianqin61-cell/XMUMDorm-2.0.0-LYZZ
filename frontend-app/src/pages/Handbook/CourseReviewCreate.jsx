import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../context/ToastContext';
import { createCourseReview, getCourseReviewDetail, updateCourseReview } from '@shared/api/handbook';
import { useQueryClient } from '@tanstack/react-query';
import './Handbook.css';

function CourseReviewCreate() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const editId = params?.id ? Number(params.id) : 0;
  const isEdit = Number.isFinite(editId) && editId > 0;

  const nowYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const ys = [];
    for (let y = 2016; y <= nowYear; y += 1) ys.push(y);
    return ys;
  }, [nowYear]);
  const monthOptions = useMemo(() => ['02', '04', '09'], []);

  const [courseName, setCourseName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [tags, setTags] = useState(['required']);
  const [comment, setComment] = useState('');
  const [termYear, setTermYear] = useState(nowYear);
  const [termMonth, setTermMonth] = useState('09');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    if (!isLoggedIn) return;
    let cancelled = false;
    setInitLoading(true);
    getCourseReviewDetail(editId)
      .then((d) => {
        if (cancelled) return;
        if (!d?.viewer?.canEdit) {
          Toast.error(isZh ? '无权限编辑' : 'No permission');
          navigate(`/about/freshman-guide/course-review/${editId}`, { replace: true });
          return;
        }
        setCourseName(d?.courseName || '');
        setTeacher(d?.teacher || '');
        setTags(Array.isArray(d?.tags) && d.tags.length > 0 ? d.tags : ['required']);
        setComment(d?.comment || '');
        if (d?.term_year) setTermYear(Number(d.term_year));
        if (d?.term_month) setTermMonth(String(d.term_month));
      })
      .catch((e) => {
        Toast.error(e?.message || (isZh ? '加载失败' : 'Failed'));
      })
      .finally(() => {
        if (!cancelled) setInitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, isEdit, isLoggedIn, isZh, navigate]);

  const canSubmit = useMemo(() => {
    if (!isLoggedIn) return false;
    if (!courseName.trim()) return false;
    if (!teacher.trim()) return false;
    if (!Number.isFinite(Number(termYear)) || Number(termYear) < 2016 || Number(termYear) > nowYear) return false;
    if (!['02', '04', '09'].includes(String(termMonth))) return false;
    if (!Array.isArray(tags) || tags.length === 0) return false;
    if (!comment.trim()) return false;
    return true;
  }, [comment, courseName, isLoggedIn, nowYear, tags, teacher, termMonth, termYear]);

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回手册' : '← Back'}
        </Link>
      </div>

      <div className="handbook-editor">
        <div className="handbook-editor-title">{isEdit ? (isZh ? '编辑课程评价' : 'Edit course review') : (isZh ? '新建课程评价' : 'New course review')}</div>

        {!isLoggedIn ? (
          <div className="handbook-empty">
            <div className="handbook-empty-title">{isZh ? '需要登录' : 'Login required'}</div>
            <div className="handbook-empty-sub">{isZh ? '登录后才可以发布/编辑课程评价。' : 'Please login.'}</div>
          </div>
        ) : (
          <>
            {isEdit && initLoading ? <div className="handbook-loading">{isZh ? '加载中…' : 'Loading…'}</div> : null}
            <div className="handbook-editor-row">
              <label className="handbook-editor-label">{isZh ? '课程名' : 'Course name'}</label>
              <input
                className="handbook-editor-input"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                maxLength={180}
                placeholder={isZh ? '例如：Calculus I' : 'e.g. Calculus I'}
              />
            </div>

            <div className="handbook-editor-row">
              <label className="handbook-editor-label">{isZh ? '老师姓名' : 'Teacher'}</label>
              <input
                className="handbook-editor-input"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                maxLength={120}
                placeholder={isZh ? '例如：陈老师' : 'e.g. Dr. Tan'}
              />
            </div>

            <div className="handbook-editor-row">
              <label className="handbook-editor-label">{isZh ? '学期' : 'Term'}</label>
              <div className="handbook-editor-grid">
                <select className="handbook-editor-select" value={termYear} onChange={(e) => setTermYear(Number(e.target.value))}>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select className="handbook-editor-select" value={termMonth} onChange={(e) => setTermMonth(String(e.target.value))}>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="handbook-mini-sub-inline" style={{ marginTop: 6 }}>
                {isZh ? '显示格式：' : 'Format: '} {String(termYear).slice(-2)}/{String(termMonth)}
              </div>
            </div>

            <div className="handbook-editor-row">
              <label className="handbook-editor-label">{isZh ? '标签' : 'Tag'}</label>
              <div className="handbook-filter-row" style={{ marginTop: 0 }}>
                {['MPU', 'GE', 'ME', 'required', 'final', 'no final'].map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`handbook-filter-chip ${on ? 'is-on' : ''}`}
                      onClick={() => {
                        setTags((prev) => {
                          const cur = Array.isArray(prev) ? prev : [];
                          if (cur.includes(t)) return cur.filter((x) => x !== t);
                          return [...cur, t];
                        });
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="handbook-editor-row">
              <label className="handbook-editor-label">{isZh ? '评价' : 'Review'}</label>
              <textarea
                className="handbook-editor-textarea"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={7}
                maxLength={3000}
                placeholder={isZh ? '写下你的真实体验、亮点/雷点、建议…' : 'Write your honest experience...'}
              />
            </div>

            <div className="handbook-editor-actions">
              <button
                type="button"
                className="handbook-btn handbook-btn--primary"
                disabled={!canSubmit || loading}
                onClick={async () => {
                  if (!canSubmit) return;
                  setLoading(true);
                  try {
                    if (isEdit) {
                      await updateCourseReview(editId, {
                        courseName: courseName.trim(),
                        teacher: teacher.trim(),
                        termYear,
                        termMonth,
                        tags,
                        comment: comment.trim(),
                      });
                      await queryClient.invalidateQueries({ queryKey: ['handbook', 'courseReview', editId] });
                      Toast.success(isZh ? '已保存' : 'Saved');
                      navigate(`/about/freshman-guide/course-review/${editId}`, { replace: true });
                    } else {
                      await createCourseReview({
                        courseName: courseName.trim(),
                        teacher: teacher.trim(),
                        termYear,
                        termMonth,
                        tags,
                        comment: comment.trim(),
                      });
                      await queryClient.invalidateQueries({ queryKey: ['handbook', 'courseReviews'] });
                      await queryClient.invalidateQueries({ queryKey: ['handbook', 'me', 'courseReviews'] });
                      Toast.success(isZh ? '已发布' : 'Published');
                      navigate('/about/freshman-guide/course-review', { replace: true });
                    }
                    await queryClient.invalidateQueries({ queryKey: ['handbook', 'courseReviews'] });
                    await queryClient.invalidateQueries({ queryKey: ['handbook', 'me', 'courseReviews'] });
                  } catch (e) {
                    Toast.error(e?.message || (isZh ? '操作失败' : 'Failed'));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? (isZh ? '处理中…' : 'Working…') : (isEdit ? (isZh ? '保存' : 'Save') : (isZh ? '发布' : 'Publish'))}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CourseReviewCreate;

