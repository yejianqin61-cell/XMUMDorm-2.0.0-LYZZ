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

export async function apiGet(path: string) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}

export async function apiPost(path: string, body?: any) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const headers: any = {};
  const isFormData = body instanceof FormData;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });
  const data = await res.json();
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}

export async function apiDelete(path: string) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}

export async function apiPatch(path: string, body?: any) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.exp) return attachExp(data.data ?? data, data.exp);
  return data;
}
