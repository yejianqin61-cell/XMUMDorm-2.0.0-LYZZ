/**
 * 我上传的资料 —— 查看状态、修改元数据、下架
 *
 * 「修改元数据」走的是 metadata-only PR（不动文件本体），
 * 因此站内表单提交后仍需等一次 PR 合并，界面上会说清楚。
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react';
import { getMyUploads, patchMaterial, removeMaterial } from '@shared/api/materials';
import { QK } from '@shared/query/queryKeys';
import { useLanguage } from '../../context/LanguageContextState';
import { useAuth } from '../../context/AuthContextState';
import { Toast } from '../../context/toast';
import TaxonomyFields from '../../components/materials/TaxonomyFields';
import { humanSize, formatDate } from '@shared/utils/materialDisplay';
import { TYPE_META, EXAM_NODE_META } from '@shared/constants/materials';
import './Materials.css';

const STATUS_LABEL = {
  pending: { zh: '处理中', en: 'Pending', cls: 'mat-pill' },
  merged: { zh: '已上线', en: 'Published', cls: 'mat-pill' },
  rejected: { zh: '未通过', en: 'Rejected', cls: 'mat-pill mat-pill--ghost' },
  removed: { zh: '已下架', en: 'Removed', cls: 'mat-pill mat-pill--ghost' },
};

export default function MaterialsMine() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { isLoggedIn } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // { id, title, lesson, lessonTitle, examNode, source, description, tags, type }
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: QK.materialsMyUploads('me', 1, 50),
    queryFn: () => getMyUploads({ page: 1, pageSize: 50 }),
    enabled: isLoggedIn,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => patchMaterial(payload.id, payload.body),
    onSuccess: () => {
      Toast.success(isZh ? '已提交修改，等待资料库 PR 合并后生效' : 'Submitted; takes effect after the PR merges');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '修改失败' : 'Failed')),
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, reason }) => removeMaterial(id, reason),
    onSuccess: (res) => {
      Toast.success(isZh ? '已提交下架' : 'Removal submitted');
      if (res && res.notice) Toast.error(res.notice); // 如实告知 CDN 可能有残留
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (e) => Toast.error(e?.message || (isZh ? '下架失败' : 'Failed')),
  });

  if (!isLoggedIn) {
    return (
      <div className="mat-page">
        <div className="mat-wrap">
          <div className="mat-banner mat-banner--warn">{isZh ? '请先登录。' : 'Please sign in.'}</div>
          <Link className="mat-btn" to="/materials"><ArrowLeft size={14} /> {isZh ? '返回' : 'Back'}</Link>
        </div>
      </div>
    );
  }

  const items = (data && data.items) || [];

  return (
    <div className="mat-page">
      <div className="mat-wrap">
        <header className="mat-hero">
          <Link className="mat-btn mat-btn--sm" to="/materials"><ArrowLeft size={14} /> {isZh ? '资料库' : 'Library'}</Link>
          <h1 className="mat-title" style={{ marginTop: 10 }}>{isZh ? '我上传的资料' : 'My uploads'}</h1>
          <div className="mat-sub">
            {isZh ? `共 ${(data && data.total) || 0} 份` : `${(data && data.total) || 0} files`}
          </div>
        </header>

        {isLoading && <div className="mat-state">{isZh ? '加载中…' : 'Loading…'}</div>}

        {!isLoading && items.length === 0 && (
          <div className="mat-state">
            {isZh ? '你还没有上传过资料。' : 'You have not uploaded anything yet.'}{' '}
            <Link to="/materials/upload">{isZh ? '去上传' : 'Upload'}</Link>
          </div>
        )}

        <div className="mat-list">
          {items.map((it) => {
            const st = STATUS_LABEL[it.status] || STATUS_LABEL.pending;
            const meta = TYPE_META[it.type] || { emoji: '📄', labelZh: '资料', labelEn: 'File' };
            const exam = it.exam_node ? EXAM_NODE_META[it.exam_node] : null;
            const isEditing = editing && editing.id === it.id;

            return (
              <div key={it.id} className="mat-glass mat-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="mat-item-icon" aria-hidden>{meta.emoji}</div>

                  <div className="mat-item-body">
                    <div className="mat-item-title">{it.title}</div>
                    <div className="mat-item-meta">
                      <span className={st.cls}>{isZh ? st.zh : st.en}</span>
                      <span>{it.course_name}{it.lecturer ? ` · ${it.lecturer}` : ''}</span>
                      {it.lesson != null && (
                        <span className="mat-pill mat-pill--ghost">{isZh ? `第 ${it.lesson} 课时` : `L${it.lesson}`}</span>
                      )}
                      {exam && <span className="mat-pill mat-pill--ghost">{isZh ? exam.labelZh : exam.labelEn}</span>}
                      <span>{humanSize(it.file_size)}</span>
                      <span>{formatDate(it.created_at)}</span>
                      {it.download_count > 0 && (
                        <span><Download size={12} style={{ verticalAlign: -2 }} /> {it.download_count}</span>
                      )}
                    </div>
                    {it.reject_reason && (
                      <div className="mat-hint" style={{ color: '#b91c1c' }}>
                        {isZh ? '原因：' : 'Reason: '}{it.reject_reason}
                      </div>
                    )}
                    <div className="mat-hint"><code>{it.material_path}</code></div>
                  </div>

                  <div className="mat-item-actions">
                    {it.pr_url && (
                      <a className="mat-btn mat-btn--sm" href={it.pr_url} target="_blank" rel="noopener noreferrer">
                        PR #{it.pr_number}
                      </a>
                    )}
                    <button
                      type="button"
                      className="mat-btn mat-btn--sm"
                      disabled={it.status === 'removed'}
                      onClick={() =>
                        setEditing(
                          isEditing
                            ? null
                            : {
                                id: it.id,
                                type: it.type,
                                title: it.title,
                                lesson: it.lesson ?? '',
                                lessonTitle: it.lesson_title || '',
                                examNode: it.exam_node || '',
                                source: it.source || '',
                                description: '',
                                tags: '',
                                path: it.material_path,
                              }
                        )
                      }
                    >
                      <Pencil size={13} /> {isZh ? '改信息' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="mat-btn mat-btn--sm mat-btn--danger"
                      disabled={it.status === 'removed'}
                      onClick={() => setDeleting(deleting === it.id ? null : it.id)}
                    >
                      <Trash2 size={13} /> {isZh ? '下架' : 'Remove'}
                    </button>
                  </div>
                </div>

                {/* 编辑表单 */}
                {isEditing && (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(15,23,42,.08)', paddingTop: 12 }}>
                    <div className="mat-field">
                      <label className="mat-label">{isZh ? '标题' : 'Title'}</label>
                      <input
                        className="mat-input"
                        style={{ width: '100%' }}
                        maxLength={100}
                        value={editing.title}
                        onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      />
                    </div>

                    <TaxonomyFields
                      value={{
                        type: editing.type,
                        lesson: editing.lesson,
                        lessonTitle: editing.lessonTitle,
                        examNode: editing.examNode,
                        source: editing.source,
                      }}
                      onChange={(v) => setEditing({ ...editing, ...v })}
                      isZh={isZh}
                    />

                    <div className="mat-field">
                      <label className="mat-label">{isZh ? '简介' : 'Description'}</label>
                      <textarea
                        className="mat-textarea"
                        rows={2}
                        maxLength={300}
                        value={editing.description}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                      />
                    </div>

                    <div className="mat-toolbar">
                      <button
                        type="button"
                        className="mat-btn mat-btn--primary"
                        disabled={saveMutation.isPending}
                        onClick={() =>
                          saveMutation.mutate({
                            id: editing.id,
                            body: {
                              title: editing.title,
                              lesson: editing.lesson === '' ? null : Number(editing.lesson),
                              lessonTitle: editing.lessonTitle || null,
                              examNode: editing.examNode || null,
                              source: editing.source || null,
                              description: editing.description || null,
                            },
                          })
                        }
                      >
                        {isZh ? '提交修改' : 'Save'}
                      </button>
                      <button type="button" className="mat-btn" onClick={() => setEditing(null)}>
                        {isZh ? '取消' : 'Cancel'}
                      </button>
                      <span className="mat-hint" style={{ margin: 0 }}>
                        {isZh ? '类型不可修改（会影响存储目录），如需更正请下架后重传。' : 'Type is immutable.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 下架确认 */}
                {deleting === it.id && (
                  <div className="mat-banner mat-banner--warn" style={{ marginTop: 12 }}>
                    {isZh
                      ? '下架会从资料库删除文件并更新索引。⚠️ 文件可能仍被 CDN 缓存，短时间内可能继续可访问。'
                      : 'Removal deletes the file and updates the index. CDN caches may persist briefly.'}
                    <div className="mat-toolbar" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className="mat-btn mat-btn--danger"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate({ id: it.id, reason: isZh ? '上传者自行删除' : 'Removed by uploader' })}
                      >
                        {isZh ? '确认下架' : 'Confirm'}
                      </button>
                      <button type="button" className="mat-btn" onClick={() => setDeleting(null)}>
                        {isZh ? '取消' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
