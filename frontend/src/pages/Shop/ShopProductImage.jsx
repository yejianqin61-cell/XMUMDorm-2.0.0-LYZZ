import { useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { createShopApi } from '@shared/api/shop';
import { isShopImageFile } from './shopUploadFile';
import Button from '../../components/ui/Button';
import ShopImage, { ShopImagePreview } from './ShopImage';

export default function ShopProductImage({ slug, value, onChange, isZh, payment = false, onUploadStateChange }) {
  const input=useRef(null),[dragging,setDragging]=useState(false),[error,setError]=useState('');
  const [previewOpen,setPreviewOpen]=useState(false);
  const api=createShopApi(slug);
  const upload=useMutation({mutationFn:payment?api.uploadPaymentImage:api.uploadProductImage,onMutate:()=>onUploadStateChange?.(true),onSettled:()=>onUploadStateChange?.(false),onSuccess:r=>{onChange(r.url);setError('');},onError:e=>setError(e.message)});
  const t=(a,b)=>isZh?a:b;
  const pick=file=>{if(!file||upload.isPending)return;if(file.size>5*1024*1024){setError(t('图片不能超过5MB','Maximum image size is 5MB'));return;}if(!isShopImageFile(file,payment)){setError(t('请选择 JPG、PNG 或 WebP 图片，HEIC 请先转为 JPG。','Choose JPG, PNG, or WebP. Convert HEIC to JPG first.'));return;}setError('');upload.mutate(file);};
  return <div className="shop-image-upload">
    <span className="ui-field__label">{payment?t('收款码图片（支付链接可替代）','Payment QR image (optional if a payment link is set)'):t('商品图片','Product image')} {!payment&&'*'}</span>
    <button type="button" className={`shop-image-drop${dragging?' is-dragging':''}`} disabled={upload.isPending} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);pick(e.dataTransfer.files?.[0]);}} aria-label={payment?t('拖拽收款码或点击选择图片','Drop a payment QR or choose an image'):t('拖拽商品图片到此处，或点击选择图片','Drop product image here or click to choose')}>
      {value?<ShopImage preview={false} src={value} alt={payment?t('收款码预览','Payment QR preview'):t('商品图片预览','Product preview')}/>:<><ImagePlus size={34}/><strong>{t('拖拽图片到这里','Drop an image here')}</strong><span>{t('或点击选择图片（最大5MB）','or click to choose (up to 5MB)')}</span></>}
    </button>
    <input ref={input} hidden type="file" accept={payment?'image/*,.jpg,.jpeg,.png,.webp,.avif':'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'} onChange={e=>{pick(e.target.files?.[0]);e.target.value='';}}/>
    <input type="hidden" required={!payment} value={value||''} readOnly aria-label={t('已上传的图片','Uploaded image')}/>
    {upload.isPending&&<p role="status">{t('正在上传图片…','Uploading image…')}</p>}
    {error&&<p role="alert">{error}</p>}
    <div className="shop-image-actions"><Button type="button" variant="outline" disabled={upload.isPending} onClick={()=>input.current?.click()}><Upload size={16}/>{t('选择图片','Choose image')}</Button>{value&&<><Button type="button" variant="outline" onClick={()=>setPreviewOpen(true)}>{t('预览图片','Preview image')}</Button><Button type="button" variant="ghost" disabled={upload.isPending} onClick={()=>{setPreviewOpen(false);onChange('');if(input.current)input.current.value='';}}><X size={16}/>{t('移除图片','Remove image')}</Button></>}</div>
    {previewOpen&&value&&<ShopImagePreview src={value} onClose={()=>setPreviewOpen(false)}/>}
  </div>;
}
