/**
 * 学习资料管理端（admin）
 *
 * 三块：
 *   ① 看板：状态/类型分布、Top 下载、仓库体积
 *   ② 资料管理：列表 + 下架（下架走 PR，合并后文件才真正消失）
 *   ③ 课程维护：合并重复课程（会把资料与别名并入目标课程，并重写资料库索引）
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, GitMerge, Trash2 } from 'lucide-react';
import {
  getMaterialsAdminStats,
  listCourses,
  listMaterials,
  mergeCourses,
  removeMaterial,
} from '@shared/api/materials';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../../context/LanguageContextState';
import { Toast } from '../../context/toast';
import { humanSize, formatDate } from '@shared/utils/materialDisplay';
import { TYPE_META } from '@shared/constants/materials';
import './Materials.css';

export default function AdminMaterials() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: QK.materialsAdminStats(),
    queryFn: getMaterialsAdminStats,
    staleTime: 30 * 1000,
  });

  const { data: list, isLoading } = useQuery({
    queryKey: QK.materialsList({ pageSize: 100, sort: 'recent', __admin: true }),
    queryFn: () => listMaterials({ pageSize: 100, sort: 'recent' }),
    staleTime: 30 * 1000,
  });

  const { data: dict } = useQuery({
    queryKey: QK.materialsCourses('__admin__'),
    queryFn: () => listCourses({ limit: 500 }),
    staleTime: 60 * 1000,
  });

  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');
  const [removing, setRemoving] = useState(null);

  const removeMutation = useMutation({
    mutationFn: ({ id, reason }) => removeMaterial(id, reason),
    onSuccess: (res) => {
      Toast.success(isZh ? '已提交下架 PR' : 'Removal PR submitted');
      if (res && res.notice) Toast.error(res.notice);
      setRemoving(null);
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (e) => Toast.error(e?.message || 'Failed'),
  });

  const mergeMutation = useMutation({
    mutationFn: (payload) => mergeCourses(payload),
    onSuccess: (res) => {
      Toast.success(
        isZh
          ? `已合并：迁移 ${res.moved} 份资料${res.indexCommit ? '，索引已重写' : ''}`
          : `Merged; ${res.moved} materials moved`
      );
      setMergeFrom('');
      setMergeTo('');
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (e) => Toast.error(e?.message || 'Failed'),
  });

  const items = (list && list.items) || [];
  const courses = (dict && dict.courses) || [];

  const repoStats = (stats && stats.repo) || {};
  const byStatus = useMemo(() => {
    const m = {};
    for (const r of (stats && stats.byStatus) || []) m[r.status] = r.n;
    return m;
  }, [stats]);

  const byType = useMemo(() => {
    const m = {};
    for (const r of (stats && stats.byType) || []) m[r.type] = { n: r.n, bytes: Number(r.bytes) || 0 };
    return m;
  }, [stats]);

  /**
   * 上传者**只从本站 DB 取**（`/admin/stats` 的 `uploaderByPath`）。
   * 公开的资料库 index.json 里已经不再写上传者，所以不能从列表项上读。
   * 管理员手工加进仓库、没有 DB 行的文件会显示「—」，这是正确的。
   */
  const uploaderOf = (it) => {
    const map = (stats && stats.uploaderByPath) || {};
    const hit = it && it.path ? map[it.path] : null;
    return (hit && hit.name) || '—';
  };

  return (
    <div className="mat-page">
      <div className="mat-wrap">
        <header className="mat-hero">
          <Link className="mat-btn mat-btn--sm" to="/materials"><ArrowLeft size={14} /> {isZh ? '资料库' : 'Library'}</Link>
          <h1 className="mat-title" style={{ marginTop: 10 }}>{isZh ? '学习资料管理' : 'Materials admin'}</h1>
          <div className="mat-sub">
            {stats && !stats.configured ? (isZh ? '资料库未配置' : 'Not configured') : (isZh ? '资料库已配置' : 'Configured')}
            {stats && !stats.enabled ? (isZh ? ' · 上传已暂停' : ' · uploads paused') : ''}
            {stats && Number(stats.uploadPerHour) > 0
              ? (isZh ? ` · 限流 ${stats.uploadPerHour} 次/小时` : ` · ${stats.uploadPerHour}/hour`)
              : (isZh ? ' · 上传不限流' : ' · no upload limit')}
          </div>
        </header>

        {/* ---------------- 看板 ---------------- */}
        <section className="mat-glass mat-section">
          <div className="mat-section-title">{isZh ? '看板' : 'Overview'}</div>

          <div className="mat-stat-grid">
            <div className="mat-glass mat-stat">
              <div className="mat-stat-num">{repoStats.totalFiles ?? byTypeTotal(byType)}</div>
              <div className="mat-stat-label">{isZh ? '资料总数' : 'Files'}</div>
            </div>
            <div className="mat-glass mat-stat">
              <div className="mat-stat-num">{humanSize(repoStats.totalBytes ?? byTypeBytes(byType))}</div>
              <div className="mat-stat-label">{isZh ? '资料库体积' : 'Repo size'}</div>
            </div>
            <div className="mat-glass mat-stat">
              <div className="mat-stat-num">{stats && stats.dbCourses != null ? stats.dbCourses : courses.length}</div>
              <div className="mat-stat-label">{isZh ? '课程数' : 'Courses'}</div>
            </div>
            <div className="mat-glass mat-stat">
              <div className="mat-stat-num" style={{ color: byStatus.pending ? '#b45309' : undefined }}>
                {byStatus.pending || 0}
              </div>
              <div className="mat-stat-label">{isZh ? '处理中' : 'Pending'}</div>
            </div>
            <div className="mat-glass mat-stat">
              <div className="mat-stat-num" style={{ color: byStatus.rejected ? '#b91c1c' : undefined }}>
                {byStatus.rejected || 0}
              </div>
              <div className="mat-stat-label">{isZh ? '未通过' : 'Rejected'}</div>
            </div>
          </div>

          <div className="mat-toolbar" style={{ marginTop: 12 }}>
            {Object.keys(byType).length === 0 && <span className="mat-muted">{isZh ? '暂无类型分布' : 'No data'}</span>}
            {Object.entries(byType).map(([t, v]) => {
              const meta = TYPE_META[t] || { emoji: '📄', labelZh: t, labelEn: t };
              return (
                <span key={t} className="mat-pill mat-pill--ghost">
                  {meta.emoji} {isZh ? meta.labelZh : meta.labelEn} · {v.n} · {humanSize(v.bytes)}
                </span>
              );
            })}
          </div>

          {repoStats.error && (
            <div className="mat-banner mat-banner--warn" style={{ marginTop: 12 }}>
              {isZh ? '读取资料库体积失败：' : 'Failed to read repo stats: '}{repoStats.error}
            </div>
          )}
        </section>

        {/* ---------------- 课程合并 ---------------- */}
        <section className="mat-glass mat-section">
          <div className="mat-section-title">
            <GitMerge size={17} /> {isZh ? '合并重复课程' : 'Merge duplicate courses'}
          </div>
          <div className="mat-hint" style={{ marginBottom: 10 }}>
            {isZh
              ? '课程身份 = 名字 + 讲师。把重复/改名的课程合并到目标课程：资料与别名都会并过去，并重写资料库索引里的 courseId。'
              : 'Merge a duplicate course into a target course; materials and aliases move over.'}
          </div>

          <div className="mat-row2">
            <div>
              <label className="mat-label">{isZh ? '被合并（来源）' : 'From'}</label>
              <select className="mat-select" style={{ width: '100%' }} value={mergeFrom} onChange={(e) => setMergeFrom(e.target.value)}>
                <option value="">{isZh ? '选择课程…' : 'Choose…'}</option>
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    #{c.courseId} {c.name}{c.lecturer ? ` · ${c.lecturer}` : ''}（{c.materialCount ?? 0}）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mat-label">{isZh ? '合并到（目标）' : 'To'}</label>
              <select className="mat-select" style={{ width: '100%' }} value={mergeTo} onChange={(e) => setMergeTo(e.target.value)}>
                <option value="">{isZh ? '选择课程…' : 'Choose…'}</option>
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    #{c.courseId} {c.name}{c.lecturer ? ` · ${c.lecturer}` : ''}（{c.materialCount ?? 0}）
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mat-toolbar">
            <button
              type="button"
              className="mat-btn mat-btn--primary"
              disabled={!mergeFrom || !mergeTo || mergeFrom === mergeTo || mergeMutation.isPending}
              onClick={() => {
                if (!window.confirm(isZh ? '确认合并这两门课程？此操作不可撤销。' : 'Merge these two courses? This cannot be undone.')) return;
                mergeMutation.mutate({ fromId: Number(mergeFrom), toId: Number(mergeTo) });
              }}
            >
              <GitMerge size={15} /> {isZh ? '合并' : 'Merge'}
            </button>
            {mergeFrom && mergeFrom === mergeTo && (
              <span className="mat-hint" style={{ margin: 0, color: '#b91c1c' }}>
                {isZh ? '来源与目标不能相同' : 'From and To must differ'}
              </span>
            )}
          </div>
        </section>

        {/* ---------------- 资料列表 + 下架 ---------------- */}
        <section className="mat-glass mat-section">
          <div className="mat-section-title">
            <Trash2 size={17} /> {isZh ? '资料管理' : 'Materials'}
          </div>

          {isLoading && <div className="mat-state">{isZh ? '加载中…' : 'Loading…'}</div>}

          {!isLoading && items.length === 0 && <div className="mat-state">{isZh ? '暂无资料' : 'No materials'}</div>}

          {items.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="mat-table">
                <thead>
                  <tr>
                    <th>{isZh ? '标题' : 'Title'}</th>
                    <th>{isZh ? '课程' : 'Course'}</th>
                    <th>{isZh ? '类型' : 'Type'}</th>
                    <th>{isZh ? '体积' : 'Size'}</th>
                    <th>{isZh ? '上传者' : 'Uploader'}</th>
                    <th>{isZh ? '更新时间' : 'Updated'}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const meta = TYPE_META[it.type] || { emoji: '📄', labelZh: it.type, labelEn: it.type };
                    return (
                      <tr key={it.path}>
                        <td>
                          <Link to={`/materials/file?path=${encodeURIComponent(it.path)}`}>{it.title}</Link>
                          <div className="mat-hint"><code>{it.path}</code></div>
                        </td>
                        <td>{it.courseName}{it.lecturer ? ` · ${it.lecturer}` : ''}</td>
                        <td>{meta.emoji} {isZh ? meta.labelZh : meta.labelEn}</td>
                        <td>{humanSize(it.size)}</td>
                        <td>{uploaderOf(it)}</td>
                        <td>{formatDate(it.updatedAt)}</td>
                        <td>
                          {it.id ? (
                            <button
                              type="button"
                              className="mat-btn mat-btn--sm mat-btn--danger"
                              onClick={() => setRemoving(removing === it.id ? null : it.id)}
                            >
                              <Trash2 size={13} /> {isZh ? '下架' : 'Remove'}
                            </button>
                          ) : (
                            <span className="mat-hint" style={{ margin: 0 }}>
                              {isZh ? '无站内记录' : 'no record'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {removing && (
            <div className="mat-banner mat-banner--warn" style={{ marginTop: 12 }}>
              <AlertTriangle size={14} style={{ verticalAlign: -2 }} />{' '}
              {isZh
                ? '下架会开一个 PR 删除文件并更新索引，合并后才真正生效。⚠️ CDN 可能仍有缓存，短时间内可能继续可访问。'
                : 'A removal PR will be opened. CDN caches may persist briefly.'}
              <div className="mat-toolbar" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="mat-btn mat-btn--danger"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate({ id: removing, reason: isZh ? '管理员下架' : 'Removed by admin' })}
                >
                  {isZh ? '确认下架' : 'Confirm'}
                </button>
                <button type="button" className="mat-btn" onClick={() => setRemoving(null)}>
                  {isZh ? '取消' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function byTypeTotal(byType) {
  return Object.values(byType).reduce((s, v) => s + (v.n || 0), 0);
}
function byTypeBytes(byType) {
  return Object.values(byType).reduce((s, v) => s + (v.bytes || 0), 0);
}
