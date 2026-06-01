import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Image, ScrollView, Alert,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../api/client';
import { fmtTime, prefixImg } from '../utils';


interface Props {
  clubId: number;
  onBack: () => void;
  onMembers: (id: number, name: string) => void;
  onActivity: (id: number) => void;
  onPost: (id: number) => void;
  onPublish: (clubId: number, type: 'activity' | 'post') => void;
}

export default function ClubProfileScreen({ clubId, onBack, onMembers, onActivity, onPost, onPublish }: Props) {
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const { user, isLoggedIn } = useAuth();

  const fetchClub = async () => {
    setLoading(true);
    const r = await apiGet(`/api/clubs/${clubId}`);
    if (r.status === 0) {
      setClub(r.data);
      setFollowing(r.data.is_following || false);
      setFollowersCount(r.data.followers_count || 0);
    }
    setLoading(false);
  };

  useEffect(() => { fetchClub(); }, [clubId]);

  const handleFollow = async () => {
    if (!isLoggedIn) { Alert.alert('请先登录'); return; }
    const prev = following;
    setFollowing(!following);
    setFollowersCount((c: number) => c + (following ? -1 : 1));
    try {
      const r = await apiPost(`/api/clubs/${clubId}/follow`);
      if (r.status === 0) { setFollowing(r.data?.following ?? !prev); setFollowersCount(r.data?.followers_count ?? (followersCount + (prev ? -1 : 1))); }
      else { setFollowing(prev); setFollowersCount((c: number) => c + (prev ? 1 : -1)); }
    } catch { setFollowing(prev); setFollowersCount((c: number) => c + (prev ? 1 : -1)); }
  };


  const isAdmin = user && club && (club.members || []).some((m: any) => m.user_id === user.id && m.role === 'admin');
  const canManage = isAdmin || user?.role === 'admin';
  const activities = (club?.activities || []).slice(0, 6);
  const posts = (club?.posts || []).slice(0, 6);
  const members = (club?.members || []);


  if (loading) return <SafeAreaView style={s.bg} edges={['top']}><View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>← 返回</Text></Pressable></View><ActivityIndicator style={{ marginTop: 60 }} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.bg} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onBack}><Text style={s.back}>← 社团</Text></Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{club?.name}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {/* Hero */}
        <View style={s.hero}>
          {club?.avatar ? (
            <Image source={{ uri: prefixImg(club.avatar) }} style={s.heroAvatar} />
          ) : (
            <View style={[s.heroAvatar, s.heroPlace]}><Text style={{ fontSize: 40 }}>🏛️</Text></View>
          )}
          <Text style={s.heroName}>{club?.name}</Text>
          {club?.category && <Text style={s.category}>{club.category}</Text>}
          <View style={s.followRow}>
            <Text style={s.followers}>🔥 {followersCount} 关注</Text>
            {isLoggedIn && (
              <Pressable onPress={handleFollow} style={[s.followBtn, following && s.followingBtn]}>
                <Text style={[s.followBtnText, following && s.followingBtnText]}>{following ? '已关注' : '+ 关注'}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Description & Contact */}
        {club?.description && <Text style={s.desc}>{club.description}</Text>}
        {(club?.contact_text || club?.ig || club?.xhs || club?.signup_link) && (
          <View style={s.contactBox}>
            {club.contact_text && <Text style={s.contact}>📞 {club.contact_text}</Text>}
            {club.ig && <Text style={s.contact}>📷 IG: {club.ig}</Text>}
            {club.xhs && <Text style={s.contact}>📕 小红书: {club.xhs}</Text>}
            {club.signup_link && <Text style={s.contact}>🔗 报名链接</Text>}
          </View>
        )}

        {/* Members preview */}
        {members.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>成员 ({members.length})</Text>
              <Pressable onPress={() => onMembers(clubId, club?.name)}><Text style={s.seeAll}>全部 ›</Text></Pressable>
            </View>
            <View style={s.memberRow}>
              {members.slice(0, 3).map((m: any) => (
                <View key={m.user_id} style={s.memberChip}>
                  {m.avatar ? <Image source={{ uri: prefixImg(m.avatar) }} style={s.memberAvatar} /> : <View style={[s.memberAvatar, s.memberPlace]}><Text>👤</Text></View>}
                  <Text style={s.memberName} numberOfLines={1}>{m.nickname || m.username || '匿名'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Admin actions */}
        {canManage && (
          <View style={s.adminRow}>
            <Pressable style={s.adminBtn} onPress={() => onPublish(clubId, 'activity')}><Text style={s.adminBtnText}>📅 发布活动</Text></Pressable>
            <Pressable style={s.adminBtn} onPress={() => onPublish(clubId, 'post')}><Text style={s.adminBtnText}>📝 发布日常</Text></Pressable>
          </View>
        )}

        {/* Activities */}
        {activities.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>近期活动</Text>
            {activities.map((a: any) => (
              <Pressable key={a.id} style={s.itemCard} onPress={() => onActivity(a.id)}>
                <Text style={s.itemTitle}>{a.title}</Text>
                {a.start_time && <Text style={s.itemMeta}>🕐 {fmtTime(a.start_time)}</Text>}
                {a.location && <Text style={s.itemMeta}>📍 {a.location}</Text>}
                <Text style={[s.itemStatus, a.status === 'ended' && { color: '#94a3b8' }]}>{a.status === 'ended' ? '已结束' : a.status === 'ongoing' ? '进行中' : '即将开始'}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Posts */}
        {posts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>近期日常</Text>
            {posts.map((p: any) => (
              <Pressable key={p.id} style={s.itemCard} onPress={() => onPost(p.id)}>
                <Text style={s.itemTitle}>{p.title || '无标题'}</Text>
                <Text style={s.itemMeta}>{fmtTime(p.created_at)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  back: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1, textAlign: 'center' },
  body: { padding: 16, paddingBottom: 40 },

  hero: { alignItems: 'center', paddingVertical: 20 },
  heroAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9' },
  heroPlace: { justifyContent: 'center', alignItems: 'center' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  category: { fontSize: 12, color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  followRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  followers: { fontSize: 13, color: '#64748b' },
  followBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 16, backgroundColor: '#0f172a' },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  followingBtn: { backgroundColor: '#f1f5f9' },
  followingBtnText: { color: '#64748b' },

  desc: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 14 },

  contactBox: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, marginBottom: 16 },
  contact: { fontSize: 13, color: '#334155', marginBottom: 4 },

  section: { marginTop: 18 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  seeAll: { fontSize: 13, color: '#2563eb' },

  memberRow: { flexDirection: 'row', gap: 10 },
  memberChip: { alignItems: 'center', flex: 1 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9' },
  memberPlace: { justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 11, color: '#64748b', marginTop: 4 },

  adminRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  adminBtn: { flex: 1, backgroundColor: '#0f172a', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  adminBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  itemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  itemMeta: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  itemStatus: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginTop: 2 },
});
