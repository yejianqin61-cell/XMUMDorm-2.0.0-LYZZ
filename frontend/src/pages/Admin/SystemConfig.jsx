import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Save, RotateCcw } from 'lucide-react';
import { get, patch } from '../../api/request';
import { useLanguage } from '../../context/LanguageContext';

const CONFIG_META = {
  report_auto_hide_threshold: { label: '自动隐藏阈值', labelEn: 'Auto-hide threshold', desc: '内容被举报达到该次数自动隐藏', descEn: 'Auto-hide content after N reports' },
  report_auto_review_threshold: { label: '审核队列阈值', labelEn: 'Review queue threshold', desc: '内容被举报达到该次数进入审核队列', descEn: 'Auto-queue for review after N reports' },
  report_auto_delist_threshold: { label: '自动下架阈值', labelEn: 'Auto-delist threshold', desc: '二手/跑腿被举报达到该次数自动下架', descEn: 'Auto-delist marketplace/errand items after N reports' },
};

export default function SystemConfig() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState({});
  const [saved, setSaved] = useState(false);

  const { data: configs, isLoading, isError } = useQuery({
    queryKey: ['admin', 'configs'],
    queryFn: async () => {
      const data = await get('/api/admin/configs');
      // Initialize edit values
      const vals = {};
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          vals[k] = v?.value ?? v;
        }
      }
      setEditValues(vals);
      return data;
    },
    staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      await patch(`/api/admin/configs/${key}`, { value });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['admin', 'configs'] });
    },
  });

  const handleSave = async (key) => {
    await saveMutation.mutateAsync({ key, value: editValues[key] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-slate-600 text-sm">{isZh ? '加载失败' : 'Failed to load'}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-5">
        {isZh ? '系统配置' : 'System Config'}
      </h1>

      {/* 举报规则 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-4">
          {isZh ? '举报规则' : 'Report Rules'}
        </h3>
        <div className="space-y-4">
          {Object.entries(CONFIG_META).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-slate-700">
                  {isZh ? meta.label : meta.labelEn}
                </div>
                <div className="text-[12px] text-slate-400 mt-0.5">
                  {isZh ? meta.desc : meta.descEn}
                </div>
              </div>
              <input
                type="number"
                min="1"
                value={editValues[key] ?? ''}
                onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-[14px] text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleSave(key)}
                disabled={saveMutation.isPending}
                className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {saved && (
          <p className="text-[13px] text-green-600 mt-3">{isZh ? '已保存' : 'Saved'}</p>
        )}
      </div>

      {/* 等级系统配置提示 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-2">
          {isZh ? '等级系统配置' : 'Level System Config'}
        </h3>
        <p className="text-[13px] text-slate-400">
          {isZh
            ? '等级系统配置（经验值阈值、每日上限等）目前通过代码常量管理（constants/levelThresholds.js）。后续可在后台直接配置。'
            : 'Level system config (EXP thresholds, daily caps) is currently managed via code constants (constants/levelThresholds.js). Admin UI config will be added later.'}
        </p>
      </div>
    </div>
  );
}
