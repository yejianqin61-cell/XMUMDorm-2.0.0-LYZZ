import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { get } from '../../api/request';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 20;

const MODULES = [
  { key: 'treehole', label: '树洞帖子', labelEn: 'Treehole' },
  { key: 'canteen', label: '食堂点评', labelEn: 'Canteen Reviews' },
  { key: 'trending', label: '热搜帖子', labelEn: 'Trending' },
  { key: 'campus', label: '校园此刻', labelEn: 'Campus' },
  { key: 'club', label: '社团内容', labelEn: 'Club' },
  { key: 'marketplace', label: '二手市场', labelEn: 'Marketplace' },
  { key: 'errand', label: '跑腿帖子', labelEn: 'Errands' },
  { key: 'handbook', label: '一站通文章', labelEn: 'Handbook' },
  { key: 'course-review', label: '课程点评', labelEn: 'Course Reviews' },
];

export default function ContentList() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [module, setModule] = useState('treehole');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'contents', module, page, search],
    queryFn: () => get(`/api/admin/contents/${module}?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`),
    staleTime: 15 * 1000,
  });

  const list = data?.list || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const moduleLabel = data?.moduleLabel || '';

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '内容管理' : 'Content Management'}
      </h1>

      {/* 模块选择 + 搜索 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={module}
          onChange={(e) => { setModule(e.target.value); setPage(1); setSearch(''); setSearchInput(''); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-700 bg-white"
        >
          {MODULES.map((m) => (
            <option key={m.key} value={m.key}>{isZh ? m.label : m.labelEn}</option>
          ))}
        </select>

        <form onSubmit={handleSearch} className="flex items-center gap-1 flex-1 min-w-[180px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={isZh ? '搜索...' : 'Search...'}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-slate-600 text-sm">{error?.message || 'Failed to load'}</p>
        </div>
      ) : (
        <>
          <div className="text-[12px] text-slate-400 mb-2">
            {moduleLabel} · {isZh ? `共 ${total} 条` : `Total: ${total}`}
          </div>

          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '标题' : 'Title'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '作者' : 'Author'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '时间' : 'Time'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '状态' : 'Status'}</th>
                  <th className="text-center px-4 py-3 font-medium">{isZh ? '操作' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{item.id}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium max-w-[200px] truncate">
                      {item.title || `#${item.id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.username || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {item.deleted_at ? (
                        <span className="inline-block rounded-full bg-red-50 text-red-600 px-2 py-0.5 text-[11px] font-medium">
                          {isZh ? '已删除' : 'Deleted'}
                        </span>
                      ) : item.hidden_by_admin ? (
                        <span className="inline-block rounded-full bg-amber-50 text-amber-600 px-2 py-0.5 text-[11px] font-medium">
                          {isZh ? '已隐藏' : 'Hidden'}
                        </span>
                      ) : item.status === 'hidden' || item.status === 'draft' ? (
                        <span className="inline-block rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[11px] font-medium">
                          {item.status}
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-green-50 text-green-600 px-2 py-0.5 text-[11px] font-medium">
                          {isZh ? '正常' : 'Active'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/myzone/admin/contents/${module}/${item.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800 text-[12px]"
                      >
                        {isZh ? '查看' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '暂无内容' : 'No content'}
              </p>
            )}
          </div>

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] text-slate-600">{page} / {totalPages}</span>
              <button type="button" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
