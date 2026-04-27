import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../context/ToastContext';
import { createCourseReview } from '../../api/handbook';
import { useQueryClient } from '@tanstack/react-query';
import './Handbook.css';

function CourseReviewCreate() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [courseName, setCourseName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [tags, setTags] = useState(['required']);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!isLoggedIn) return false;
    if (!courseName.trim()) return false;
    if (!teacher.trim()) return false;
    if (!Array.isArray(tags) || tags.length === 0) return false;
    if (!comment.trim()) return false;
    if (!Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return false;
    return true;
  }, [comment, courseName, isLoggedIn, rating, tags, teacher]);

  return (
    <div className="handbook-page">
      <div className="handbook-detail-top">
        <Link to="/about/freshman-guide" className="handbook-back">
          {isZh ? '← 返回手册' : '← Back'}
        </Link>
      </div>

      <div className="handbook-editor">
        <div className="handbook-editor-title">{isZh ? '新建课程评价' : 'New course review'}</div>

        {!isLoggedIn ? (
          <div className="handbook-empty">
            <div className="handbook-empty-title">{isZh ? '需要登录' : 'Login required'}</div>
            <div className="handbook-empty-sub">{isZh ? '登录后才可以发布课程评价。' : 'Please login to publish.'}</div>
          </div>
        ) : (
          <>
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
              <label className="handbook-editor-label">{isZh ? '评分（1-5）' : 'Rating (1-5)'}</label>
              <select className="handbook-editor-select" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
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
                    const out = await createCourseReview({
                      courseName: courseName.trim(),
                      teacher: teacher.trim(),
                      tags,
                      rating,
                      comment: comment.trim(),
                    });
                    await queryClient.invalidateQueries({ queryKey: ['handbook', 'courseReviews'] });
                    await queryClient.invalidateQueries({ queryKey: ['handbook', 'me', 'courseReviews'] });
                    Toast.success(isZh ? '已发布' : 'Published');
                    navigate('/about/freshman-guide/course-review', { replace: true });
                  } catch (e) {
                    Toast.error(e?.message || (isZh ? '发布失败' : 'Failed'));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? (isZh ? '发布中…' : 'Publishing…') : (isZh ? '发布' : 'Publish')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CourseReviewCreate;

