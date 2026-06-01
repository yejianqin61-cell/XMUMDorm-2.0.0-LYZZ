import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import FoodDetailScreen from './FoodDetailScreen';

const API = 'http://10.72.10.97:4040';

export default function FoodListScreen({ region, onBack }: { region: any; onBack: () => void }) {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    apiGet(`/api/canteen/shops?region_id=${region.id}`).then((d) => {
      if (d.status === 0) setShops(d.data?.list || d.data || []);
      setLoading(false);
    });
  }, [region.id]);

  const openShop = async (shop: any) => {
    setSelectedShop(shop);
    setShopLoading(true);
    const d = await apiGet(`/api/canteen/products?shop_id=${shop.id}`);
    if (d.status === 0) setProducts(d.data?.list || d.data || []);
    setShopLoading(false);
  };

  if (selectedProduct) return <FoodDetailScreen product={selectedProduct} onBack={() => setSelectedProduct(null)} />;

  // 店铺列表视图
  if (!selectedShop) {
    return (
      <SafeAreaView style={s.bg} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={onBack}><Text style={s.back}>← {region.name}</Text></Pressable>
        </View>
        {loading ? <ActivityIndicator style={{marginTop:40}} size="large" /> : (
          <FlatList
            data={shops}
            keyExtractor={(sh) => String(sh.id)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item: sh }) => (
              <Pressable style={s.shopCard} onPress={() => openShop(sh)}>
                <Text style={s.shopName}>{sh.name}</Text>
                {sh.description ? <Text style={s.shopDesc}>{sh.description}</Text> : null}
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // 商品列表视图
  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => { setSelectedShop(null); setProducts([]); }}>
          <Text style={s.back}>← {selectedShop.name}</Text>
        </Pressable>
      </View>
      {shopLoading ? <ActivityIndicator style={{marginTop:40}} size="large" /> : (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item: p }) => {
            const imgUrl = p.images?.[0]?.url
              ? (p.images[0].url.startsWith('http') ? p.images[0].url : `${API}${p.images[0].url}`)
              : null;
            return (
              <Pressable style={s.foodCard} onPress={() => setSelectedProduct(p)}>
                {imgUrl ? <Image source={{ uri: imgUrl }} style={s.foodImg} /> : <View style={s.foodImgPlace}><Text style={{fontSize:24}}>🍜</Text></View>}
                <Text style={s.foodName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.foodPrice}>RM {p.price || '--'}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  shopCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  shopDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  foodCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  foodImg: { width: '100%', height: 130, backgroundColor: '#f1f5f9' },
  foodImgPlace: { width: '100%', height: 130, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  foodName: { fontSize: 13, fontWeight: '600', color: '#0f172a', paddingHorizontal: 10, paddingTop: 8 },
  foodPrice: { fontSize: 12, color: '#16a34a', fontWeight: '600', paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2 },
});
