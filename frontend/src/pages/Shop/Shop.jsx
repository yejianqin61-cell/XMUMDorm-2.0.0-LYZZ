import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Package, Droplets, ArrowLeft } from 'lucide-react';
import { createShopApi, shopApi } from '@shared/api/shop';
import { useAuth } from '../../context/AuthContextState';
import { useLanguage } from '../../context/LanguageContextState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { categories, statuses, money, localized } from './shopLabels';
import './Shop.css';
import ShopAdmin from './ShopAdmin';
import ShopDirectory from './ShopDirectory';
import PaymentPanel from './ShopPayment';
import ShopOrderSuccess from './ShopOrderSuccess';
import ShopCartFlight from './ShopCartFlight';
import ShopStoreAdmin from './ShopStoreAdmin';
import ShopImage from './ShopImage';
import { shopImageUrl } from './shopImageUrl';
import ShopOrderAmounts from './ShopOrderAmounts';

const parseJsonArray = value => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
};
const campusNow = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};
const slotIsOpenNow = (slot, now = campusNow()) => {
  const date = String(slot?.delivery_date || '').slice(0, 10);
  const start = String(slot?.delivery_start || '').slice(0, 5);
  const end = String(slot?.delivery_end || '').slice(0, 5);
  return `${date} ${start}:00` <= now && now < `${date} ${end}:00`;
};

