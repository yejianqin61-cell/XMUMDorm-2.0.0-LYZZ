import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { STORAGE_TOKEN } from '../context/AuthContext';

/** Attach EXP data from response to the returned business data */
function attachExp(businessData: any, exp: any): any {
  if (!exp || (exp.delta === 0 && !exp.levelUp)) return businessData;
  if (businessData && typeof businessData === 'object' && !Array.isArray(businessData)) {
    return { ...businessData, __exp: exp };
  }
  return businessData;
}

/** Parse response body safely: try JSON first, fall back with clear error */
async function safeJson(res: Response, url: string) {
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    const preview = raw.substring(0, 200);
    console.error(`[api] JSON parse failed for ${res.status} ${url}: ${preview}`);
    return { status: -1, message: `服务器响应异常 (${res.status}): ${preview}` };
  }
}

export async function apiGet(path: string) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await safeJson(res, url);
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}

export async function apiPost(path: string, body?: any) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const headers: any = {};
  const isFormData = body instanceof FormData;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });
  const data = await safeJson(res, url);
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}

export async function apiDelete(path: string) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await safeJson(res, url);
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}

export async function apiPatch(path: string, body?: any) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await safeJson(res, url);
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}
