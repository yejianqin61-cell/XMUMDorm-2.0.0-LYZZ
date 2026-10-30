import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { shopApi } from '@shared/api/shop';
import { useAuth } from '../../context/AuthContextState';
import { useLanguage } from '../../context/LanguageContextState';
import Button from '../../components/ui/Button';
import './Shop.css';

const STATUS_TEXT = {
  pending: ['审核中', 'Under review'],
  approved: ['已通过', 'Approved'],
  rejected: ['未通过', 'Not approved'],
  withdrawn: ['已撤回', 'Withdrawn'],
};

// 商城首页末尾的「注册成为商家」面板：入口 + 当前申请状态 + 撤回。
export default function ShopMerchantEntry() {
  const { isZh } = useLanguage();
  const { user, isLoggedIn } = useAuth();
  const qc = useQueryClient();
  const t = (zh, en) => (isZh ? zh : en);
  const applications = useQuery({
    queryKey: ['shop', 'merchant-applications', user?.id],
    queryFn: shopApi.myApplications,
    enabled: !!isLoggedIn,
    retry: 1,
  });
  const withdraw = useMutation({
    mutationFn: (id) => shopApi.withdrawApplication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shop', 'merchant-applications'] }),
  });
  const latest = applications.data?.[0];

  return (
    <section className="shop-order shop-merchant-panel" id="merchant-apply">
      <h2>{t('注册成为商家', 'Become a merchant')}</h2>
      <p>
        {t(
          '提交店铺备案信息后由管理员审核，通过后店铺会出现在商城列表，商品由你自行添加。',
          'Submit your store details for admin review. Once approved, your store appears in the directory and you add your own products.'
        )}
      </p>

      {!isLoggedIn ? (
        <Link to="/login">{t('登录后申请', 'Sign in to apply')}</Link>
      ) : latest ? (
        <div className="shop-merchant-status">
          <p>
            <strong>{latest.name_zh}</strong>
            {' · '}
            {t(STATUS_TEXT[latest.status]?.[0] || '处理中', STATUS_TEXT[latest.status]?.[1] || 'Processing')}
          </p>
          {latest.status === 'pending' && (
            <Button
              variant="outline"
              loading={withdraw.isPending}
              onClick={() => {
                if (window.confirm(t('确定撤回这份申请？撤回后可以重新提交。', 'Withdraw this application? You can apply again afterwards.'))) {
                  withdraw.mutate(latest.id);
                }
              }}
            >
              {t('撤回申请', 'Withdraw')}
            </Button>
          )}
          {latest.status === 'rejected' && latest.review_note && (
            <p role="status">{t('原因：', 'Reason: ')}{latest.review_note}</p>
          )}
          {latest.status === 'approved' && latest.merchant_id && (
            <p>{t('店铺已上架，可在「商城管理」中维护商品和营业状态。', 'Your store is live. Manage products and opening status in the store admin.')}</p>
          )}
          {(latest.status === 'rejected' || latest.status === 'withdrawn') && (
            <Link to="/shop/merchant-apply">{t('重新申请', 'Apply again')}</Link>
          )}
        </div>
      ) : (
        <Link className="shop-merchant-cta" to="/shop/merchant-apply">{t('填写备案表单', 'Open the application form')}</Link>
      )}

      {applications.error && <p role="alert">{applications.error.message}</p>}
    </section>
  );
}
