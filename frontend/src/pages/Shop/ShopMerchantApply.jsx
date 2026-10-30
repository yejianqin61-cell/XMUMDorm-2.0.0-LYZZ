import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { shopApi } from '@shared/api/shop';
import { useAuth } from '../../context/AuthContextState';
import { useLanguage } from '../../context/LanguageContextState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './Shop.css';

const EMPTY = {
  name_zh: '',
  name_en: '',
  business_scope: '',
  contact_name: '',
  student_id: '',
  contact_phone: '',
  contact_wechat: '',
};

// 商家备案表单：3 个对外展示字段 + 4 个仅管理员可见字段。
export default function ShopMerchantApply() {
  const { isZh } = useLanguage();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const t = (zh, en) => (isZh ? zh : en);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const submit = useMutation({
    mutationFn: () => shopApi.applyMerchant(form),
    onSuccess: () => navigate('/shop?merchantApplication=sent', { replace: true }),
    onError: (cause) => setError(cause.message),
  });

  if (!isLoggedIn) {
    return (
      <section className="shop-page">
        <h1>{t('注册成为商家', 'Become a merchant')}</h1>
        <p>{t('请先登录再填写备案信息。', 'Sign in before submitting an application.')}</p>
        <Link to="/login">{t('去登录', 'Sign in')}</Link>
      </section>
    );
  }

  const field = (key) => ({
    id: `merchant-${key}`,
    value: form[key],
    onChange: (event) => setForm({ ...form, [key]: event.target.value }),
  });

  const onSubmit = (event) => {
    event.preventDefault();
    const required = [['name_zh', '店铺中文名'], ['name_en', '店铺英文名'], ['business_scope', '经营内容'], ['contact_name', '姓名'], ['student_id', '学号'], ['contact_phone', '联系方式1'], ['contact_wechat', '联系方式2']];
    const missing = required.find(([key]) => !String(form[key] || '').trim());
    if (missing) {
      setError(t(`请填写${missing[1]}`, `Enter ${missing[1]}`));
      return;
    }
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(form.student_id.trim())) {
      setError(t('学号格式不正确', 'Invalid student ID'));
      return;
    }
    if (!/^[0-9+()\-\s]{6,40}$/.test(form.contact_phone.trim())) {
      setError(t('电话号码格式不正确', 'Invalid phone number'));
      return;
    }
    setError('');
    submit.mutate();
  };

  return (
    <section className="shop-page">
      <h1>{t('注册成为商家', 'Become a merchant')}</h1>
      <p>
        {t(
          '填写后提交管理员审核；审核期间可以随时撤回。通过后店铺会出现在商城列表。',
          'Submit for admin review. You can withdraw while it is under review. Once approved, your store appears in the directory.'
        )}
      </p>
      <form noValidate className="shop-merchant-form" onSubmit={onSubmit}>
        <h2>{t('对外展示', 'Public information')}</h2>
        <Input {...field('name_zh')} label={t('店铺中文名', 'Chinese store name')} required maxLength={120} />
        <Input {...field('name_en')} label={t('店铺英文名', 'English store name')} required maxLength={120} />
        <label className="shop-field" htmlFor="merchant-business_scope">
          {t('经营内容', 'What you sell')}
          <textarea
            id="merchant-business_scope"
            rows={3}
            maxLength={500}
            required
            value={form.business_scope}
            onChange={(event) => setForm({ ...form, business_scope: event.target.value })}
          />
        </label>

        <h2>{t('仅管理员可见', 'Visible to admins only')}</h2>
        <Input {...field('contact_name')} label={t('姓名', 'Your name')} required maxLength={80} />
        <Input {...field('student_id')} label={t('学号', 'Student ID')} required maxLength={40} />
        <Input {...field('contact_phone')} label={t('联系方式1（电话号码）', 'Contact 1 (phone)')} required maxLength={40} />
        <Input {...field('contact_wechat')} label={t('联系方式2（微信 / WhatsApp）', 'Contact 2 (WeChat / WhatsApp)')} required maxLength={80} />

        {error && <p role="alert">{error}</p>}
        {submit.error && <p role="alert">{submit.error.message}</p>}
        <div className="shop-actions">
          <Button type="submit" loading={submit.isPending}>{t('提交备案', 'Submit application')}</Button>
          <Link to="/shop">{t('返回商城', 'Back to shop')}</Link>
        </div>
      </form>
    </section>
  );
}
