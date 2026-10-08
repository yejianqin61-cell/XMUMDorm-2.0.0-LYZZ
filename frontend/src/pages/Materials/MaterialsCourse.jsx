/**
 * 课程页 —— 该课程下的全部资料
 *
 * 设计：以课程为聚合单位，四类 tab（笔记/课件/试题/答案）+「其他」+「全部」，
 * 再用考试节点 / 课时做二次筛选。
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GraduationCap, Upload } from 'lucide-react';
import { listCourses, listMaterials } from '@shared/api/materials';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../../context/LanguageContextState';
import MaterialCard from '../../components/materials/MaterialCard';
import { TYPES, TYPE_META, EXAM_NODES, EXAM_NODE_META } from '@shared/constants/materials';
import './Materials.css';

const PAGE_SIZE = 20;

export default function MaterialsCourse() {
  const { id } = useParams();
  const courseId = Number(id);
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const [type, setType] = useState('');
  const [examNode, setExamNode] = useState('');
  const [lesson, setLesson] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({
      course: courseId,
      type: type || undefined,
      examNode: examNode || undefined,
      lesson: lesson || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [courseId, type, examNode, lesson, sort, page]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: QK.materialsList(params),
    queryFn: () => listMaterials(params),
    staleTime: 60 * 1000,
    enabled: Number.isInteger(courseId) && courseId > 0,
  });

  // 课程标题：优先用资料条目自带的名字，没有资料时回落到字典
  const { data: courseDict } = useQuery({
    queryKey: QK.materialsCourses('__byid__'),
    queryFn: () => listCourses({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });

  const items = (data && data.items) || [];
  const total = (data && data.total) || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fromDict = ((courseDict && courseDict.courses) || []).find((c) => Number(c.courseId) === courseId);
  const courseName = (items[0] && items[0].courseName) || (fromDict && fromDict.name) || `课程 ${courseId}`;
  const lecturer = (items[0] && items[0].lecturer) || (fromDict && fromDict.lecturer) || '';

  const resetPage = (fn) => { fn(); setPage(1); };

  return (
    <div className="mat-page">
      <div className="mat-wrap">
        <header className="mat-hero">
          <div className="mat-hero-row">
            <div style={{ minWidth: 0 }}>
              <Link className="mat-btn mat-btn--sm" to="/materials">
                <ArrowLeft size={14} /> {isZh ? '全部课程' : 'All courses'}
              </Link>
              <h1 className="mat-title" style={{ marginTop: 10 }}>
                <GraduationCap size={22} /> {courseName}
              </h1>
              <div className="mat-sub">
                {lecturer ? `${lecturer} · ` : ''}
                {isZh ? `共 ${total} 份资料` : `${total} files`}
                {fromDict && Number(fromDict.courseId) === 1
                  ? (isZh ? '（通用资料，不属于具体课程）' : ' (general)')
                  : ''}
              </div>
            </div>
            <div className="mat-toolbar" style={{ marginTop: 0 }}>
              <Link className="mat-btn mat-btn--primary" to={`/materials/upload?course=${courseId}`}>
                <Upload size={15} /> {isZh ? '传这门课的资料' : 'Upload'}
              </Link>
            </div>
          </div>
        </header>

        {/* 类型 tab */}
        <div className="mat-tabs">
          <button
            type="button"
            className={`mat-tab${type === '' ? ' mat-tab--active' : ''}`}
            onClick={() => resetPage(() => setType(''))}
          >
            {isZh ? '全部' : 'All'}
          </button>
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`mat-tab${type === t ? ' mat-tab--active' : ''}`}
              onClick={() => resetPage(() => setType(t))}
            >
              {TYPE_META[t].emoji} {isZh ? TYPE_META[t].labelZh : TYPE_META[t].labelEn}
            </button>
          ))}
        </div>

        {/* 二次筛选 */}
        <div className="mat-toolbar">
          <select
            className="mat-select"
            value={examNode}
            onChange={(e) => resetPage(() => setExamNode(e.target.value))}
          >
            <option value="">{isZh ? '全部考试节点' : 'All exam nodes'}</option>
            {EXAM_NODES.map((n) => (
              <option key={n} value={n}>{isZh ? EXAM_NODE_META[n].labelZh : EXAM_NODE_META[n].labelEn}</option>
            ))}
          </select>

          <input
            className="mat-input"
            style={{ width: 130 }}
            type="number"
            min="1"
            placeholder={isZh ? '课时号' : 'Lesson'}
            value={lesson}
            onChange={(e) => resetPage(() => setLesson(e.target.value))}
          />

          <select className="mat-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">{isZh ? '最新' : 'Newest'}</option>
            <option value="name">{isZh ? '按名称' : 'By name'}</option>
            <option value="size">{isZh ? '按体积' : 'By size'}</option>
          </select>
        </div>

        {isLoading && <div className="mat-state">{isZh ? '加载中…' : 'Loading…'}</div>}

        {isError && (
          <div className="mat-banner mat-banner--error">
            {isZh ? '加载失败，请稍后重试。' : 'Failed to load.'}
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="mat-state">
            {isZh ? '这门课下还没有这类资料 —— 欢迎你上传第一份。' : 'Nothing here yet — be the first to upload.'}
          </div>
        )}

        <div className="mat-list">
          {items.map((it) => (
            <MaterialCard key={it.path} item={it} isZh={isZh} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mat-toolbar" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button
              type="button"
              className="mat-btn mat-btn--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {isZh ? '上一页' : 'Prev'}
            </button>
            <span className="mat-muted">{page} / {totalPages}</span>
            <button
              type="button"
              className="mat-btn mat-btn--sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {isZh ? '下一页' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
