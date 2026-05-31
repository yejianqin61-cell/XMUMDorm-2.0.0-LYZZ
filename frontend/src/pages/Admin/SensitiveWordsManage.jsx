import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, Loader2, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { get, post, del, patch } from '../../api/request';
import { useLanguage } from '../../context/LanguageContext';

const PAGE_SIZE = 50;

export default function SensitiveWordsManage() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [batchInput, setBatchInput] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'sensitiveWords', page, search],
    queryFn: () => get(`/api/admin/sensitive-words?page=${page}&pageSize=${PAGE_SIZE}&search=${encodeURIComponent(search)}`),
    staleTime: 15 * 1000,
  });

  const list = data?.list || [];
  const total = data?.total || 0;

  const addMutation = useMutation({
    mutationFn: (word) => post('/api/admin/sensitive-words', { word }),
    onSuccess: () => {
      setNewWord('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'sensitiveWords'] });
    },
  });

  const batchMutation = useMutation({
    mutationFn: (text) => {
      const words = text.split(/[\n,，]+/).map((w) => w.trim()).filter(Boolean);
      return post('/api/admin/sensitive-words/batch', { words });
    },
    onSuccess: () => {
      setBatchInput('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'sensitiveWords'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id }) => patch(`/api/admin/sensitive-words/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'sensitiveWords'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => del(`/api/admin/sensitive-words/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'sensitiveWords'] }),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    addMutation.mutate(newWord.trim());
  };

  const handleBatchImport = () => {
    if (!batchInput.trim()) return;
    batchMutation.mutate(batchInput);
  };

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '敏感词管理' : 'Sensitive Words'}
      </h1>

      {/* 新增敏感词 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-4 mb-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder={isZh ? '输入敏感词...' : 'Enter word...'}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newWord.trim() || addMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isZh ? '添加' : 'Add'}
          </button>
        </form>
      </div>

      {/* 批量导入 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-4 mb-4">
        <label className="block text-[13px] font-medium text-slate-600 mb-2">
          {isZh ? '批量导入（每行一个，或用逗号分隔）' : 'Batch Import (one per line, or comma-separated)'}
        </label>
        <textarea
          value={batchInput}
          onChange={(e) => setBatchInput(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder={isZh ? '词1\n词2\n词3' : 'word1\nword2\nword3'}
        />
        <button
          type="button"
          onClick={handleBatchImport}
          disabled={!batchInput.trim() || batchMutation.isPending}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          {batchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isZh ? '批量导入' : 'Batch Import'}
        </button>
        {batchMutation.isSuccess && (
          <p className="text-[13px] text-green-600 mt-1">{isZh ? `成功导入 ${batchMutation.data?.added || 0} 个敏感词` : `Imported ${batchMutation.data?.added || 0} words`}</p>
        )}
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={isZh ? '搜索敏感词...' : 'Search words...'}
          className="flex-1 text-[13px] text-slate-600 placeholder-slate-400 bg-transparent focus:outline-none"
        />
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-[13px] text-slate-500">{isZh ? '加载失败' : 'Failed to load'}</p>
        </div>
      ) : (
        <>
          <div className="text-[12px] text-slate-400 mb-2">
            {isZh ? `共 ${total} 个敏感词` : `Total: ${total} words`}
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
            {list.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${w.enabled ? 'bg-green-400' : 'bg-slate-300'}`} />
                  <span className={`text-[14px] ${w.enabled ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {w.word}
                  </span>
                  <span className="text-[11px] text-slate-300">{w.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate({ id: w.id })}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                    title={w.enabled ? (isZh ? '停用' : 'Disable') : (isZh ? '启用' : 'Enable')}
                  >
                    {w.enabled ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-slate-300" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(w.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <p className="text-center py-10 text-[13px] text-slate-400">
                {isZh ? '暂无敏感词' : 'No sensitive words'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
