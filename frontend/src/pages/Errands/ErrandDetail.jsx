import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Hand, MapPin, Phone, Trash2 } from 'lucide-react';
import ReportButton from '../../components/ReportButton';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../query/queryKeys';
import { queryClient } from '../../query/queryClient';
import { deleteErrand, getErrandDetail, takeErrand } from '../../api/errands';
import './Errands.css';

function ErrandDetail() {
  const { id } = useParams();
  const errandId = Number(id);
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';
  const { user } = useAuth();

  const q = useQuery({
    queryKey: QK.errandDetail(errandId),
    queryFn: async () => await getErrandDetail(errandId),
    enabled: Number.isFinite(errandId) && errandId > 0,
  });

  const e = q.data;
  const canTake = useMemo(() => {
    if (!e) return false;
    if (!user?.id) return false;
    const isAdmin = user?.role === 'admin';
    const isOwner = Number(e.owner?.id) === Number(user.id);
    if (e.status === 'done') return false;
    return isAdmin || isOwner;
  }, [e, user?.id]);

  const takeMut = useMutation({
    mutationFn: async () => await takeErrand(errandId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QK.errandDetail(errandId) });
      await queryClient.invalidateQueries({ queryKey: ['errands'] });
    },
  });

  const delMut = useMutation({
    mutationFn: async () => await deleteErrand(errandId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['errands'] });
      nav('/about/errands');
    },
  });

  if (q.isLoading) return <div className="state-loading">加载中</div>;
  if (q.isError || !e) return <div className="state-error">{q.error?.message || (isZh ? '加载失败' : 'Failed to load')}</div>;

  const isAdmin = user?.role === 'admin';
  const isOwner = Number(e.owner?.id) === Number(user?.id);
  const canDelete = isAdmin || isOwner;
  const takeLabel = e.status === 'taken' ? (isZh ? '取消接单' : 'Untake') : (isZh ? '已接单' : 'Take task');

  return (
    <div className="err-page">
      <div className="err-detail-top">
        <button type="button" className="err-back" onClick={() => nav(-1)} aria-label={isZh ? '返回' : 'Back'}>
          <ArrowLeft size={18} aria-hidden />
        </button>
        <div className="err-detail-title">{isZh ? '任务详情' : 'Errand detail'}</div>
        {canDelete ? (
          <>
            <button
              type="button"
              className="err-detail-delete pressable"
              onClick={() => {
                const ok = window.confirm(isZh ? '确定删除该任务吗？' : 'Delete this errand?');
                if (ok) delMut.mutate();
              }}
              disabled={delMut.isPending}
              aria-label={isZh ? '删除' : 'Delete'}
              title={isZh ? '删除' : 'Delete'}
            >
              <Trash2 size={18} aria-hidden />
            </button>
            <ReportButton target_type="errand" target_id={e.id} className="text-slate-400 hover:text-red-500" />
          </>
        ) : (
          <Link className="err-detail-edit" to="/about/errands">{isZh ? '列表' : 'List'}</Link>
        )}
      </div>

      <div className="err-detail-card">
        <div className="err-detail-h1">{e.title}</div>
        <div className="err-detail-row">
          <div className="err-detail-reward">RM {Number(e.reward || 0).toFixed(2)}</div>
          <div className={`err-status err-status--${e.status || 'open'}`}>{e.status}</div>
        </div>

        {e.deadline ? (
          <div className="err-detail-meta">
            <span className="err-detail-k">{isZh ? '截止' : 'Deadline'}</span>
            <span className="err-detail-v">{new Date(e.deadline).toLocaleString()}</span>
          </div>
        ) : null}

        {e.location ? (
          <div className="err-detail-meta">
            <span className="err-detail-k">
              <MapPin size={16} aria-hidden /> {isZh ? '地点' : 'Location'}
            </span>
            <span className="err-detail-v err-wrap">{e.location}</span>
          </div>
        ) : null}

        <div className="err-detail-desc err-wrap">{e.description || (isZh ? '（无描述）' : '(No description)')}</div>

        <div className="err-detail-contact">
          <div className="err-detail-contact-title">{isZh ? '联系方式（无私聊）' : 'Contact (no chat)'}</div>
          <div className="err-detail-contact-row">
            <Phone size={16} aria-hidden />
            <span className="err-wrap">{e.contactInfo}</span>
          </div>
        </div>

        <div className="err-actions">
          <button
            type="button"
            className="err-action err-action--primary pressable"
            disabled={!canTake || takeMut.isPending}
            onClick={() => takeMut.mutate()}
          >
            <Hand size={18} aria-hidden />
            {takeLabel}
          </button>
        </div>

        {canTake ? (
          <div className="err-owner-hint">
            {isZh
              ? '提醒：如果有人接单，请点击上面的按钮切换状态。'
              : 'Tip: If someone takes this task, tap the button above to update the status.'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ErrandDetail;

