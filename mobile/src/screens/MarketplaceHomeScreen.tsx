import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, Image, FlatList, TextInput,
  StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet } from '../api/client';

const API = 'http://10.72.10.97:4040';

interface Props {
  onDetail: (id: number) => void;
  onPublish: () => void;
  onMyWants: () => void;
}

export default function MarketplaceHomeScreen({ onDetail, onPublish, onMyWants }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catSlug, setCatSlug] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [q, setQ] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [appliedMin, setAppliedMin] = useState('');
  const [appliedMax, setAppliedMax] = useState('');
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    apiGet('/api/marketplace/categories').then((r) => {
      if (r.status === 0) setCategories(r.data || []);
    });
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (catSlug !== 'all') params.set('category', catSlug);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (q) params.set('q', q);
    if (appliedMin) params.set('priceMin', appliedMin);
    if (appliedMax) params.set('priceMax', appliedMax);
    params.set('pageSize', '30');
    const qs = params.toString();
    const r = await apiGet(`/api/marketplace/items${qs ? `?${qs}` : ''}`);
    if (r.status === 0) setItems(r.data?.list || []);
    setLoading(false);
  }, [catSlug, statusFilter, q, appliedMin, appliedMax]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const applyFilters = () => {
    setAppliedMin(priceMin);
    setAppliedMax(priceMax);
    setFilterVisible(false);
  };

  const prefixImg = (url: string) => url?.startsWith('http') ? url : `${API}${url}`;

  function fmtTime(ts: string) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return d.toLocaleDateString();
  }

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🛒 二手</Text>
        <View style={s.headerBtns}>
          <Pressable onPress={() => setSearchVisible(true)} style={s.iconBtn}><Text style={s.iconText}>🔍</Text></Pressable>
          <Pressable onPress={onMyWants} style={s.iconBtn}><Text style={s.iconText}>❤️</Text></Pressable>
          {isLoggedIn && (
            <Pressable onPress={onPublish} style={s.pubBtn}><Text style={s.pubBtnText}>+ 发布</Text></Pressable>
          )}
        </View>
      </View>

      {/* Categories */}
      <View style={s.catRow}>
        {categories.filter((c: any) => c.slug !== 'all').map((c: any) => (
          <Pressable key={c.slug} style={[s.catChip, catSlug === c.slug && s.catChipActive]} onPress={() => setCatSlug(c.slug === catSlug ? 'all' : c.slug)}>
            <Text style={[s.catText, catSlug === c.slug && s.catTextActive]}>{c.name_zh || c.slug}</Text>
          </Pressable>
        ))}
      </View>

      {/* Status + Filter bar */}
      <View style={s.filterRow}>
        {['all', 'on_sale', 'sold'].map((st) => (
          <Pressable key={st} style={[s.stChip, statusFilter === st && s.stChipActive]} onPress={() => setStatusFilter(st)}>
            <Text style={[s.stText, statusFilter === st && s.stTextActive]}>{st === 'all' ? '全部' : st === 'on_sale' ? '在售' : '已售'}</Text>
          </Pressable>
        ))}
        <Pressable style={s.filterBtn} onPress={() => setFilterVisible(true)}>
          <Text style={s.filterBtnText}>💰 价格</Text>
        </Pressable>
      </View>

      {/* Item list */}
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" /> : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onDetail(item.id)}>
              <Image source={{ uri: item.cover ? prefixImg(item.cover) : 'https://placehold.co/110/F1F5F9/94A3B8?text=NoImg' }} style={s.cover} />
              <View style={{ flex: 1 }}>
                <View style={s.cardTop}>
                  <Text style={[s.deliveryBadge, item.delivery_method === 'delivery' && s.deliveryBadgeBlue]}>{item.delivery_method === 'delivery' ? '配送' : '自取'}</Text>
                  <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                </View>
                <Text style={s.price}>RM {Number(item.price || 0).toFixed(2)}</Text>
                <View style={s.cardMeta}>
                  <Text style={s.meta}>{item.sellerName || '匿名'}</Text>
                  <Text style={s.meta}>👁 {item.views_count || 0}</Text>
                </View>
                <Text style={s.time}>{fmtTime(item.created_at)}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>暂无商品</Text>}
        />
      )}

      {/* Search modal */}
      <Modal visible={searchVisible} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.searchBox}>
            <TextInput style={s.searchInput} value={searchQ} onChangeText={setSearchQ} placeholder="搜索商品..." placeholderTextColor="#94a3b8" autoFocus />
            <Pressable onPress={() => { setQ(searchQ); setSearchVisible(false); }} style={s.searchBtn}><Text style={s.searchBtnText}>搜索</Text></Pressable>
            <Pressable onPress={() => { setSearchQ(''); setQ(''); setSearchVisible(false); }} style={s.cancelBtn}><Text style={s.cancelBtnText}>取消</Text></Pressable>
          </View>
        </View>
      </Modal>

      {/* Price filter modal */}
      <Modal visible={filterVisible} animationType="fade" transparent>
        <View style={s.modalBg}>
          <View style={s.filterBox}>
            <Text style={s.filterTitle}>价格筛选</Text>
            <View style={s.filterRow2}>
              <TextInput style={s.filterInput} value={priceMin} onChangeText={setPriceMin} placeholder="最低价" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              <Text style={{ color: '#94a3b8' }}>—</Text>
              <TextInput style={s.filterInput} value={priceMax} onChangeText={setPriceMax} placeholder="最高价" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
            </View>
            <View style={s.filterBtns}>
              <Pressable onPress={() => { setPriceMin(''); setPriceMax(''); setAppliedMin(''); setAppliedMax(''); setFilterVisible(false); }} style={s.clearBtn}><Text style={s.clearBtnText}>清除</Text></Pressable>
              <Pressable onPress={applyFilters} style={s.applyBtn}><Text style={s.applyBtnText}>应用</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { padding: 4 },
  iconText: { fontSize: 18 },
  pubBtn: { backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  pubBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  catRow: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: '#fff', flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  catChipActive: { backgroundColor: '#0f172a' },
  catText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  catTextActive: { color: '#fff' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 8, backgroundColor: '#fff', alignItems: 'center' },
  stChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#f1f5f9' },
  stChipActive: { backgroundColor: '#0f172a' },
  stText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  stTextActive: { color: '#fff' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#fef3c7' },
  filterBtnText: { fontSize: 11, color: '#d97706', fontWeight: '600' },

  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  cover: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#f1f5f9' },
  cardTop: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  deliveryBadge: { fontSize: 10, color: '#16a34a', backgroundColor: '#f0fdf4', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden', fontWeight: '600' },
  deliveryBadgeBlue: { color: '#2563eb', backgroundColor: '#eff6ff' },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', lineHeight: 19 },
  price: { fontSize: 16, fontWeight: '800', color: '#ef4444', marginTop: 4 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  meta: { fontSize: 11, color: '#94a3b8' },
  time: { fontSize: 10, color: '#cbd5e1', marginTop: 2 },

  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },

  // Modals
  modalBg: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  searchBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  searchInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#0f172a', marginBottom: 12 },
  searchBtn: { backgroundColor: '#0f172a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: '#94a3b8', fontSize: 14 },

  filterBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  filterTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 14 },
  filterRow2: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
  filterInput: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#0f172a' },
  filterBtns: { flexDirection: 'row', gap: 10 },
  clearBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  clearBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  applyBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center' },
  applyBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