export default function ShopRouter() {
 const location=useLocation();
 const slug=location.pathname.match(/^\/shop\/store\/([a-z0-9-]+)/)?.[1];
 if(location.pathname==='/myzone/admin/shop') return <ShopManageRedirect />;
 if(location.pathname==='/shop') return <ShopDirectory />;
 if(location.pathname==='/shop/manage') return <ShopManageRedirect />;
 if(slug && location.pathname.endsWith('/manage')) return <ShopAdmin key={slug} slug={slug} />;
 return <Shop key={slug||'water-home'} slug={slug} />;
}
function ShopManageRedirect() {
 const {user}=useAuth();
 const mine=useQuery({queryKey:['shop','my-merchants',user?.id],queryFn:shopApi.myMerchants,enabled:!!user&&user.role!=='admin'});
 if(user?.role==='admin') return <ShopStoreAdmin />;
 if(mine.isLoading)return <p role="status">正在打开商家后台…</p>;
 const target=mine.data?.[0];
 return target?<Navigate replace to={`/shop/store/${target.slug}/manage`}/>:<Navigate replace to="/shop"/>;
}
function Shop({slug}) {
  const { isZh } = useLanguage();
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const shopApi=useMemo(()=>createShopApi(slug),[slug]);
  const base=slug?`/shop/store/${slug}`:'/shop';
  const path=location.pathname.replace(base,'/shop');
  const qc = useQueryClient();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [flight, setFlight] = useState(null);
  const [cartFeedback, setCartFeedback] = useState('');
  const cartIcon = useRef(null);
  useEffect(() => { if (!cartFeedback) return; const timer = setTimeout(() => setCartFeedback(''), 2200); return () => clearTimeout(timer); }, [cartFeedback, flight]);
  const completedRequest = useRef(null);
  const pendingStorage = `shop-pending-${user?.id}-${slug||"water-home"}`;
  const [pendingKey, setPendingKey] = useState(() => sessionStorage.getItem(pendingStorage));
  const recovery = useQuery({ queryKey: ['shop', slug || 'water-home', user?.id, 'request', pendingKey], queryFn: () => shopApi.requestOrder(pendingKey), enabled: isLoggedIn && !!pendingKey, refetchInterval: q => q.state.data?.id ? false : 3000 });
  useEffect(() => {
    if (!recovery.data?.id || completedRequest.current === recovery.data.id) return;
    completedRequest.current = recovery.data.id;
    sessionStorage.removeItem(pendingStorage);
    qc.invalidateQueries({ queryKey: ['shop'] });
    navigate(`${base}/orders/${recovery.data.id}`, { replace: true });
  }, [recovery.data, pendingStorage, qc, navigate, base]);
  const rememberRequest = key => { setPendingKey(key); if (key) sessionStorage.setItem(pendingStorage,key); else sessionStorage.removeItem(pendingStorage); };
  const t = (zh, en) => isZh ? zh : en;
  const field = (p, key) => localized(p, key, isZh);
  const catalog = useQuery({ queryKey: ['shop', slug || 'water-home', 'catalog'], queryFn: shopApi.catalog, refetchInterval: 15000 });
  const [, setClockTick] = useState(0);
  useEffect(() => { const timer = setInterval(() => setClockTick(value => value + 1), 10000); return () => clearInterval(timer); }, []);
  const currentSlots = (catalog.data?.slots || []).filter(slot => slotIsOpenNow(slot));
  const orderWindowOpen = !!catalog.data?.order_window_open && currentSlots.length > 0;
  const membership = useQuery({queryKey:['shop','my-merchants',user?.id],queryFn:shopApi.myMerchants,enabled:isLoggedIn,retry:false});
  const cart = useQuery({ queryKey: ['shop', slug || 'water-home', user?.id, 'cart'], queryFn: shopApi.cart, enabled: isLoggedIn });
  const address = useQuery({ queryKey: ['shop', slug || 'water-home', user?.id, 'address'], queryFn: shopApi.address, enabled: isLoggedIn });
  const isCart = path === '/shop/cart';
  const isHistory = path === '/shop/orders';
  const orderId = path.match(/^\/shop\/orders\/(\d+)$/)?.[1];
  const productId = path.match(/^\/shop\/products\/(\d+)$/)?.[1];
  const history = useQuery({ queryKey: ['shop', slug || 'water-home', user?.id, 'orders', page], queryFn: () => shopApi.orders(page), enabled: isLoggedIn && isHistory });
  const order = useQuery({ queryKey: ['shop', slug || 'water-home', user?.id, 'order', orderId], queryFn: () => shopApi.order(orderId), enabled: isLoggedIn && !!orderId, refetchInterval: 15000 });
  const showSuccess = !!order.data && String(location.state?.paymentProofSuccess) === orderId && order.data.status === 'pending_verification';
  const refresh = () => qc.invalidateQueries({ queryKey: ['shop'] });
  const update = useMutation({ mutationFn: ({ id, count }) => shopApi.setQuantity(id, count), onSuccess: refresh, onError: e => setNotice(e.message) });
  const reorder = useMutation({ mutationFn: shopApi.reorder, onSuccess: changes => {
    refresh(); setNotice(changes.some(c => c.added < c.requested) ? t('部分商品库存不足，已加入可购数量，请核对。', 'Some items were unavailable. Please review the cart.') : t('已加入购物车，请确认最新价格与时段。', 'Added to cart. Review current prices and delivery.')); navigate(`${base}/cart`);
  }, onError: e => setNotice(e.message) });
  const items = cart.data?.items || [];
  const add = (p, n = 1, event) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    const image = event?.currentTarget.closest('article')?.querySelector('img');
    const origin = image?.getBoundingClientRect();
    setCartFeedback('');
    update.mutate({ id: p.id, count: Math.min(99, (items.find(i => i.id === p.id)?.quantity || 0) + n) }, { onSuccess: () => {
      setCartFeedback(t('已加入购物车', 'Added to cart'));
      const target = cartIcon.current?.getBoundingClientRect();
      if (origin && target) setFlight({ id: crypto.randomUUID(), image: shopImageUrl(p.image_url), origin: { x: origin.x + origin.width / 2, y: origin.y + origin.height / 2 }, target: { x: target.x + target.width / 2, y: target.y + target.height / 2 } });
    } });
  };
  const p = catalog.data?.products.find(p => String(p.id) === productId);
  const unavailable = p => p.sold_out || p.stock === 0 || p.price_cents <= 0 || p.deleted_at;
  const summary = o => <>
    <div className="shop-order-top"><strong>#{o.id}</strong><span className="shop-status">{o.status==='pending_verification'&&o.has_proof===0?t('待付款','Awaiting payment'):statuses[o.status]?.[isZh ? 0 : 1]}</span></div>
    <p>{o.slot_json.delivery_date} · {field(o.slot_json, 'label')} · {o.address_json.building} / {o.address_json.room}</p>
    {o.items_json.map(i => <div className="shop-line" key={i.product_id}><span>{field(i, 'name')} · {field(i, 'spec')} × {i.quantity}</span><strong>{money(i.price_cents * i.quantity)}</strong></div>)}
    <ShopOrderAmounts order={o} isZh={isZh}/>
  </>;
  return <section className="shop-page">
    <ShopCartFlight flight={flight} />
    <span className="shop-cart-feedback" role="status" aria-live="polite">{cartFeedback}</span>
    <header className="shop-heading"><div><span className="shop-eyebrow">XMUM DORM</span><h1><Droplets size={26} />{field(catalog.data?.merchant,'name')||t('订水 / 超市', 'Water & groceries')}</h1></div><Link to={`${base}/cart`} ref={cartIcon} className="shop-cart-link"><ShoppingCart size={20} />{items.reduce((n,i) => n+i.quantity,0)}</Link></header>
    <Link to="/shop">{t("全部商户","All stores")}</Link><nav className="shop-tabs" aria-label={t('商城导航', 'Shop navigation')}><Link to={base}>{t('逛超市', 'Shop')}</Link><Link to={`${base}/cart`}>{t('购物车', 'Cart')}</Link><Link to={`${base}/orders`}>{t('我的订单', 'Orders')}</Link>{membership.data?.some(store=>store.slug===slug) && <Link to={`${base}/manage`}>{t('商家管理', 'Manage')}</Link>}</nav>
    {notice && <div className="shop-notice" role="status">{notice}<Button variant="ghost" size="sm" onClick={() => setNotice('')}>{t('关闭', 'Close')}</Button></div>}
    {catalog.isLoading && <p role="status">{t('加载商品中…', 'Loading products…')}</p>}
    {catalog.error && <p role="alert">{catalog.error.message}<Button onClick={() => catalog.refetch()}>{t('重试', 'Retry')}</Button></p>}
    {(!isLoggedIn && (isCart || isHistory || orderId)) ? <p><Link to="/login">{t('登录现有账号继续', 'Sign in to continue')}</Link></p> : isCart ? <>
      <h2>{t('购物车', 'Your cart')}</h2>
      {cart.isLoading && <p>{t('加载中…', 'Loading…')}</p>}{cart.error && <p role="alert">{cart.error.message}</p>}
      {!items.length && !cart.isLoading && <div className="shop-empty"><ShoppingCart /><p>{t('购物车还是空的', 'Your cart is empty')}</p><Link to={base}>{t('去选商品', 'Browse products')}</Link></div>}
      {items.map(i => <article className="shop-cart-row" key={i.id}><ShopImage src={i.image_url} alt={field(i, 'name')} /><div className="shop-grow"><Link to={`${base}/products/${i.id}`}>{field(i,'name')}</Link><p>{field(i,'spec')} · {i.price_cents?money(i.price_cents):t('价格待确认','Price pending')}</p>{unavailable(i) && <span className="shop-warning">{t('已售罄或已下架，请移除', 'Unavailable — remove item')}</span>}{i.quantity > i.stock && <span className="shop-warning">{t('库存已减少，请调整数量', 'Stock reduced — adjust quantity')}</span>}<div className="shop-quantity"><Button size="sm" variant="outline" disabled={update.isPending || i.quantity <= 1} aria-label={t('减少数量','Decrease quantity')} onClick={() => update.mutate({id:i.id,count:i.quantity-1})}>−</Button><span>{i.quantity}</span><Button size="sm" variant="outline" disabled={update.isPending || unavailable(i) || i.quantity >= Math.min(i.stock,99)} aria-label={t('增加数量','Increase quantity')} onClick={() => update.mutate({id:i.id,count:i.quantity+1})}>+</Button><Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate({id:i.id,count:0})}>{t('移除', 'Remove')}</Button></div></div><strong>{money(i.price_cents*i.quantity)}</strong></article>)}
      {pendingKey && !recovery.data?.id && <p role="status">{t('正在核对上次下单结果，请稍候；也可查看订单历史。','Checking the previous checkout result. You can also check order history.')}</p>}
      {!!items.length && <><div className="shop-total"><span>{t('商品合计', 'Subtotal')}</span><strong>{money(cart.data.total_cents)}</strong></div>{address.isLoading ? <p>{t('加载收货信息…','Loading address…')}</p> : address.error ? <p role="alert">{address.error.message}<Button onClick={() => address.refetch()}>{t('重试','Retry')}</Button></p> : <Checkout shopApi={shopApi} key={user.id} savedAddress={address.data} user={user} total={cart.data.total_cents} cartSignature={JSON.stringify(items.map(i=>[i.id,i.quantity,i.price_cents]))} couponsEnabled={!!catalog.data?.coupons_enabled} slots={currentSlots} orderWindowOpen={orderWindowOpen} hasScheduledSlots={!!catalog.data?.has_scheduled_slots} settings={catalog.data?.settings} blocked={update.isPending || items.some(i => unavailable(i) || i.quantity > i.stock)} isZh={isZh} pendingKey={recovery.data?.id ? null : pendingKey} rememberRequest={rememberRequest} onSuccess={o => { rememberRequest(null); refresh(); if (completedRequest.current === o.id) return; completedRequest.current = o.id; navigate(`${base}/orders/${o.id}`, { replace: true }); }} onRefresh={refresh} />}</>}
    </> : isHistory ? <><h2>{t('订单历史', 'Order history')}</h2>{history.isLoading && <p>{t('加载中…','Loading…')}</p>}{history.error && <p role="alert">{history.error.message}</p>}{history.data?.orders.length === 0 && <div className="shop-empty"><Package /><p>{t('还没有订单', 'No orders yet')}</p></div>}{history.data?.orders.map(o => <article className="shop-order" key={o.id}>{summary(o)}<div className="shop-actions"><Link to={`${base}/orders/${o.id}`}>{t('订单详情', 'View order')}</Link><Button variant="outline" disabled={reorder.isPending} onClick={() => reorder.mutate(o.id)}>{t('再来一单', 'Order again')}</Button></div></article>)}<div className="shop-actions"><Button variant="outline" disabled={page===1} onClick={() => setPage(page-1)}>{t('上一页','Previous')}</Button><span>{page}</span><Button variant="outline" disabled={!history.data?.has_more} onClick={() => setPage(page+1)}>{t('下一页','Next')}</Button></div></> : orderId ? <>
      {!showSuccess && <h2>{t('订单详情', 'Order details')}</h2>}{order.isLoading && <p>{t('加载中…','Loading…')}</p>}{order.error && <p role="alert">{order.error.message}</p>}{showSuccess ? <ShopOrderSuccess order={order.data} merchant={catalog.data?.merchant} isZh={isZh} onView={() => navigate(`${base}/orders/${orderId}`, { replace: true, state: null })} onContinue={() => navigate(base, { replace: true })} /> : order.data && <article className="shop-order">{summary(order.data)}<p>{order.data.address_json.contact_name} · {order.data.address_json.contact}</p><h3>{t('订单付款', 'Order payment')}</h3><PaymentPanel api={shopApi} order={order.data} isZh={isZh} onRefresh={refresh} onUploaded={() => navigate(`${base}/orders/${orderId}`, { replace: true, state: { paymentProofSuccess: order.data.id } })} /><p>{t('可在本页查看订单进度；如需帮助，请联系商家并提供订单号。', 'Track your order here. For help, contact the merchant with your order number.')}</p><Button variant="outline" disabled={reorder.isPending} onClick={() => reorder.mutate(order.data.id)}>{t('再来一单', 'Order again')}</Button></article>}
    </> : productId ? p ? <><Link to={base}><ArrowLeft size={16} />{t('返回商品', 'Back to shop')}</Link><article className="shop-detail"><ShopImage src={p.image_url} alt={field(p,'name')} /><div><span className="shop-eyebrow">{categories[p.category]?.[isZh ? 0 : 1]}</span><h2>{field(p,'name')}</h2><p>{field(p,'spec')}</p><strong className="shop-price">{p.price_cents?money(p.price_cents):t('价格待确认','Price pending')}</strong><p className="shop-preserve">{field(p,'description')}</p><p>{t('库存', 'Stock')}: {p.stock}</p><Input id="shop-detail-quantity" label={t('数量', 'Quantity')} type="number" min="1" max={Math.min(99,p.stock)} value={quantity} onChange={e => setQuantity(Number(e.target.value))} /><Button disabled={unavailable(p) || update.isPending || !Number.isInteger(quantity) || quantity<1 || quantity>Math.min(99,p.stock)} onClick={event => add(p,quantity,event)}>{unavailable(p) ? t('售罄', 'Sold out') : t('加入购物车', 'Add to cart')}</Button></div></article></> : !catalog.isLoading && <p>{t('商品不存在','Product not found')}</p> : <>
      {catalog.data?.settings && <section className="shop-order"><h2>{t('付款方式与收款码','Payment methods & QR codes')}</h2>{orderWindowOpen&&parseJsonArray(catalog.data.settings.payment_methods).length ? <><p className="shop-warning">{t('提交订单后，按订单应付金额扫码付款并上传付款截图。','After placing your order, scan the QR code to pay the amount due and upload your receipt.')}</p>{parseJsonArray(catalog.data.settings.payment_methods).map(m=><p key={m.id}>{field(m,'name')}</p>)}</> : <p role="status">{!orderWindowOpen ? t('当前不在商家开放的下单时段内，暂不可下单或查看收款码。','Ordering is currently outside the merchant’s open period. Checkout and payment QR codes are unavailable.') : t('商家尚未添加收款方式，暂不能下单。','The merchant has not added a payment method yet; checkout is unavailable.')}</p>}</section>}
      <Input id="shop-search" label={t('搜索商品', 'Find a product')} value={search} placeholder={t('矿泉水、饮料、零食…', 'Water, drinks, snacks…')} onChange={e => setSearch(e.target.value)} />
      <div className="shop-categories"><Button variant={category==='all'?'primary':'outline'} size="sm" onClick={() => setCategory('all')}>{t('全部', 'All')}</Button>{Object.entries(categories).map(([key,label]) => <Button key={key} size="sm" variant={category===key?'primary':'outline'} onClick={() => setCategory(key)}>{label[isZh?0:1]}</Button>)}</div>
      <div className="shop-grid">{catalog.data?.products.filter(p => (category==='all'||category===p.category) && `${p.name_zh} ${p.name_en}`.toLowerCase().includes(search.toLowerCase())).map(p => <article className="shop-product" key={p.id}><Link to={`${base}/products/${p.id}`}><div className="shop-product-image"><ShopImage src={p.image_url} alt={field(p,'name')} loading="lazy" /></div><h2>{field(p,'name')}</h2><p>{field(p,'spec')}</p></Link><div className="shop-product-bottom"><strong>{p.price_cents?money(p.price_cents):t('价格待确认','Price pending')}</strong><span>{t('库存','Stock')} {p.stock}</span></div><Button block variant="outline" disabled={unavailable(p) || update.isPending} onClick={event => add(p,1,event)}>{unavailable(p) ? t('已售罄','Sold out') : t('加入购物车','Add to cart')}</Button></article>)}</div>
      {catalog.data && !catalog.data.products.some(p => (category==='all'||category===p.category) && `${p.name_zh} ${p.name_en}`.toLowerCase().includes(search.toLowerCase())) && <p>{t('没有匹配商品','No matching products')}</p>}
    </>}
  </section>;
}

