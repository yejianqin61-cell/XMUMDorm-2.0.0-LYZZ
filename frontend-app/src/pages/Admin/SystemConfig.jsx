import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Save } from 'lucide-react';
import { get, patch } from '@shared/api/request';
import { useLanguage } from '../../context/LanguageContext';

const CONFIG_META = {
  report_auto_hide_threshold: { label: '自动隐藏阈值', labelEn: 'Auto-hide', desc: '被举报N次自动隐藏', descEn: 'Auto-hide after N reports' },
  report_auto_review_threshold: { label: '审核队列阈值', labelEn: 'Review queue', desc: '被举报N次进入审核', descEn: 'Auto-queue after N reports' },
  report_auto_delist_threshold: { label: '自动下架阈值', labelEn: 'Auto-delist', desc: '二手/跑腿被举报N次下架', descEn: 'Auto-delist after N reports' },
};

const LEVEL_NAMES = { 1: 'Lv1 新生', 2: 'Lv2 探索者', 3: 'Lv3 贡献者', 4: 'Lv4 校园达人', 5: 'Lv5 资深成员', 6: 'Lv6 校园传奇' };
const DAILY_CAP_LABELS = { login: '每日登录', like: '每日点赞', comment: '每日评论', post: '每日发帖', canteen_review: '每日食堂点评' };
const REWARD_LABELS = { login: '登录奖励', like: '点赞奖励', comment: '评论奖励', post: '发帖奖励', canteen_review: '食堂点评奖励' };

export default function SystemConfig() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState({});
  const [levelConfig, setLevelConfig] = useState({ thresholds: {}, caps: {}, rewards: {} });
  const [saved, setSaved] = useState(false);
  const [levelSaved, setLevelSaved] = useState(false);

  // 举报规则配置
  const { data: configs, isLoading } = useQuery({
    queryKey: ['admin', 'configs'],
    queryFn: async () => {
      const data = await get('/api/admin/configs');
      const vals = {};
      if (data) for (const [k, v] of Object.entries(data)) vals[k] = v?.value ?? v;
      setEditValues(vals);
      return data;
    },
  });

  // 等级配置
  const { data: lc, isLoading: lcLoading } = useQuery({
    queryKey: ['admin', 'levelConfig'],
    queryFn: () => get('/api/admin/level-config'),
  });

  useEffect(() => {
    if (lc) {
      setLevelConfig({
        thresholds: lc.level_thresholds || {},
        caps: lc.exp_daily_caps || {},
        rewards: lc.exp_action_rewards || {},
      });
    }
  }, [lc]);

  const saveMutation = useMutation({
    mutationFn: ({ key, value }) => patch(`/api/admin/configs/${key}`, { value }),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); queryClient.invalidateQueries({ queryKey: ['admin', 'configs'] }); },
  });

  const levelSaveMutation = useMutation({
    mutationFn: (data) => patch('/api/admin/level-config', data),
    onSuccess: () => { setLevelSaved(true); setTimeout(() => setLevelSaved(false), 2000); },
  });

  const updateThreshold = (level, value) => {
    setLevelConfig((prev) => ({ ...prev, thresholds: { ...prev.thresholds, [level]: parseInt(value, 10) || 0 } }));
  };
  const updateCap = (key, value) => {
    setLevelConfig((prev) => ({ ...prev, caps: { ...prev.caps, [key]: parseInt(value, 10) || 0 } }));
  };
  const updateReward = (key, value) => {
    setLevelConfig((prev) => ({ ...prev, rewards: { ...prev.rewards, [key]: parseInt(value, 10) || 0 } }));
  };

  const handleLevelSave = () => {
    levelSaveMutation.mutate({
      level_thresholds: levelConfig.thresholds,
      exp_daily_caps: levelConfig.caps,
      exp_action_rewards: levelConfig.rewards,
    });
  };

  if (isLoading || lcLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-5">{isZh ? '系统配置' : 'System Config'}</h1>

      {/* 举报规则 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-4">{isZh ? '举报规则' : 'Report Rules'}</h3>
        <div className="space-y-4">
          {Object.entries(CONFIG_META).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-slate-700">{isZh ? meta.label : meta.labelEn}</div>
                <div className="text-[12px] text-slate-400">{isZh ? meta.desc : meta.descEn}</div>
              </div>
              <input type="number" min="1" value={editValues[key] ?? ''} onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-[14px] text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => saveMutation.mutate({ key, value: editValues[key] })} disabled={saveMutation.isPending}
                className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        {saved && <p className="text-[13px] text-green-600 mt-3">{isZh ? '已保存' : 'Saved'}</p>}
      </div>

      {/* 等级系统配置 */}
      <div className="rounded-2xl bg-white border border-slate-100 p-5 mb-5">
        <h3 className="text-[15px] font-semibold text-slate-900 mb-4">{isZh ? '等级阈值' : 'Level Thresholds'}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {Object.entries(LEVEL_NAMES).map(([lv, name]) => (
            <div key={lv} className="flex items-center gap-2">
              <span className="text-[13px] text-slate-600 w-24">{isZh ? name : `Lv${lv}`}</span>
              <input type="number" min="0" value={levelConfig.thresholds[lv] ?? ''} onChange={(e) => updateThreshold(lv, e.target.value)}
                className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-[11px] text-slate-400">EXP</span>
            </div>
          ))}
        </div>

        <h4 className="text-[14px] font-semibold text-slate-900 mb-3">{isZh ? '每日上限' : 'Daily Caps'}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {Object.entries(DAILY_CAP_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[13px] text-slate-600 w-28">{isZh ? label : key}</span>
              <input type="number" min="0" value={levelConfig.caps[key] ?? ''} onChange={(e) => updateCap(key, e.target.value)}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>

        <h4 className="text-[14px] font-semibold text-slate-900 mb-3">{isZh ? '单次奖励' : 'Action Rewards'}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {Object.entries(REWARD_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[13px] text-slate-600 w-28">{isZh ? label : key}</span>
              <input type="number" min="0" value={levelConfig.rewards[key] ?? ''} onChange={(e) => updateReward(key, e.target.value)}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-[11px] text-slate-400">EXP</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={handleLevelSave} disabled={levelSaveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
          {levelSaveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isZh ? '保存等级配置' : 'Save Level Config'}
        </button>
        {levelSaved && <p className="text-[13px] text-green-600 mt-2">{isZh ? '已保存' : 'Saved'}</p>}
      </div>
    </div>
  );
}
