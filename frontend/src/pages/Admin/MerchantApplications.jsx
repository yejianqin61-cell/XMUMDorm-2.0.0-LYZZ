import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '@shared/api/shop';
import { useLanguage } from '../../context/LanguageContextState';
import Button from '../../components/ui/Button';

const STATUS_LABELS = {
  pending: ['待审核', 'Pending'],
  approved: ['已通过', 'Approved'],
  rejected: ['已驳回', 'Rejected'],
  withdrawn: ['已撤回', 'Withdrawn'],
};

// 后台：商家入驻申请审核。
export default function MerchantApplications() {
  const { isZh } = useLanguage();
  const t = (zh, en) => (isZh ? zh : en);
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  const list = useQuery({
    queryKey: ['admin', 'shop-applications', status],
    queryFn: () => shopApi.adminApplications({ status, pageSize: 50 }),
  });
  const detail = useQuery({
    queryKey: ['admin', 'shop-application', selected],
    queryFn: () => shopApi.adminApplication(selected),
    enabled: !!selected,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'shop-applications'] });
    qc.invalidateQueries({ queryKey: ['admin', 'shop-application'] });
    qc.invalidateQueries({ queryKey: ['shop'] });
  };
  const approve = useMutation({
    mutationFn: () => shopApi.approveApplication(selected),
    onSuccess: (result) => {
      setMessage(t(`已通过，店铺链接 /shop/store/${result.slug}`, `Approved. Store URL /shop/store/${result.slug}`));
      setSelected(null);
      refresh();
    },
    onError: (error) => setMessage(error.message),
  });
  const reject = useMutation({
    mutationFn: () => shopApi.rejectApplication(selected, note.trim()),
    onSuccess: () => {
      setMessage(t('已驳回并记录理由', 'Rejected with reason'));
      setSelected(null);
      setNote('');
      refresh();
    },
    onError: (error) => setMessage(error.message),
  });

  const rows = list.data?.list || [];
  const current = detail.data;

  return (
    <div>
      <h1 className="text-[20px] font-bold text-slate-900 mb-2">{t('商家申请', 'Merchant applications')}</h1>
      <p className="text-[13px] text-slate-600 mb-4">
        {t('审核店铺备案；通过后自动创建店铺并挂到申请人账号下。', 'Review store applications. Approval creates the store under the applicant account.')}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setStatus(key); setSelected(null); setMessage(''); }}
            className={`rounded-xl border px-3 py-2 text-[13px] ${status === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
          >
            {t(label[0], label[1])}
          </button>
        ))}
      </div>

      {message && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-[13px] text-slate-800" role="status">{message}</p>}
      {list.isLoading && <p className="text-[13px] text-slate-500">{t('加载中…', 'Loading…')}</p>}
      {list.error && <p className="text-[13px] text-red-600" role="alert">{list.error.message}</p>}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ul className="m-0 grid list-none gap-2 p-0">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => { setSelected(row.id); setNote(''); setMessage(''); }}
                className={`w-full rounded-xl border p-3 text-left ${selected === row.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}
              >
                <span className="block text-[14px] font-semibold text-slate-900">{row.name_zh}</span>
                <span className="block text-[12px] text-slate-600">{row.name_en}</span>
                <span className="block text-[12px] text-slate-500">
                  {row.applicant_username || `#${row.applicant_user_id}`} · {String(row.created_at).slice(0, 10)}
                </span>
              </button>
            </li>
          ))}
          {!list.isLoading && rows.length === 0 && <li className="text-[13px] text-slate-500">{t('没有符合条件的申请', 'No applications')}</li>}
        </ul>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {!selected && <p className="text-[13px] text-slate-500">{t('选择一份申请查看详情', 'Select an application')}</p>}
          {selected && detail.isLoading && <p className="text-[13px] text-slate-500">{t('加载中…', 'Loading…')}</p>}
          {selected && detail.error && <p className="text-[13px] text-red-600" role="alert">{detail.error.message}</p>}
          {current && (
            <>
              <h2 className="mb-3 text-[17px] font-bold text-slate-900">{current.name_zh} · {current.name_en}</h2>
              <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-[13px]">
                <dt className="text-slate-500">{t('经营内容', 'What they sell')}</dt><dd className="text-slate-900">{current.business_scope}</dd>
                <dt className="text-slate-500">{t('申请人', 'Applicant')}</dt><dd className="text-slate-900">{current.applicant_username}（#{current.applicant_user_id}）</dd>
                <dt className="text-slate-500">{t('姓名', 'Name')}</dt><dd className="text-slate-900">{current.contact_name}</dd>
                <dt className="text-slate-500">{t('学号', 'Student ID')}</dt><dd className="text-slate-900">{current.student_id}</dd>
                <dt className="text-slate-500">{t('联系方式1', 'Contact 1')}</dt><dd className="text-slate-900">{current.contact_phone}</dd>
                <dt className="text-slate-500">{t('联系方式2', 'Contact 2')}</dt><dd className="text-slate-900">{current.contact_wechat}</dd>
                <dt className="text-slate-500">{t('状态', 'Status')}</dt><dd className="text-slate-900">{t(STATUS_LABELS[current.status]?.[0], STATUS_LABELS[current.status]?.[1])}</dd>
                {current.review_note && <><dt className="text-slate-500">{t('审核意见', 'Review note')}</dt><dd className="text-slate-900">{current.review_note}</dd></>}
                {current.merchant_id && <><dt className="text-slate-500">{t('店铺 ID', 'Store ID')}</dt><dd className="text-slate-900">{current.merchant_id}</dd></>}
              </dl>

              {current.status === 'pending' ? (
                <div className="mt-4 grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button loading={approve.isPending} onClick={() => { if (window.confirm(t('通过后会自动创建店铺并上架，确定？', 'Approving creates and lists the store. Continue?'))) approve.mutate(); }}>
                      {t('通过并上架', 'Approve and list')}
                    </Button>
                  </div>
                  <label className="grid gap-1 text-[13px] text-slate-700">
                    {t('驳回理由（必填）', 'Rejection reason (required)')}
                    <textarea className="min-h-[72px] rounded-xl border border-slate-200 px-3 py-2 text-[13px]" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
                  </label>
                  <div>
                    <Button variant="danger" disabled={!note.trim()} loading={reject.isPending} onClick={() => { if (window.confirm(t('确定驳回这份申请？', 'Reject this application?'))) reject.mutate(); }}>
                      {t('驳回', 'Reject')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-[13px] text-slate-500">{t('该申请已处理，不能再操作。', 'This application is already reviewed.')}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
