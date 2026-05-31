# React Native App 第一阶段详细开发计划

**项目：** Dorm · XMUMDorm-2.0.0-LYZZ  
**目标：** 搭建 Expo 项目 → 登录/注册 → 树洞首页/详情/发帖 → 实验性推送验证  
**预计工时：** 约 30 小时（5-6 天）  
**前置条件：** Node.js 18+、VS Code、一台手机（iPhone 或 Android，用于真机测试）

---

## 0. 开发环境准备（约 1.5h）

### 0.1 安装 Expo CLI

```bash
npm install -g expo-cli
```

### 0.2 创建项目

```bash
cd d:\.pogget\user_storage\u_a02ec0\d5cdb\XMUMDorm-2.0.0-LYZZ
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

### 0.3 安装核心依赖

```bash
npx expo install expo-router expo-blur expo-image-picker expo-notifications expo-device expo-status-bar @react-native-async-storage/async-storage react-native-reanimated react-native-safe-area-context react-native-screens react-native-gesture-handler
```

### 0.4 安装 UI 依赖

```bash
npm install lucide-react-native @tanstack/react-query
```

### 0.5 手机安装 Expo Go

- **iPhone：** App Store 搜索 "Expo Go"
- **Android：** Google Play 搜索 "Expo Go"

安装后用 `npx expo start` 启动，手机扫码即可实时预览。

### 0.6 配置 app.json

```json
{
  "expo": {
    "name": "Dorm",
    "slug": "dorm",
    "scheme": "dorm",
    "plugins": ["expo-router"],
    "ios": { "supportsTablet": true },
    "android": { "adaptiveIcon": { "backgroundColor": "#ffffff" } }
  }
}
```

---

## 1. 基础设施搭建（约 6h）

### 1.1 项目骨架（1h）

```
mobile/
├── app/
│   ├── _layout.js          # 根布局：Tab Navigator
│   ├── index.js            # 首页 → 树洞帖子列表
│   ├── login.js
│   ├── register.js
│   ├── post/
│   │   ├── new.js           # 发帖
│   │   └── [id].js          # 帖子详情
│   └── mailbox.js
├── src/
│   ├── api/                 # ← 从 frontend/src/api/ 复制
│   ├── context/             # ← 从 frontend/src/context/ 复制+适配
│   ├── utils/               # ← 从 frontend/src/utils/ 复制
│   ├── components/
│   │   └── ui/              # GlassView, Button, Input, Card
│   └── hooks/
├── assets/
│   └── default-avatar.svg   # 默认头像
├── app.json
└── package.json
```

### 1.2 搬运 API 层（0.5h）

直接从 `frontend/src/api/` 复制全部 20 个文件到 `mobile/src/api/`。

**唯一需要改的地方：`config.js` 中的 `API_BASE_URL`**

```ts
// mobile/src/api/config.ts
export const API_BASE_URL = 'http://192.168.1.xxx:4040'; // 你的电脑局域网 IP
// 生产环境改为 'https://api.dorm.app'
```

`request.js` 中的 `getToken()` 需要适配 RN：

```ts
// 改前（Web）
const token = localStorage.getItem('token');

// 改后（RN）
import AsyncStorage from '@react-native-async-storage/async-storage';
const token = await AsyncStorage.getItem('token');
```

### 1.3 搬运 Context 层（1h）

| 文件 | 改动 |
|------|------|
| `AuthContext.tsx` | `localStorage` → `AsyncStorage`，其余逻辑完全相同 |
| `LanguageContext.tsx` | 无需改动 |
| `ToastContext.tsx` | 换用 `react-native-root-toast` |
| `ExpFeedbackContext.tsx` | 无需改动 |

### 1.4 创建基础 UI 组件（2.5h）

#### 1.4.1 GlassView — 液态玻璃容器（0.5h）

```tsx
// mobile/src/components/ui/GlassView.tsx
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

