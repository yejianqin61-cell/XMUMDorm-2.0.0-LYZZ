import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { getAdminUsers } from '@shared/api/admin';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 20;

const ROLE_LABELS = { student: '学生', merchant: '商家', admin: '管理员' };
const STATUS_LABELS = { active: '正常', banned: '封禁', deactivated: '已注销' };

export default function UserList() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter, statusFilter],
    queryFn: () => getAdminUsers({ page, pageSize: PAGE_SIZE, search, role: roleFilter, status: statusFilter }),
    staleTime: 15 * 1000,
    refetchOnWindowFocus: false,
  });

  const list = data?.list || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '用户管理' : 'User Management'}
      </h1>

      {/* 搜索与筛选 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex items-center gap-1 flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={isZh ? '搜索用户名/邮箱/学号...' : 'Search username/email/ID...'}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
            <Search className="h-4 w-4" />
          </button>
        </form>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-600 bg-white"
        >
          <option value="">{isZh ? '全部角色' : 'All Roles'}</option>
          <option value="student">{isZh ? '学生' : 'Student'}</option>
          <option value="merchant">{isZh ? '商家' : 'Merchant'}</option>
          <option value="admin">{isZh ? '管理员' : 'Admin'}</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-600 bg-white"
        >
          <option value="">{isZh ? '全部状态' : 'All Status'}</option>
          <option value="active">{isZh ? '正常' : 'Active'}</option>
          <option value="banned">{isZh ? '封禁' : 'Banned'}</option>
          <option value="deactivated">{isZh ? '已注销' : 'Deactivated'}</option>
        </select>
      </div>

      {/* 内容 */}
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
        <>
          <div className="text-[12px] text-slate-400 mb-2">
            {isZh ? `共 ${total} 个用户` : `Total: ${total} users`}
          </div>

          {/* 移动端：卡片 */}
          <div className="block md:hidden space-y-3">
            {list.map((u) => (
              <Link
                key={u.id}
                to={`/myzone/admin/users/${u.id}`}
                className="block rounded-2xl bg-white border border-slate-100 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400 text-[14px] font-bold">
                        {(u.nickname || u.username || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-slate-900 truncate">
                      {u.nickname || u.username}
                    </div>
                    <div className="text-[12px] text-slate-400 truncate">{u.email || '-'}</div>
                  </div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    u.status === 'banned' ? 'bg-red-50 text-red-600' :
                    u.status === 'deactivated' ? 'bg-slate-100 text-slate-500' :
                    'bg-green-50 text-green-600'
                  }`}>
                    {isZh ? (STATUS_LABELS[u.status] || u.status) : u.status}
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-[12px] text-slate-400">
                  <span>Lv{u.level || 1}</span>
                  <span>{isZh ? (ROLE_LABELS[u.role] || u.role) : u.role}</span>
                  <span>UID: {u.id}</span>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '没有找到用户' : 'No users found'}
              </p>
            )}
          </div>

          {/* 桌面端：表格 */}
          <div className="hidden md:block rounded-2xl bg-white border border-slate-100 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">UID</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '用户' : 'User'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '邮箱' : 'Email'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '角色' : 'Role'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '等级' : 'Level'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '注册时间' : 'Registered'}</th>
                  <th className="text-left px-4 py-3 font-medium">{isZh ? '状态' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{u.id}</td>
                    <td className="px-4 py-3">
                      <Link to={`/myzone/admin/users/${u.id}`} className="inline-flex items-center gap-2 text-slate-900 font-medium hover:text-blue-600">
                        <div className="h-7 w-7 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400 text-[11px] font-bold">
                              {(u.nickname || u.username || '?')[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        {u.nickname || u.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{isZh ? (ROLE_LABELS[u.role] || u.role) : u.role}</td>
                    <td className="px-4 py-3 text-slate-600">Lv{u.level || 1}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        u.status === 'banned' ? 'bg-red-50 text-red-600' :
                        u.status === 'deactivated' ? 'bg-slate-100 text-slate-500' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {isZh ? (STATUS_LABELS[u.status] || u.status) : u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '没有找到用户' : 'No users found'}
              </p>
            )}
          </div>

          {/* 分页 */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
