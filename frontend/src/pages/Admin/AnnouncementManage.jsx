import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Plus, X, Trash2 } from 'lucide-react';
import { getAdminAnnouncements, createAnnouncement, deleteAnnouncement } from '../../api/admin';
import { useLanguage } from '../../context/LanguageContext';

export default function AnnouncementManage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: () => getAdminAnnouncements({ page: 1, pageSize: 50 }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const list = data?.list || [];

  const createMutation = useMutation({
    mutationFn: () => createAnnouncement({ title: title.trim(), content: content.trim() }),
    onSuccess: () => {
      setShowForm(false);
      setTitle('');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      if (!window.confirm(isZh ? '确定删除此公告吗？' : 'Delete this announcement?')) {
        return Promise.reject(new Error('Cancelled'));
      }
      return deleteAnnouncement(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-bold text-slate-900">
          {isZh ? '公告管理' : 'Announcements'}
        </h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {isZh ? '发布公告' : 'New'}
        </button>
      </div>

      {/* 发布表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl p-5 pb-[calc(16px+var(--safe-bottom))] sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-slate-900">
                {isZh ? '发布系统公告' : 'New Announcement'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                {isZh ? '标题' : 'Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={isZh ? '公告标题...' : 'Announcement title...'}
              />
            </div>

            <div className="mb-4">
              <label className="block text-[13px] font-medium text-slate-600 mb-1.5">
                {isZh ? '内容' : 'Content'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={isZh ? '公告内容...' : 'Announcement content...'}
              />
            </div>

            {createMutation.isError && (
              <p className="text-[13px] text-red-500 mb-3">
                {createMutation.error?.message || (isZh ? '发布失败' : 'Failed to create')}
              </p>
            )}

            <button
              type="button"
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="w-full rounded-xl bg-slate-900 py-2.5 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isZh ? '发布' : 'Publish'}
            </button>
          </div>
        </div>
      )}

      {/* 公告列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-slate-600 text-sm">{error?.message || (isZh ? '加载失败' : 'Failed to load')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white border border-slate-100 p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-slate-900 truncate">{a.title || '#' + a.id}</h3>
                  <p className="text-[13px] text-slate-600 mt-1 line-clamp-2">{a.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-400">
                    <span>{a.author || '-'}</span>
                    <span>{a.created_at ? new Date(a.created_at).toLocaleDateString('zh-CN') : '-'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(a.id)}
                  disabled={deleteMutation.isPending}
                  className="ml-3 rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <p className="text-center py-10 text-[13px] text-slate-400">
              {isZh ? '暂无公告' : 'No announcements'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