export default function GlassView({ children, intensity = 20, style }) {
  return (
    <BlurView intensity={intensity} tint="light" style={[styles.base, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
```

> `BlurView` 在 Android 上效果较弱。Android 降级方案：半透明背景 + 白色边框。

#### 1.4.2 StyledButton（0.25h）

```tsx
// mobile/src/components/ui/StyledButton.tsx
import { Pressable, Text, StyleSheet } from 'react-native';

export default function StyledButton({ title, onPress, variant = 'primary', disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[styles.text, variant === 'primary' ? styles.primaryText : styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}
```

#### 1.4.3 StyledInput（0.25h）

```tsx
// mobile/src/components/ui/StyledInput.tsx
import { TextInput, StyleSheet, View, Text } from 'react-native';

export default function StyledInput({ label, value, onChangeText, placeholder, secureTextEntry }) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}
```

#### 1.4.4 Card（0.5h）

```tsx
// mobile/src/components/ui/Card.tsx
// 白色卡片容器，复用 Web 端 Card 组件的结构
import { View, StyleSheet } from 'react-native';

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
// styles.card: backgroundColor '#fff', borderRadius 20, padding 16, shadow...
```

#### 1.4.5 EmptyState / LoadingState（0.25h）

占位组件，加载中显示骨架/空列表显示提示。

#### 1.4.6 SkeletonCard（0.75h）

```tsx
// 骨架屏：灰色闪烁动画，等数据加载时显示
// 参考 Web 端 SkeletonPost.jsx 的样式
```

### 1.5 创建 Tab 导航（1h）

```tsx
// mobile/app/_layout.js
import { Tabs } from 'expo-router';
import { Home, UtensilsCrossed, LayoutGrid, User, Bell } from 'lucide-react-native';

export default function RootLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#0f172a', tabBarInactiveTintColor: '#94a3b8' }}>
      <Tabs.Screen name="index" options={{ title: '树洞', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} />
      <Tabs.Screen name="eat" options={{ title: '食堂', tabBarIcon: ({ color }) => <UtensilsCrossed color={color} size={22} /> }} />
      <Tabs.Screen name="square" options={{ title: '广场', tabBarIcon: ({ color }) => <LayoutGrid color={color} size={22} /> }} />
      <Tabs.Screen name="myzone" options={{ title: '我的', tabBarIcon: ({ color }) => <User color={color} size={22} /> }} />
      <Tabs.Screen name="mailbox" options={{ title: '信箱', tabBarIcon: ({ color }) => <Bell color={color} size={22} /> }} />
      {/* login 和 register 不放在 Tab 里 */}
    </Tabs>
  );
}
```

---

## 2. 登录/注册（约 4h）

### 2.1 登录页（2h）

```tsx
// mobile/app/login.js
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import GlassView from '../src/components/ui/GlassView';
import StyledInput from '../src/components/ui/StyledInput';
import StyledButton from '../src/components/ui/StyledButton';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    const result = await login(username, password);
    if (result.success) {
      router.replace('/');
    } else {
      Alert.alert('登录失败', result.message);
    }
  };

  return (
    <View style={styles.container}>
      <GlassView style={styles.card}>
        <Text style={styles.title}>Dorm</Text>
        <Text style={styles.subtitle}>厦马小筑</Text>
        <StyledInput label="学号/邮箱" value={username} onChangeText={setUsername} placeholder="请输入学号或邮箱" />
        <StyledInput label="密码" value={password} onChangeText={setPassword} placeholder="请输入密码" secureTextEntry />
        <StyledButton title="登 录" onPress={handleLogin} />
        <Link href="/register" style={styles.link}>没有账号？去注册</Link>
      </GlassView>
    </View>
  );
}
```

### 2.2 注册页（1.5h）

```tsx
// mobile/app/register.js
// 类似 login.js，额外字段：邮箱、验证码、角色选择
// 使用 fetch 调用 /api/auth/register
```

### 2.3 AuthContext 适配（0.5h）

```tsx
// mobile/src/context/AuthContext.tsx
// 核心改动：localStorage → AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const login = async (account, password) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, { ... });
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.data));
  setToken(data.token);
  setUser(data.data);
  return { success: true };
};

const logout = async () => {
  await AsyncStorage.multiRemove(['token', 'user']);
  setToken(null);
  setUser(null);
};

// 恢复登录态
useEffect(() => {
  AsyncStorage.getItem('token').then((t) => {
    if (t) { setToken(t); /* 同时拉取 /me */ }
  });
}, []);
```

---

## 3. 树洞模块（约 10h）

### 3.1 帖子列表页（3h）

```tsx
// mobile/app/index.js
import { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Text, StyleSheet } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPostList } from '../src/api/posts';
import PostCard from '../src/components/post/PostCard';
import SkeletonCard from '../src/components/ui/SkeletonCard';
import EmptyState from '../src/components/ui/EmptyState';