function Checkout({ shopApi, savedAddress, user, total, cartSignature, couponsEnabled, slots, orderWindowOpen, hasScheduledSlots, settings, blocked, isZh, pendingKey, rememberRequest, onSuccess, onRefresh }) {
  const t = (zh,en) => isZh ? zh : en;
  const [address, setAddress] = useState(savedAddress || { contact_name: user.nickname || user.username || '', contact: user.email || '', building: '', room: '' });
  const [slotId, setSlotId] = useState('');
  useEffect(() => {
    if (slots.length === 1) setSlotId(String(slots[0].id));
    else if (slotId && !slots.some(slot => slot.id === Number(slotId))) setSlotId('');
  }, [slots, slotId]);
  const [method,setMethod]=useState('');
  const methods=parseJsonArray(settings?.payment_methods);
  useEffect(() => {
    setMethod(current => methods.some(item => item.id === current) ? current : (methods.length === 1 ? methods[0].id : ''));
  }, [methods]);
  const deliveryFee=0;
  const [couponCode,setCouponCode]=useState('');
  const [applied,setApplied]=useState(null);
  const [uncertain,setUncertain]=useState(false);
  const pricingSignature=JSON.stringify([total,cartSignature,slotId,method,couponCode.trim().toUpperCase()]);
  const validQuote=couponsEnabled&&applied?.signature===pricingSignature?applied.data:null;
  const needsQuote=!!couponCode.trim()&&!validQuote;
  const payable=validQuote?.total_cents??total+deliveryFee;
  const [error, setError] = useState('');
  const request = useRef(null);
  const submitting = useRef(false);
  const quote=useMutation({mutationFn:({body})=>shopApi.quote(body),onSuccess:(data,variables)=>{setApplied({data,signature:variables.signature});setError('');},onError:e=>{setApplied(null);setError(e.message);}});
  const checkout = useMutation({ mutationFn: ({body,key}) => shopApi.checkout(body,key), onSuccess: result => { request.current=null;setUncertain(false);onSuccess(result.order); }, onError: e => { setError(e.message); if (e.status && e.status < 500) { request.current=null;setUncertain(false);setApplied(null);rememberRequest(null);onRefresh(); }else setUncertain(true); } });
  const submit = async e => {
    e.preventDefault(); if (submitting.current || (!uncertain&&needsQuote)) return;
    const body = uncertain&&request.current?.body ? request.current.body : { address, slot_id:Number(slotId), expected_total_cents: payable, payment_method:method||null,...(couponCode.trim()?{coupon_code:couponCode.trim().toUpperCase()}:{}) };
    const signature = JSON.stringify(body);
    if (!request.current) request.current = { signature, body:structuredClone(body), key:pendingKey || crypto.randomUUID() };
    rememberRequest(request.current.key);
    // Retain the same key after network errors; a retry may refer to an already committed order.
    submitting.current=true; setError('');
    try { await checkout.mutateAsync({body,key:request.current.key}); } catch { /* mutation exposes the error */ } finally { submitting.current=false; }
  };
  const selectedSlot=slots.find(s=>s.id===Number(slotId));
  return <form className="shop-checkout" onSubmit={submit}><h2>{t('收货与配送', 'Delivery details')}</h2><p>{t('已保存的信息会自动带入，下单后保存本次收货信息。商家按你填写的宿舍楼和房间配送。', 'Saved details are filled automatically. The merchant delivers to the building and room you enter.')}</p><div className="shop-form-grid">{[['contact_name','联系人','Name',100],['contact','联系方式（电话 / WhatsApp / 邮箱）','Contact (phone / WhatsApp / email)',120],['building','宿舍楼','Dorm building',40],['room','房间号','Room',30]].map(([key,zh,en,max]) => <Input key={key} id={`shop-${key}`} label={t(zh,en)} required maxLength={max} value={address[key]} disabled={checkout.isPending||uncertain} onChange={e => setAddress({...address,[key]:e.target.value})} />)}</div><label className="shop-field" htmlFor="shop-slot">{t('商家开放的配送日期与时段（校园时间 UTC+8）', 'Merchant-opened delivery date and period (campus time UTC+8)')}<select id="shop-slot" required value={slotId} disabled={checkout.isPending||uncertain} onChange={e=>setSlotId(e.target.value)}><option value="">{t('请选择可下单日期', 'Select an available order date')}</option>{slots.map(s => <option key={s.id} value={s.id}>{s.delivery_date} · {localized(s,'label',isZh)}</option>)}</select></label>{selectedSlot&&<p className="shop-preserve">{t('仅在商家指定的日期和时段内可下单。','Ordering is available only during the merchant’s specified date and time.')}</p>}{!slots.length && <p role="status">{orderWindowOpen ? t('商家当前没有可下单日期。','There are no orderable dates right now.') : hasScheduledSlots ? t('现在不在商家开放的下单时段内，暂时不能下单。','It is currently outside the merchant’s open ordering hours.') : t('商家尚未开放可下单日期。','The merchant has not opened any order dates.')}</p>}{orderWindowOpen&&<><label className="shop-field">{t('付款方式','Payment method')}<select disabled={checkout.isPending||uncertain} required={!!methods.length} value={method} onChange={e => setMethod(e.target.value)}><option value="">{t('请选择付款方式','Choose payment method')}</option>{methods.map(m => <option key={m.id} value={m.id}>{localized(m,'name',isZh)}</option>)}</select></label><p>{t('提交订单并固定金额后显示收款码，请按订单金额付款。','The QR code appears after the order amount is fixed. Pay the amount on your order.')}</p>{!methods.length&&<p className="shop-warning" role="status">{t('商家尚未添加收款方式，暂不能下单。请商家上传并核对真实收款码。','The merchant has not added a payment method yet. Checkout is unavailable until a real payment QR is uploaded and verified.')}</p>}</>}<p>{t('配送费','Delivery fee')}: {money(deliveryFee)}</p>{localized(settings,'payment',isZh)&&<p className="shop-preserve">{localized(settings,'payment',isZh)}</p>}{(couponsEnabled||couponCode)&&<div className="shop-coupon-entry"><Input id="shop-coupon" label={t('优惠码（选填）','Coupon code (optional)')} value={couponCode} maxLength={24} disabled={checkout.isPending||uncertain} onChange={e=>{setCouponCode(e.target.value);setApplied(null);}}/><div className="shop-actions"><Button type="button" variant="outline" loading={quote.isPending} disabled={!couponsEnabled||!couponCode.trim()||!slotId||blocked||checkout.isPending||uncertain} onClick={()=>quote.mutate({body:{coupon_code:couponCode.trim(),slot_id:Number(slotId),payment_method:method||null},signature:pricingSignature})}>{t('应用优惠','Apply code')}</Button><Button type="button" variant="outline" disabled={checkout.isPending||uncertain||!couponCode} onClick={()=>{setCouponCode('');setApplied(null);setError('');}}>{t('移除优惠','Remove code')}</Button></div>{needsQuote&&<p role="status">{t('请先应用优惠码；购物车或付款选择变化后需要重新验证。','Apply the code first. Verify again after cart or payment choices change.')}</p>}{validQuote&&<ShopOrderAmounts isZh={isZh} order={{...validQuote,coupon_json:validQuote.coupon}}/>}</div>}{uncertain&&<p role="alert">{t('上次下单结果尚未确认，正在查询。请勿更改内容；可用原请求重试。','The last result is unknown and is being checked. Keep the same details; retry uses the original request.')}</p>}{error && <p role="alert" className="shop-warning">{error}</p>}<Button type="submit" loading={checkout.isPending} disabled={!uncertain&&(needsQuote||quote.isPending||!orderWindowOpen || blocked || !slots.some(s => s.id===Number(slotId)) || !settings || !methods.length || !method)}>{t('提交订单 · ', 'Place order · ')}{money(payable)}</Button><p>{t('提交订单后完成付款，并上传付款截图。', 'Complete payment and upload your receipt after placing the order.')}</p></form>;
}
