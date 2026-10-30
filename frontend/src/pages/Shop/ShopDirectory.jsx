import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '@shared/api/shop';
import { useAuth } from '../../context/AuthContextState';
import { useLanguage } from '../../context/LanguageContextState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { localized } from './shopLabels';
import './Shop.css';

const empty = { slug:'', name_zh:'', name_en:'' };

export default function ShopDirectory() {
  const { isZh } = useLanguage();
  const { isAdmin, isLoggedIn, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const t = (zh, en) => isZh ? zh : en;
  const stores = useQuery({ queryKey:['shop','merchants'], queryFn:shopApi.merchants });
  const mine = useQuery({ queryKey:['shop','my-merchants',user?.id], queryFn:shopApi.myMerchants, enabled:isLoggedIn });
  const [searchParams, setSearchParams] = useSearchParams();
  const open = ['store','merchant'].includes(searchParams.get('create'));
  const setOpen = value => setSearchParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set('create','store'); else next.delete('create');
    return next;
  }, { replace:true });
  const [form, setForm] = useState(empty);
  const [validation, setValidation] = useState('');
  const create = useMutation({
    mutationFn:shopApi.createOwnStore,
    onSuccess:async result => {
      await qc.invalidateQueries({ queryKey:['shop'] });
      setForm(empty);
      setOpen(false);
      navigate(`/shop/store/${result.slug}/manage`);
    },
  });

  return <section className="shop-page">
    <h1>{t('订水 / 超市','Water & groceries')}</h1>
    <p>{t('每家商户独立管理商品、订单和配送。','Each merchant manages its own products, orders and delivery.')}</p>
    {stores.error && <p role="alert">{stores.error.message}</p>}
    {stores.isLoading && <p>{t('加载中…','Loading…')}</p>}
    {stores.data?.length===0 && <p>{t('暂无店铺。商家登录后点击「创建我的店铺」即可开店。','No stores yet. Sign in as a merchant to create your store.')}</p>}
    <div className="shop-grid">
      {stores.data?.map(store=><article className="shop-order" key={store.id}>
        <h2>{localized(store,'name',isZh)}</h2>
        <div className="shop-actions">
          <Link to={`/shop/store/${store.slug}`}>{t('进入商城','Enter store')}</Link>
          {mine.data?.some(m=>m.id===store.id) && <Link to={`/shop/store/${store.slug}/manage`}>{t('商品与订单管理','Manage products & orders')}</Link>}
        </div>
      </article>)}
    </div>
    {!isLoggedIn && <Link to="/login">{t('商家登录','Merchant sign in')}</Link>}
    {(isAdmin || user?.role==='merchant') && <>
      <Button disabled={create.isPending} onClick={()=>{setOpen(!open);setValidation('');create.reset();}}>
        {t('创建我的店铺','Create my store')}
      </Button>
      {open && <form noValidate className="shop-editor" onSubmit={event=>{
        event.preventDefault();
        const slug=form.slug.trim().toLowerCase();
        if (!slug || !form.name_zh.trim() || !form.name_en.trim()) {
          setValidation(t('请填写店铺中文名、英文名和网址名称。','Enter the Chinese name, English name, and URL name.'));
          return;
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          setValidation(t('店铺网址名称请用英文字母、数字和短横线，例如 campus-market。','Use letters, numbers, and hyphens for the store URL, e.g. campus-market.'));
          return;
        }
        setValidation('');
        create.mutate({ slug, name_zh:form.name_zh, name_en:form.name_en });
      }}>
        <h2>{t('创建我的店铺','Create my store')}</h2>
        <p>{t('店铺会绑定到你当前登录的账号。创建后直接进入管理页面，无需再注册账号。','Your store will belong to your signed-in account. You can manage it right after creation; no new account is needed.')}</p>
        {[
          ['name_zh','店铺中文名','Chinese store name'],
          ['name_en','店铺英文名','English store name'],
          ['slug','店铺网址名称','Store URL name'],
        ].map(([key,zh,en])=><Input key={key} id={`merchant-${key}`} label={t(zh,en)} required disabled={create.isPending} maxLength={key==='slug'?60:120} placeholder={key==='slug'?'campus-market':undefined} value={form[key]} onChange={event=>setForm({...form,[key]:event.target.value})}/>)}
        <p>{t('网址名称会成为店铺链接的末尾。例如 campus-market 对应 /shop/store/campus-market。','This name forms the end of your store link. For example: /shop/store/campus-market.')}</p>
        {validation && <p role="alert">{validation}</p>}
        {create.error && <p role="alert">{create.error.message}</p>}
        <Button type="submit" loading={create.isPending}>{t('创建并进入管理','Create and manage')}</Button>
      </form>}
    </>}
  </section>;
}