export default function TreeholeScreen() {
  const { data, fetchNextPage, hasNextPage, isFetching, refetch } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 1 }) => getPostList({ page: pageParam, pageSize: 20 }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const posts = data?.pages.flatMap((p) => p.list) ?? [];

  const renderItem = useCallback(({ item }) => <PostCard post={item} />, []);
  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        ListEmptyComponent={isFetching ? <SkeletonCard count={5} /> : <EmptyState title="暂无帖子" />}
      />
    </View>
  );
}
```

### 3.2 PostCard 组件（3h）

```tsx
// mobile/src/components/post/PostCard.tsx
// 1:1 复刻 Web 端 PostCard.jsx 的布局：
// - 头像 + 昵称 + 等级徽章
// - 正文（最多 3 行截断）
// - 图片轮播（如果有）
// - 底部：点赞数 + 评论数 + 时间
//
// RN 差异：
// - <img> → <Image source={{ uri: url }} />
// - 图片轮播用 FlatList horizontal
// - 卡片用 GlassView 包裹
```

**PostCard 布局结构：**

```
┌─────────────────────────────────────┐
│ 🔵 头像  用户名  Lv2              │
│         2 分钟前                    │
│                                     │
│ 今天在图书馆看到一只猫，好可爱...   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │        图片（如果有）            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ❤️ 12    💬 5    📅 2分钟前        │
└─────────────────────────────────────┘
```

### 3.3 帖子详情页（2.5h）

```tsx
// mobile/app/post/[id].js
// 1:1 复刻 Web 端 PostDetail.jsx：
// - 帖子内容 + 图片
// - 点赞按钮（toggle）
// - 评论列表（一级 + 二级）
// - 评论输入框
// - 发表评论
//
// 入口：点击 PostCard → router.push(`/post/${id}`)
```

### 3.4 发帖页（1.5h）

```tsx
// mobile/app/post/new.js
import { useState } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { createPost } from '../src/api/posts';
import { useAuth } from '../src/context/AuthContext';
import StyledButton from '../src/components/ui/StyledButton';

export default function NewPostScreen() {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const { token } = useAuth();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.8,
    });
    if (!result.canceled) setImages(result.assets.map((a) => a.uri));
  };

  const handleSubmit = async () => {
    if (!content.trim()) return Alert.alert('内容不能为空');
    const formData = new FormData();
    formData.append('content', content);
    images.forEach((uri, i) => {
      formData.append('images', { uri, type: 'image/jpeg', name: `photo_${i}.jpg` });
    });
    await createPost(token, formData);
    router.back();
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} value={content} onChangeText={setContent}
        placeholder="分享你的想法..." multiline numberOfLines={6} />
      {/* 图片预览区 */}
      <StyledButton title="选择图片（最多3张）" onPress={pickImage} variant="secondary" />
      <StyledButton title="发布" onPress={handleSubmit} disabled={!content.trim()} />
    </View>
  );
}
```

**注意：** RN 的 `FormData` 写入图片时，`uri` 必须带 `file://` 前缀（iOS）或 `/data/...` 路径（Android），`expo-image-picker` 已经处理好。

---

## 4. 推送验证（约 3h）

### 4.1 后端：FCM 推送服务（1.5h）

#### 4.1.1 获取 Firebase 密钥

1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 创建项目 → 添加 Android App 和 iOS App
3. 下载 `google-services.json`（Android）和 `GoogleService-Info.plist`（iOS）
4. 在「项目设置 → 服务账号」生成私钥 JSON 文件，保存到 `backend/firebase-key.json`

#### 4.1.2 安装依赖

```bash
cd backend
npm install firebase-admin
```

#### 4.1.3 新建 `services/fcmPush.js`

```js
const admin = require('firebase-admin');
const { query } = require('../database');

let initialized = false;

function initFcm() {
  if (initialized) return;
  try {
    admin.initializeApp({
      credential: admin.credential.cert(require('../firebase-key.json')),
    });
    initialized = true;
    console.log('[FCM] initialized');
  } catch (e) {
    console.warn('[FCM] init failed (may be missing firebase-key.json):', e.message);
  }
}

async function sendFcmPush({ userId, title, body, data }) {
  if (!initialized) return;
  try {
    const rows = await query(
      `SELECT endpoint FROM push_subscriptions WHERE user_id = ? AND device_type IN ('ios','android')`,
      [userId]
    );
    if (!rows || rows.length === 0) return;

    const tokens = rows.map((r) => r.endpoint);
    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: data || {},
      apns: { payload: { aps: { sound: 'default', badge: 1, mutableContent: true } } },
    });
    console.log(`[FCM] sent to ${result.successCount}/${tokens.length} devices`);
  } catch (e) {
    console.error('[FCM] send error:', e.message);
  }
}

module.exports = { initFcm, sendFcmPush };
```

