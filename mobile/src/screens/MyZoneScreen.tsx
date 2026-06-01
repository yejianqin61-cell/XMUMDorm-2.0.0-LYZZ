import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiGet } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { getLevelByExp, getExpProgress, getBadgeForLevel } from '../context/ExpFeedbackContext';


interface Props { onEditProfile: () => void; onAboutLevel?: () => void; onDiary?: () => void; onTodo?: () => void; onSchedule?: () => void; onAdmin?: () => void; onAboutProfile?: () => void; onAboutThanks?: () => void; onAboutInfo?: () => void; }

export default function MyZoneScreen({ onEditProfile, onAboutLevel, onDiary, onTodo, onSchedule, onAdmin, onAboutProfile, onAboutThanks, onAboutInfo }: Props) {
  const { user, isLoggedIn, isAdmin, isMerchant, displayName, logout } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  const [stats, setStats] = useState({ posts: 0, reviews: 0, favorites: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    setLoading(true);
    Promise.all([
      apiGet(`/api/users/${user.id}/profile?page=1&pageSize=1`),
      isMerchant ? Promise.resolve({}) : (apiGet('/api/canteen/my-reviews?page=1&pageSize=1').catch(() => ({}))),
      apiGet('/api/canteen/my-favorites?page=1&pageSize=1').catch(() => ({})),
    ]).then(([profile, reviews, favs]) => {
      setStats({
        posts: profile?.stats?.post_count ?? profile?.post_count ?? 0,
        reviews: reviews?.total ?? reviews?.pagination?.total ?? 0,
        favorites: favs?.total ?? favs?.pagination?.total ?? 0,
      });
    }).finally(() => setLoading(false));
  }, [isLoggedIn, user?.id]);

  const avatarUrl = user?.avatar
    ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar}`)
    : null;
  const level = user?.level || 1;
  const exp = user?.exp || 0;
  const levelProgress = getExpProgress(exp);
  const badgeInfo = getBadgeForLevel(level);

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── 头部卡片 ─── */}
        <View style={s.headerCard}>
          <View style={s.headerTop}>
            <View style={s.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPlace}><Text style={s.avatarPlaceText}>{(displayName[0] || '?').toUpperCase()}</Text></View>
              )}
            </View>
            <View style={s.headerInfo}>
              <View style={s.nameRow}>
                <Text style={s.displayName}>{displayName}</Text>
                <Text style={s.badgeEmoji}>{badgeInfo.emoji}</Text>
                <View style={s.levelBadge}><Text style={s.levelText}>Lv.{level}</Text></View>
              </View>
              <Text style={s.bio}>{badgeInfo.label} · {isZh ? '欢迎回来' : 'Welcome back'}</Text>
              {/* 经验进度条 */}
              <View style={s.expBar}>
                <View style={[s.expFill, { width: `${levelProgress.progress * 100}%` }]} />
              </View>
              <Text style={s.expText}>{levelProgress.exp - levelProgress.currentMin}/{levelProgress.nextMin} EXP</Text>
            </View>
          </View>

          {/* 三列统计 */}
          <View style={s.statsRow}>
            <Pressable style={s.statItem}>
              <Text style={s.statNum}>{stats.posts}</Text>
              <Text style={s.statLabel}>{isZh ? '帖子' : 'Posts'}</Text>
            </Pressable>
            <View style={s.statDivider} />
            <Pressable style={s.statItem}>
              <Text style={s.statNum}>{stats.reviews}</Text>
              <Text style={s.statLabel}>{isZh ? '点评' : 'Reviews'}</Text>
            </Pressable>
            <View style={s.statDivider} />
            <Pressable style={s.statItem}>
              <Text style={s.statNum}>{stats.favorites}</Text>
              <Text style={s.statLabel}>{isZh ? '收藏' : 'Favorites'}</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── 工具入口 ─── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isZh ? '工具' : 'Utilities'}</Text>
          <View style={s.grid2}>
            <ToolTile label={isZh ? '食堂' : 'Canteen'} emoji="🍽️" />
            <ToolTile label={isZh ? '课程表' : 'Schedule'} emoji="📅" onPress={onSchedule} />
            <ToolTile label={isZh ? '多年日记本' : 'Diary'} emoji="📖" onPress={onDiary} />
            <ToolTile label={isZh ? '待办事项' : 'To-do'} emoji="⭐" onPress={onTodo} />
            {isMerchant && <ToolTile label={isZh ? '店铺管理' : 'Store'} emoji="🏪" />}
          </View>
        </View>

        {/* ─── 更多 ─── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isZh ? '更多' : 'More'}</Text>
          <MoreRow label={isZh ? '关于我们' : 'About us'} emoji="ℹ️" onPress={onAboutProfile} />
          {onAboutLevel && <MoreRow label={isZh ? '等级体系' : 'Level System'} emoji="🎖️" onPress={onAboutLevel} />}
          <MoreRow label={isZh ? '特别鸣谢' : 'Thanks'} emoji="✨" onPress={onAboutThanks} />
          <MoreRow label={isZh ? '免责声明' : 'Disclaimer'} emoji="⚠️" onPress={onAboutInfo} />
          <MoreRow label={isZh ? '联系我们' : 'Contact'} emoji="📧" onPress={onAboutInfo} />
        </View>

        {/* ─── 管理员入口 ─── */}
        {isAdmin && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{isZh ? '管理' : 'Admin'}</Text>
            <MoreRow label={isZh ? '管理员后台' : 'Admin Panel'} emoji="⚙️" onPress={onAdmin} />
          </View>
        )}

        {/* ─── 底部按钮 ─── */}
        <View style={s.btnRow}>
          <Pressable onPress={onEditProfile} style={s.editBtn}>
            <Text style={s.editText}>{isZh ? '编辑资料' : 'Edit Profile'}</Text>
          </Pressable>
          <Pressable onPress={logout} style={s.logoutBtn}>
            <Text style={s.logoutText}>{isZh ? '退出登录' : 'Log out'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToolTile({ label, emoji, onPress }: { label: string; emoji: string; onPress?: () => void }) {
  return (
    <Pressable style={ts.tile} onPress={onPress}>
      <Text style={ts.emoji}>{emoji}</Text>
      <Text style={ts.label}>{label}</Text>
    </Pressable>
  );
}
function MoreRow({ label, emoji, onPress }: { label: string; emoji: string; onPress?: () => void }) {
  return (
    <Pressable style={ts.more} onPress={onPress}>
      <Text style={ts.moreEmoji}>{emoji}</Text>
      <Text style={ts.moreLabel}>{label}</Text>
      <Text style={ts.moreArrow}>›</Text>
    </Pressable>
  );
}
const ts = StyleSheet.create({
  tile: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 0.5, borderColor: '#e2e8f0' },
  emoji: { fontSize: 24 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155' },
  more: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9' },
  moreEmoji: { fontSize: 18, marginRight: 12 },
  moreLabel: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  moreArrow: { fontSize: 20, color: '#cbd5e1' },
});

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  headerCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarPlace: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarPlaceText: { fontSize: 24, fontWeight: '700', color: '#94a3b8' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  displayName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  badge: { fontSize: 16 },
  levelBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  levelText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  bio: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  expBar: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginBottom: 4 },
  expFill: { height: 4, backgroundColor: '#6366f1', borderRadius: 2 },
  expText: { fontSize: 10, color: '#94a3b8' },
  statsRow: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: '#f1f5f9' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statDivider: { width: 0.5, backgroundColor: '#f1f5f9' },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnRow: { flexDirection: 'row', gap: 12 },
  editBtn: { flex: 1, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  editText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  logoutBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#e2e8f0', paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
