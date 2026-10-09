/**
 * 课程选择器（自动补全 + 自注册）
 *
 * 课程身份 = 名字 + 讲师。输入时从字典补全；找不到就允许「新建」，
 * 由后端 resolve 接口自注册（上传时 autoCreate=true）。
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { School, X } from 'lucide-react';
import { listCourses, resolveCourse } from '@shared/api/materials';
import { QK } from '@shared/query/queryKeys';
import { Toast } from '../../context/toast';

export default function CoursePicker({ value, onChange, isZh = true, disabled = false }) {
  const [text, setText] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  const chosen = value && value.courseId ? value : null;

  // 输入防抖后才查询，避免每敲一个字都打接口
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const { data: courses = [] } = useQuery({
    queryKey: QK.materialsCourses(debounced),
    queryFn: () => listCourses({ q: debounced, limit: 30 }).then((r) => r.courses || []),
    enabled: !chosen && debounced.length > 0,
    staleTime: 60 * 1000,
  });

  // 点击外部关闭下拉
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const exact = useMemo(
    () => courses.find((c) => c.name === text.trim() && (c.lecturer || '') === lecturer.trim()),
    [courses, text, lecturer]
  );

  const pickExisting = (c) => {
    onChange({ courseId: c.courseId, courseName: c.name, lecturer: c.lecturer || '', courseCode: c.courseCode || '' });
    setOpen(false);
  };

  const createNew = async () => {
    const name = text.trim();
    if (!name) {
      Toast.error(isZh ? '请填写课程名' : 'Course name required');
      return;
    }
    setBusy(true);
    try {
      const res = await resolveCourse({ courseName: name, lecturer: lecturer.trim(), autoCreate: true });
      const c = res && res.course;
      if (!c) throw new Error(isZh ? '课程解析失败' : 'Failed to resolve course');
      onChange({ courseId: c.id, courseName: c.name, lecturer: c.lecturer || '', courseCode: c.course_code || '' });
      setOpen(false);
      if (res.created) Toast.success(isZh ? `已新建课程：${c.name}` : `Course created: ${c.name}`);
    } catch (e) {
      Toast.error(e?.message || (isZh ? '新建课程失败' : 'Failed'));
    } finally {
      setBusy(false);
    }
  };

  if (chosen) {
    return (
      <div className="mat-picker">
        <div className="mat-glass" style={{ padding: '10px 12px' }}>
          <div className="mat-picker-chosen">
            <School size={15} />
            <span>
              {chosen.courseName}
              {chosen.lecturer ? ` · ${chosen.lecturer}` : ''}
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className="mat-btn mat-btn--sm"
              disabled={disabled}
              onClick={() => {
                onChange({ courseId: null, courseName: '', lecturer: '', courseCode: '' });
                setText('');
              }}
            >
              <X size={13} /> {isZh ? '换一个' : 'Change'}
            </button>
          </div>
          <div className="mat-hint">
            {isZh
              ? '同一门课下的笔记/课件/试题/答案会聚合到同一个课程页。'
              : 'All materials of this course are grouped on one page.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mat-picker" ref={boxRef}>
      <div className="mat-row2">
        <input
          className="mat-input"
          placeholder={isZh ? '课程名，如：数据结构与算法' : 'Course name'}
          value={text}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
        />
        <input
          className="mat-input"
          placeholder={isZh ? '讲师（可留空）' : 'Lecturer (optional)'}
          value={lecturer}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setLecturer(e.target.value); setOpen(true); }}
        />
      </div>

      <div className="mat-hint">
        {isZh
          ? '课程身份 = 课程名 + 讲师。同名不同讲师算两门课；填不准可以先留空。'
          : 'Course identity = name + lecturer.'}
      </div>

      {open && (text.trim() || courses.length > 0) && (
        <div className="mat-picker-menu">
          {courses
            .filter((c) => !exact || c.courseId !== exact.courseId)
            .map((c) => (
              <div
                key={c.courseId}
                className="mat-picker-opt"
                onMouseDown={(e) => { e.preventDefault(); pickExisting(c); }}
              >
                <span>
                  {c.name}
                  {c.lecturer ? ` · ${c.lecturer}` : ''}
                </span>
                <span className="mat-muted">{c.materialCount ?? 0} 份</span>
              </div>
            ))}

          {text.trim() && (
            <div
              className="mat-picker-opt mat-picker-create"
              onMouseDown={(e) => { e.preventDefault(); if (!busy) createNew(); }}
            >
              {busy
                ? (isZh ? '处理中…' : 'Working…')
                : (isZh
                    ? `＋ 新建课程：${text.trim()}${lecturer.trim() ? ` · ${lecturer.trim()}` : ''}`
                    : `＋ Create course: ${text.trim()}`)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
