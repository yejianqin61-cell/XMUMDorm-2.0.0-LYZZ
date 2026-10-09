/**
 * 上传学习资料
 *
 * 三层 details：类型 / 课程（名字+讲师）/ 课时+考试节点（+试题的来源）。
 * 提交后轮询真实状态：pending → merged / rejected，绝不「收到 200 就说成功」。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileUp, Loader, Upload } from 'lucide-react';
import { uploadMaterial, getUploadStatus, validateUploadLocally, listCourses } from '@shared/api/materials';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../../context/LanguageContextState';
import { useAuth } from '../../context/AuthContextState';
import { Toast } from '../../context/toast';
import CoursePicker from '../../components/materials/CoursePicker';
import TaxonomyFields from '../../components/materials/TaxonomyFields';
import UploadStatusTracker from '../../components/materials/UploadStatusTracker';
import { humanSize } from '@shared/utils/materialDisplay';
import {
  ALLOWED_EXT,
  BLOCKED_EXT,
  MAX_FILE_BYTES,
  MAX_TAGS,
  MAX_DESCRIPTION_LEN,
} from '@shared/constants/materials';
import './Materials.css';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40;

export default function MaterialsUpload() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn } = useAuth();
  useNavigate();
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const presetCourseId = Number(sp.get('course')) || null;

  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState({ courseId: null, courseName: '', lecturer: '', courseCode: '' });
  const [tax, setTax] = useState({ type: 'notes', lesson: '', lessonTitle: '', examNode: '', source: '' });
  const [tags, setTags] = useState('');
  const [semester, setSemester] = useState('');
  const [description, setDescription] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);

  // 从课程页跳进来时预选课程
  useEffect(() => {
    if (!presetCourseId) return;
    let alive = true;
    listCourses({ limit: 500 })
      .then((r) => {
        if (!alive) return;
        const c = (r.courses || []).find((x) => Number(x.courseId) === presetCourseId);
        if (c) {
          setCourse({ courseId: c.courseId, courseName: c.name, lecturer: c.lecturer || '', courseCode: c.courseCode || '' });
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [presetCourseId]);

  const submitting = phase !== 'idle' && phase !== 'merged' && phase !== 'rejected' && phase !== 'timeout';

  const pickFile = (f) => {
    setFile(f || null);
    if (f && !title.trim()) {
      // 用文件名（去扩展名）做默认标题，省一次输入
      setTitle(String(f.name).replace(/\.[^.]+$/, '').slice(0, 100));
    }
  };

  const tagList = useMemo(
    () => tags.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    [tags]
  );

  const poll = async (id) => {
    for (let i = 0; i < MAX_POLLS; i += 1) {
       
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
         
        const st = await getUploadStatus(id);
        if (st.status === 'merged') {
          setPhase('merged');
          setResult((prev) => ({ ...prev, ...st }));
          qc.invalidateQueries({ queryKey: ['materials'] });
          return;
        }
        if (st.status === 'rejected' || st.status === 'removed') {
          setPhase('rejected');
          setResult((prev) => ({ ...prev, ...st }));
          return;
        }
      } catch {
        /* 单次轮询失败不终止，继续试 */
      }
    }
    setPhase('timeout');
  };

  const submit = async () => {
    setErrors([]);

    const local = validateUploadLocally({
      file,
      title,
      type: tax.type,
      courseName: course.courseName,
      courseId: course.courseId,
      examNode: tax.examNode,
      source: tax.source,
      tags: tagList,
    });
    if (!agreed) {
      local.push(isZh ? '请先勾选版权声明' : 'Please accept the copyright notice');
    }
    if (local.length > 0) {
      setErrors(local);
      Toast.error(local[0]);
      return;
    }

    setPhase('uploading');
    try {
      const res = await uploadMaterial({
        file,
        title: title.trim(),
        type: tax.type,
        courseId: course.courseId || undefined,
        courseName: course.courseName || undefined,
        lecturer: course.lecturer || undefined,
        courseCode: course.courseCode || undefined,
        lesson: tax.lesson || undefined,
        lessonTitle: tax.lessonTitle || undefined,
        examNode: tax.examNode || undefined,
        source: tax.source || undefined,
        tags: tagList,
        semester: semester || undefined,
        description: description || undefined,
      });

      setResult(res);
      setPhase('submitted');
      Toast.success(isZh ? '已提交，正在等校验' : 'Submitted; awaiting checks');

      if (res.autoMergeEnabled === false) {
        Toast.error(
          isZh
            ? `自动合并未开启（${res.autoMergeReason || '仓库设置问题'}），可能需要管理员手动合并`
            : 'Auto-merge not enabled'
        );
      }

      // 后台轮询，不阻塞 UI
      poll(res.id);
    } catch (e) {
      setPhase('idle');
      const msg = e?.message || (isZh ? '上传失败' : 'Upload failed');
      setErrors([msg]);
      Toast.error(msg);
    }
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setTax({ type: 'notes', lesson: '', lessonTitle: '', examNode: '', source: '' });
    setTags('');
    setSemester('');
    setDescription('');
    setAgreed(false);
    setPhase('idle');
    setResult(null);
    setErrors([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!isLoggedIn) {
    return (
      <div className="mat-page">
        <div className="mat-wrap">
          <div className="mat-banner mat-banner--warn">
            {isZh ? '请先登录后再上传资料。' : 'Please sign in to upload.'}
          </div>
          <Link className="mat-btn" to="/materials">{isZh ? '返回资料库' : 'Back'}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mat-page">
      <div className="mat-wrap">
        <header className="mat-hero">
          <h1 className="mat-title"><Upload size={22} /> {isZh ? '上传学习资料' : 'Upload material'}</h1>
          <div className="mat-sub">
            {isZh
              ? `支持 ${ALLOWED_EXT.map((e) => `.${e}`).join(' ')}，单文件 ≤ ${MAX_FILE_BYTES / 1024 / 1024}MB。`
              : `Allowed: ${ALLOWED_EXT.join(', ')}; max ${MAX_FILE_BYTES / 1024 / 1024}MB.`}
            {' '}
            {isZh ? '为安全起见，HTML / SVG / 可执行文件一律禁止。' : 'HTML/SVG/executables are blocked.'}
          </div>
        </header>

        {/* 上传进行中 / 已完成：显示状态机 */}
        {phase !== 'idle' ? (
          <section className="mat-glass mat-section">
            <div className="mat-section-title">
              {phase === 'merged' ? <CheckCircle2 size={17} /> : phase === 'rejected' ? <AlertTriangle size={17} /> : <Loader size={17} />}
              {phase === 'merged'
                ? (isZh ? '上传完成' : 'Done')
                : phase === 'rejected'
                  ? (isZh ? '未通过校验' : 'Rejected')
                  : (isZh ? '正在处理…' : 'Processing…')}
            </div>

            <UploadStatusTracker
              status={phase}
              rejectReason={result && (result.rejectReason || result.reject_reason)}
              prUrl={result && (result.prUrl || (result.github && result.github.prUrl))}
              prNumber={result && (result.prNumber || result.pr_number)}
              isZh={isZh}
            />

            {result && result.path && (
              <div className="mat-hint" style={{ marginTop: 10 }}>
                {isZh ? '文件路径：' : 'Path: '}<code>{result.path}</code>
              </div>
            )}

            <div className="mat-toolbar" style={{ marginTop: 14 }}>
              <button type="button" className="mat-btn mat-btn--primary" onClick={reset}>
                {isZh ? '再传一份' : 'Upload another'}
              </button>
              <Link className="mat-btn" to="/materials/me">{isZh ? '我上传的' : 'My uploads'}</Link>
              {result && result.courseId ? (
                <Link className="mat-btn" to={`/materials/course/${result.courseId}`}>
                  {isZh ? '去课程页看看' : 'View course'}
                </Link>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="mat-glass mat-section">
            {errors.length > 0 && (
              <div className="mat-banner mat-banner--error" style={{ marginTop: 0, marginBottom: 14 }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}

            {/* 文件 */}
            <div className="mat-field">
              <label className="mat-label">{isZh ? '文件' : 'File'}<span className="mat-req">*</span></label>
              <div className="mat-file" onClick={() => fileRef.current && fileRef.current.click()}>
                <FileUp size={22} />
                <div className="mat-file-name">
                  {file
                    ? `${file.name}（${humanSize(file.size)}）`
                    : (isZh ? '点击选择文件' : 'Click to choose a file')}
                </div>
                <div className="mat-hint">
                  {isZh ? '中文文件名可以直接使用，不会被破坏。' : 'Chinese filenames are supported.'}
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                accept={ALLOWED_EXT.map((e) => `.${e}`).join(',')}
                onChange={(e) => pickFile(e.target.files && e.target.files[0])}
              />
            </div>

            {/* 标题 */}
            <div className="mat-field">
              <label className="mat-label">{isZh ? '标题' : 'Title'}<span className="mat-req">*</span></label>
              <input
                className="mat-input"
                style={{ width: '100%' }}
                maxLength={100}
                value={title}
                placeholder={isZh ? '如：第三课时 链表与树' : 'e.g. Lesson 3 — Linked lists'}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* 课程 */}
            <div className="mat-field">
              <label className="mat-label">{isZh ? '课程' : 'Course'}<span className="mat-req">*</span></label>
              <CoursePicker value={course} onChange={setCourse} isZh={isZh} disabled={submitting} />
            </div>

            {/* 三层 details */}
            <TaxonomyFields value={tax} onChange={setTax} isZh={isZh} disabled={submitting} />

            <div className="mat-row2">
              <div className="mat-field">
                <label className="mat-label">{isZh ? `标签（最多 ${MAX_TAGS} 个，顿号或逗号分隔）` : 'Tags'}</label>
                <input
                  className="mat-input"
                  style={{ width: '100%' }}
                  placeholder={isZh ? '如：期中, 重点' : 'e.g. midterm, key points'}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
              <div className="mat-field">
                <label className="mat-label">{isZh ? '学期（选填）' : 'Semester (optional)'}</label>
                <input
                  className="mat-input"
                  style={{ width: '100%' }}
                  placeholder="2025/09"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>

            <div className="mat-field">
              <label className="mat-label">{isZh ? '简介（选填）' : 'Description (optional)'}</label>
              <textarea
                className="mat-textarea"
                rows={3}
                maxLength={MAX_DESCRIPTION_LEN}
                value={description}
                placeholder={isZh ? '这份资料覆盖了什么内容' : 'What does this cover?'}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 版权声明 */}
            <label className="mat-field" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
              <span className="mat-hint" style={{ margin: 0 }}>
                {isZh
                  ? '我确认该资料不侵犯他人版权，且不含个人隐私信息。资料库内容通过公共 CDN 分发，一经合并即公开可访问，下架也可能有缓存残留。'
                  : 'I confirm this material does not infringe copyright and contains no personal data.'}
              </span>
            </label>

            <div className="mat-toolbar">
              <button
                type="button"
                className="mat-btn mat-btn--primary"
                disabled={submitting}
                onClick={submit}
              >
                {submitting ? <Loader size={15} /> : <Upload size={15} />}
                {submitting ? (isZh ? '提交中…' : 'Submitting…') : (isZh ? '提交' : 'Submit')}
              </button>
              <Link className="mat-btn" to="/materials">{isZh ? '取消' : 'Cancel'}</Link>
            </div>

            <div className="mat-hint" style={{ marginTop: 10 }}>
              {isZh
                ? '提交后会自动在资料库开一个 PR 并等待校验；校验通过后自动合并上线（通常十几秒）。'
                : 'A PR is opened automatically and merged once checks pass.'}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