#### 4.1.4 改造 `services/pushSend.js`

```js
// 在现有 sendPushToUser 函数末尾增加：
const { sendFcmPush } = require('./fcmPush');
// ...
// 现有 Web Push 逻辑之后：
await sendFcmPush({ userId, title, body, data });
```

#### 4.1.5 改造 `routes/push.js`

```js
// POST /api/push/subscribe 增加 device_type 字段
router.post('/subscribe', authenticateToken, async (req, res) => {
  const { subscription, device_type } = req.body;
  const deviceType = device_type || 'web'; // 兼容旧版
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_type)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE device_type = VALUES(device_type)`,
    [req.user.id, subscription.endpoint, subscription.keys?.p256dh || null, subscription.keys?.auth || null, deviceType]
  );
  res.json({ status: 0, message: 'ok' });
});
```

#### 4.1.6 数据库迁移

```sql
-- migrations/059_push_device_types.sql
ALTER TABLE push_subscriptions ADD COLUMN device_type VARCHAR(10) DEFAULT 'web';
```

### 4.2 App 端：推送注册 + 前台处理（1h）

#### 4.2.1 请求权限 + 注册 token

```tsx
// mobile/src/hooks/usePushToken.ts
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { subscribePush } from '../api/push';

// 前台收到通知时如何展示（不自动弹出 alert，而是显示一个 banner）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushToken(userId) {
  useEffect(() => {
    if (!userId) return;
    registerToken(userId);
  }, [userId]);
}

async function registerToken(userId) {
  if (!Device.isDevice) {
    console.log('模拟器不支持推送，请在真机上测试');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  // Android 需要设置 channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '通知',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  await subscribePush({
    subscription: { endpoint: tokenData.data, keys: {} },
    device_type: Platform.OS === 'ios' ? 'ios' : 'android',
  });
}
```

### 4.3 验证测试（0.5h）

```bash
# 终端 1：启动后端
cd backend && npm start

# 终端 2：启动 Expo
cd mobile && npx expo start

# 用手机扫码 → 登录 → 查看是否注册了推送 token
# 检查数据库：SELECT * FROM push_subscriptions WHERE device_type != 'web';

# 测试推送：
# 1. 找一个有课的用户
# 2. 手动触发上课提醒
# 3. 观察手机是否收到系统通知
```

---

## 5. 此阶段交付物清单

| # | 交付物 | 验收标准 |
|---|--------|----------|
| 1 | Expo 项目能正常运行 | `npx expo start` → 手机扫码可看到界面 |
| 2 | 登录/注册可用 | 输入账号密码 → 登录成功 → 跳转首页 |
| 3 | 树洞首页列表 | 显示帖子卡片、支持下拉刷新、无限滚动 |
| 4 | 帖子详情 | 点击帖子 → 查看全文/图片/评论 |
| 5 | 发帖功能 | 输入文字 + 选图 → 发布 → 回到列表可见新帖 |
| 6 | 点赞/评论 | 点赞 toggle、发表评论 |
| 7 | 液态玻璃效果 | 卡片有明显毛玻璃效果（iOS 明显，Android 降级） |
| 8 | 推送注册 | 登录后自动注册 token，数据库有记录 |
| 9 | FCM 推送 | 手动触发 → 手机收到系统通知 |

---

## 6. 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| `fetch` 请求发不出去 | iOS 不允许 HTTP | 在 `app.json` 加 `"ios": { "infoPlist": { "NSAppTransportSecurity": { "NSAllowsArbitraryLoads": true } } }` |
| 图片选不了 | 未请求权限 | 调用 `ImagePicker.requestMediaLibraryPermissionsAsync()` |
| BlurView 不模糊 | Android 不支持 | 降级为半透明 View |
| 推送收不到 | 模拟器不支持 | 必须用真机测试 |
| `AsyncStorage` 报错 | 版本问题 | `npx expo install @react-native-async-storage/async-storage` |

---

**报告编写：** Claude Code (Claude Opus 4.8)  
**最后更新：** 2026-06-01
