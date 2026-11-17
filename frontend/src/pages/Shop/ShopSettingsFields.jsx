import ShopProductImage from './ShopProductImage';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const makeMethod = () => ({
 id: globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
 name_zh: '', name_en: '', qr_url: '', payment_url: '',
});

export default function ShopSettingsFields({draft,setDraft,isZh,slug,onUploadStateChange,uploading}){
 const t=(a,b)=>isZh?a:b;
 const methods=draft.payment_methods||[];
 const update=(index,field,value)=>setDraft(current=>({...current,payment_methods:(current.payment_methods||[]).map((row,i)=>i===index?{...row,[field]:value}:row)}));
 return <section aria-label={t('收款方式','Payment methods')}>
  <h3>{t('收款方式','Payment methods')}</h3>
  <p className="shop-preserve">{t('填写中英文名称，并上传二维码或填写 HTTPS 支付链接。链接会在订单支付页打开；请先确认链接指向可信的收款页面。','Enter Chinese and English names, then add a QR image or an HTTPS payment link. The link appears on the order payment page; verify that it points to a trusted payment page.')}</p>
  {methods.map((row,index)=><fieldset className="shop-order" key={row.id||index}>
   <Input id={`payment-${index}-name-zh`} label={t('中文名称','Chinese name')} required value={row.name_zh||''} onChange={e=>update(index,'name_zh',e.target.value)}/>
   <Input id={`payment-${index}-name-en`} label={t('英文名称','English name')} required value={row.name_en||''} onChange={e=>update(index,'name_en',e.target.value)}/>
   <ShopProductImage slug={slug} onUploadStateChange={onUploadStateChange} payment value={row.qr_url||''} isZh={isZh} onChange={value=>update(index,'qr_url',value)}/>
   <Input id={`payment-${index}-url`} label={t('支付链接（HTTPS，可选）','Payment link (HTTPS, optional)')} type="url" value={row.payment_url||''} placeholder="https://" onChange={e=>update(index,'payment_url',e.target.value)}/>
   <Button type="button" disabled={uploading} variant="outline" onClick={()=>setDraft(current=>({...current,payment_methods:(current.payment_methods||[]).filter((_,i)=>i!==index)}))}>{t('移除','Remove')}</Button>
  </fieldset>)}
  <Button type="button" disabled={uploading} variant="outline" onClick={()=>setDraft(current=>({...current,payment_methods:[...(current.payment_methods||[]),makeMethod()]}))}>{t('添加付款方式','Add payment method')}</Button>
 </section>;
}
