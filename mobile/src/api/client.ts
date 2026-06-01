import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { STORAGE_TOKEN } from '../context/AuthContext';

export async function apiGet(path: string) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function apiPost(path: string, body?: any) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
  return res.json();
}

export async function apiDelete(path: string) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

export async function apiPatch(path: string, body?: any) {
  const token = await AsyncStorage.getItem(STORAGE_TOKEN);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return res.json();
}
