import { API_BASE_URL } from './config';
import { request, getToken } from './request';
export function createShopApi(slug) {
const base = slug ? `/api/shop/stores/${encodeURIComponent(slug)}` : '/api/shop';
return {
  merchants: () => request('/api/shop/merchants'),
  myMerchants: () => request('/api/shop/my-merchants'),
  createOwnStore: body => request('/api/shop/my-stores',{method:'POST',body}),
  createMerchantAccount: body => request('/api/shop/merchant-accounts',{method:'POST',body}),
  createMerchant: body => request('/api/shop/merchants',{method:'POST',body}),
  deleteProof: id => request(`${base}/orders/${id}/proof`,{method:'DELETE'}),
  uploadPaymentImage: file => { const body=new FormData(); body.append('image',file); return request(`${base}/admin/payment-images`,{method:'POST',body}); },
  uploadProof: (id,file) => { const body=new FormData(); body.append('proof',file); return request(`${base}/orders/${id}/proof`,{method:'POST',body}); },
  receipt: async id => { const r=await fetch(`${API_BASE_URL}${base}/orders/${id}/proof`,{headers:{Authorization:`Bearer ${getToken()}`}}); if(!r.ok) throw new Error('无法读取付款截图 / Receipt unavailable'); return r.blob(); },
  proofUrl: id => `${base}/orders/${id}/proof`,
  catalog: () => request(`${base}/catalog`),
  cart: () => request(`${base}/cart`),
  address: () => request(`${base}/address`),
  requestOrder: key => request(`${base}/requests/${key}`),
  setQuantity: (id, quantity) => request(`${base}/cart/${id}`, { method: 'PUT', body: { quantity } }),
  checkout: (body, key) => request(`${base}/orders`, { method: 'POST', body, headers: { 'Idempotency-Key': key } }),
  orders: (page = 1) => request(`${base}/orders?page=${page}`),
  order: id => request(`${base}/orders/${id}`),
  reorder: id => request(`${base}/orders/${id}/reorder`, { method: 'POST', body: {} }),
  uploadProductImage: file => { const body=new FormData(); body.append('image',file); return request(`${base}/admin/product-images`,{method:'POST',body}); },
  products: () => request(`${base}/admin/products`),
  saveProduct: p => request(`${base}/admin/products/${p.id || 'new'}`, { method: 'PUT', body: p }),
  specialSlots: () => request(`${base}/admin/special-slots`),
  saveSpecialSlot: p => request(`${base}/admin/special-slots/${p.id || 'new'}`, { method: 'PUT', body: p }),
  settings: () => request(`${base}/admin/settings`),
  saveSettings: body => request(`${base}/admin/settings`, { method: 'PUT', body }),
  deleteMyStore: () => request(`${base}/admin/store`, { method: 'DELETE' }),
  adminStores: () => request('/api/shop/admin/stores'),
  deleteStore: id => request(`/api/shop/admin/stores/${id}`, { method: 'DELETE' }),
  adminOrders: filters => request(`${base}/admin/orders?${new URLSearchParams(Object.entries(filters).filter(([,v]) => v))}`),
  status: (id, status) => request(`${base}/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  quote: body => request(`${base}/checkout-quote`,{method:'POST',body}),
  coupons: (page=1) => request(`${base}/admin/coupons?page=${page}`),
  createCoupon: (body,key) => request(`${base}/admin/coupons`,{method:'POST',body,headers:{'Idempotency-Key':key}}),
  couponStatus: (id,status) => request(`${base}/admin/coupons/${id}/status`,{method:'PATCH',body:{status}}),
  couponRedemptions: (id,page=1) => request(`${base}/admin/coupons/${id}/redemptions?page=${page}`),
};
}
export const shopApi = createShopApi();
