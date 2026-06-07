import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Search, Globe, Bell } from 'lucide-react-native';

interface TreeholeToolbarProps {
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  keyword: string;
  setKeyword: (v: string) => void;
  langOpen: boolean;
  setLangOpen: (v: boolean) => void;
  lang: string;
  setLang: (v: 'zh' | 'en') => void;
  isZh: boolean;
  onSubmitSearch?: () => void;
}

export default function TreeholeToolbar({
  searchOpen, setSearchOpen, keyword, setKeyword,
  langOpen, setLangOpen, lang, setLang, isZh,
  onSubmitSearch,
}: TreeholeToolbarProps) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>XMUM Dorm</Text>
        <Text style={styles.tagline}>Discover campus life</Text>
      </View>

      <View style={styles.actions}>
        {searchOpen ? (
          <View style={styles.searchExpanded}>
            <Search size={18} color="#2563eb" strokeWidth={2.2} />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              placeholder={isZh ? '搜索…' : 'Search…'}
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => {
                onSubmitSearch?.();
                setSearchOpen(false);
              }}
            />
          </View>
        ) : (
          <Pressable style={styles.iconBtn} onPress={() => setSearchOpen(true)}>
            <Search size={18} color="#2563eb" strokeWidth={2.2} />
          </Pressable>
        )}

        <View>
          <Pressable style={styles.iconBtn} onPress={() => setLangOpen((v) => !v)}>
            <Globe size={18} color="#475569" strokeWidth={2.2} />
          </Pressable>
          {langOpen && (
            <View style={styles.langMenu}>
              <Pressable
                style={[styles.langItem, lang === 'zh' && styles.langItemActive]}
                onPress={() => { setLang('zh'); setLangOpen(false); }}
              >
                <Text style={[styles.langText, lang === 'zh' && styles.langTextActive]}>
                  中文 {lang === 'zh' ? '●' : ''}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.langItem, lang === 'en' && styles.langItemActive]}
                onPress={() => { setLang('en'); setLangOpen(false); }}
              >
                <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>
                  English {lang === 'en' ? '●' : ''}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable style={styles.iconBtn}>
          <Bell size={18} color="#94a3b8" strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  brandBlock: { flex: 1, paddingRight: 12 },
  brand: { fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  tagline: { marginTop: 4, fontSize: 12, fontWeight: '500', color: '#94a3b8' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 0.5, borderColor: 'rgba(226, 232, 240, 1)',
    backgroundColor: 'rgba(255,255,255,0.70)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchExpanded: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 44, minWidth: 160, paddingHorizontal: 12,
    borderRadius: 22, borderWidth: 0.5,
    borderColor: 'rgba(191, 219, 254, 0.7)',
    backgroundColor: 'rgba(255,255,255,0.80)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0 },
  langMenu: {
    position: 'absolute', top: 48, right: 0, zIndex: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16, padding: 4, minWidth: 140,
    borderWidth: 1, borderColor: 'rgba(226, 232, 240, 1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  langItem: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  langItemActive: { backgroundColor: '#f1f5f9' },
  langText: { fontSize: 14, color: '#475569' },
  langTextActive: { fontWeight: '700', color: '#0f172a' },
});
