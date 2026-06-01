import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';


interface Props { onBack: () => void; }

export default function ProfileEditScreen({ onBack }: Props) {
  const { user, token, displayName, refreshUser } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const currentAvatar = avatarUri || (user?.avatar
    ? (user.avatar.startsWith('http') ? user.avatar : `${API}${user.avatar}`)
    : null);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('需要相册权限');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 更新昵称
      if (nickname.trim() && nickname.trim() !== (user?.nickname || '')) {
        await fetch(`${API}/api/users/me`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ nickname: nickname.trim() }),
        });
      }
      // 上传头像
      if (avatarUri) {
        setUploading(true);
        const form = new FormData();
        form.append('avatar', { uri: avatarUri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
        await fetch(`${API}/api/users/me/avatar`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: form,
        });
        setUploading(false);
      }
      await refreshUser?.();
      Alert.alert('保存成功', '', [{ text: '好的', onPress: onBack }]);
    } catch (e: any) {
      Alert.alert('保存失败', e.message || '请稍后重试');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={s.bg}>
      <View style={s.topbar}>
        <Pressable onPress={onBack}><Text style={s.backText}>← 返回</Text></Pressable>
        <Text style={s.title}>编辑资料</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.body}>
        {/* 头像 */}
        <Pressable onPress={pickAvatar} style={s.avatarSection}>
          <View style={s.avatarWrap}>
            {currentAvatar ? (
              <Image source={{ uri: currentAvatar }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarPlaceholder}>{(displayName[0] || '?').toUpperCase()}</Text>
            )}
          </View>
          <Text style={s.avatarHint}>点击更换头像</Text>
        </Pressable>

        {/* 昵称 */}
        <View style={s.field}>
          <Text style={s.label}>昵称</Text>
          <TextInput style={s.input} value={nickname} onChangeText={setNickname} placeholder="输入昵称" placeholderTextColor="#94a3b8" />
        </View>

        {/* 只读信息 */}
        <View style={s.field}>
          <Text style={s.label}>用户名</Text>
          <Text style={s.readonly}>@{user?.username || ''}</Text>
        </View>
        <View style={s.field}>
          <Text style={s.label}>邮箱</Text>
          <Text style={s.readonly}>{user?.email || '-'}</Text>
        </View>
        <View style={s.field}>
          <Text style={s.label}>角色</Text>
          <Text style={s.readonly}>{user?.role === 'admin' ? '管理员' : user?.role === 'merchant' ? '商家' : '学生'}</Text>
        </View>
        <View style={s.field}>
          <Text style={s.label}>等级</Text>
          <Text style={s.readonly}>Lv{user?.level || 1} · {user?.exp || 0} EXP</Text>
        </View>

        <Pressable onPress={handleSave} disabled={saving} style={[s.saveBtn, saving && { opacity: 0.5 }]}>
          {saving || uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>保存</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#f8fafc' },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  backText: { fontSize: 15, color: '#2563eb', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  body: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { fontSize: 28, fontWeight: '700', color: '#94a3b8' },
  avatarHint: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', backgroundColor: '#fff' },
  readonly: { fontSize: 15, color: '#94a3b8', paddingVertical: 4 },
  saveBtn: { marginTop: 20, backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
