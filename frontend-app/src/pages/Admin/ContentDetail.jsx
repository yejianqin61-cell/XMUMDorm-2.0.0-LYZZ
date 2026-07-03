import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { get, patch, del } from '@shared/api/request';
import { useLanguage } from '../../context/LanguageContext';

export default function ContentDetail() {
  const { module, id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['admin', 'content', module, id],
    queryFn: () => get(`/api/admin/contents/${module}/${id}`),
    enabled: !!module && !!id,
  });

  const hideMutation = useMutation({
    mutationFn: (hidden) => patch(`/api/admin/contents/${module}/${id}/toggle-visibility`, { hidden }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'content', module, id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!window.confirm(isZh ? '确定删除？' : 'Confirm delete?')) return Promise.reject(new Error('Cancelled'));
      return del(`/api/admin/contents/${module}/${id}`);
    },
    onSuccess: () => navigate(`/myzone/admin/contents/${module}`),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  if (isError || !item) return <div className="flex flex-col items-center justify-center py-20 gap-3"><AlertTriangle className="h-10 w-10 text-amber-500" /><p className="text-slate-600 text-sm">{isZh ? '加载失败' : 'Failed to load'}</p></div>;

  const isHidden = item.hidden_by_admin || item.deleted_at;
  const comments = item.comments || [];

  return (
    <div>
      <button type="button" onClick={() => navigate(`/myzone/admin/contents/${module}`)} className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="h-4 w-4" />{isZh ? '返回列表' : 'Back'}
      </button>

      <h1 className="text-[20px] font-bold text-slate-900 mb-5">{item.moduleLabel || module} #{item.id}</h1>

      {/* 内容详情 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[16px] font-semibold text-slate-900 mb-2">{item.title || `#${item.id}`}</h3>
        {item.content && <p className="text-[14px] text-slate-700 whitespace-pre-wrap">{item.content}</p>}
        <div className="flex gap-3 mt-3 text-[12px] text-slate-400">
          <span>{isZh ? '作者：' : 'Author: '}{item.username || '-'}</span>
          <span>{item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : ''}</span>
          {item.status && <span>Status: {item.status}</span>}
        </div>
      </div>

      {/* 操作 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-3">{isZh ? '管理操作' : 'Actions'}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button" onClick={() => hideMutation.mutate(!isHidden)}
            disabled={hideMutation.isPending}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors disabled:opacity-30 ${isHidden ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}`}
          >
            {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {isHidden ? (isZh ? '恢复显示' : 'Restore') : (isZh ? '隐藏' : 'Hide')}
          </button>
          <button
            type="button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />{isZh ? '删除' : 'Delete'}
          </button>
        </div>
        {hideMutation.isSuccess && <p className="text-[13px] text-green-600 mt-2">{isZh ? (isHidden ? '已恢复' : '已隐藏') : (isHidden ? 'Restored' : 'Hidden')}</p>}
      </div>

      {/* 评论管理 */}
      {comments.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
          <h3 className="text-[15px] font-semibold text-slate-900 mb-3">{isZh ? `评论 (${comments.length})` : `Comments (${comments.length})`}</h3>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className={`rounded-xl p-3 ${c.deleted_at ? 'bg-red-50' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-slate-700">{c.username || `User#${c.user_id}`}</span>
                  <span className="text-[11px] text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : ''}</span>
                </div>
                <p className="text-[13px] text-slate-600">{c.content}</p>
                {c.deleted_at && <span className="inline-block mt-1 rounded-full bg-red-100 text-red-500 px-2 py-0.5 text-[10px] font-medium">{isZh ? '已删除' : 'Deleted'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-center py-8 text-[13px] text-slate-400">{isZh ? '暂无评论' : 'No comments'}</p>
      )}
    </div>
  );
}
