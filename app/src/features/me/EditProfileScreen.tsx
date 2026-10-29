/**
 * 资料编辑（`M-02`）—— `P4` 骨架的页面级装配（P2C-06）
 *
 * ## 三件必须先说清的事
 * 1. **端点是 `PATCH`**：页面清单写 `PUT /api/users/me` 与 `POST /api/users/me/avatar`，
 *    实际是 **`PATCH /api/users/me`** 与 **`PATCH /api/users/me/avatar`**（`routes/users.js:297,351`）。
 * 2. **服务端没有长度上限**（`PATCH /api/users/me` 只 trim）→ `maxLength` 由**本页注入**
 *    （⛔ 不指望服务端拦：不拦就会以 500 收场）。
 * 3. **头像本轮不可用**：选图要 `expo-image-picker`，而它**不在依赖准入清单**里（宪法 3.4）。
 *    所以头像字段照常渲染（`kind:'custom'` + `C20 MediaPicker`），但**不注入 `onPick`**、
 *    按钮不可用并说明原因；本次提交**只提交文本字段**，头像上传路径登记为缺口（⛔ 不假装能做）。
 *
 * ⛔ 本页**不自己包 `Screen`**：`K01 Form` 内部已经渲染了那唯一的容器
 *   （再包一层就是第二个安全区容器，宪法 17.1-S2）—— 与 `PublishFormHost` 同一处理。
 */

import * as React from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Form, useForm, type FormLabels } from '@/components/ui/Form';
import type { FormFieldDescriptor } from '@/components/ui/FormField';
import { MediaPicker } from '@/components/ui/MediaPicker';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n';
import { updateAvatar, updateProfileInfo } from '../../../../shared/api/users';
import { normalizeProfile } from './profile';
import { useMeProfile } from './useMeProfile';

/** 昵称/学院/专业的上限由**页面**给（服务端不拦） */
export const PROFILE_MAX_LENGTH = 40;

const TEXT_FIELDS: readonly FormFieldDescriptor[] = [
  { kind: 'text', name: 'nickname', labelKey: 'me.edit.nickname', maxLength: PROFILE_MAX_LENGTH, required: true },
  { kind: 'text', name: 'college', labelKey: 'me.edit.college', maxLength: PROFILE_MAX_LENGTH },
  { kind: 'text', name: 'grade', labelKey: 'me.edit.grade', maxLength: PROFILE_MAX_LENGTH },
  { kind: 'text', name: 'major', labelKey: 'me.edit.major', maxLength: PROFILE_MAX_LENGTH },
];

const VISIBILITY_FIELDS: readonly FormFieldDescriptor[] = [
  { kind: 'switch', name: 'show_college', labelKey: 'me.edit.showCollege' },
  { kind: 'switch', name: 'show_grade', labelKey: 'me.edit.showGrade' },
  { kind: 'switch', name: 'show_major', labelKey: 'me.edit.showMajor' },
];

/** 资料载荷 → 表单初始值（缺字段给空串/true，⛔ 不出现 undefined） */
export function profileToFormValues(payload: unknown): Record<string, unknown> {
  const profile = normalizeProfile(payload);
  const raw = (payload ?? {}) as Record<string, unknown>;
  return {
    nickname: profile.displayName ?? '',
    college: profile.college ?? '',
    grade: profile.grade ?? '',
    major: profile.major ?? '',
    show_college: raw.show_college !== false,
    show_grade: raw.show_grade !== false,
    show_major: raw.show_major !== false,
  };
}

/** 提交体：⛔ 不带 `undefined`（服务端只认这些字段，多传会被忽略但不该赌） */
export function formValuesToProfileBody(values: Record<string, unknown>): Record<string, unknown> {
  return {
    nickname: String(values.nickname ?? '').trim(),
    college: String(values.college ?? ''),
    grade: String(values.grade ?? ''),
    major: String(values.major ?? ''),
    show_college: values.show_college === true,
    show_grade: values.show_grade === true,
    show_major: values.show_major === true,
  };
}

type AvatarCandidate = { uri?: unknown; mimeType?: unknown; sizeBytes?: unknown };
type AvatarUploadFile = { uri: string; name: string; type: string };

/** Native FormData accepts this shape on iOS and Android; remote URLs are never uploaded as user files. */
export function avatarUploadFile(value: unknown): AvatarUploadFile | null {
  const image = value as AvatarCandidate | null;
  if (!image || typeof image.uri !== 'string' || !/^(file:|content:)/.test(image.uri)) return null;
  if (typeof image.mimeType !== 'string' || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(image.mimeType)) return null;
  const extension = image.mimeType === 'image/jpeg' ? 'jpg' : image.mimeType.slice('image/'.length);
  return { uri: image.uri, name: `avatar.${extension}`, type: image.mimeType };
}

export function EditProfileScreen(): React.ReactElement {
  /**
   * 资料取数复用「我的」的**同一个** query（阶段2-03）：
   * 缓存命中时本页零请求；未命中时由 hook 发一次，⛔ 不再有第二个取数点。
   * 取数失败仍允许进空表单（原兜底），否则弱网时用户连资料都改不了。
   */
  const me = useMeProfile();
  const initial = React.useMemo(() => {
    if (me.raw !== null) return profileToFormValues(me.raw);
    return me.failed ? profileToFormValues(null) : null;
  }, [me.raw, me.failed]);

  // 资料没回来就**不挂表单**：`useForm` 的初始值只在首次渲染取（`Form.tsx:292-293`），
  // 早挂会把空值当初始值 —— 用户一提交就把昵称清空。
  if (initial === null) {
    return <Screen testID="screen-me-edit" titleKey="me.edit.title" bottomMode="none" />;
  }

  return (
    <EditProfileForm
      initial={initial}
      initialAvatarUri={me.profile?.avatarUri ?? null}
      invalidate={me.invalidate}
    />
  );
}

/** 表单本体：**只在资料就绪后挂载一次**，初始值因此是真实的（阶段2-03） */
function EditProfileForm({
  initial,
  initialAvatarUri,
  invalidate,
}: {
  initial: Record<string, unknown>;
  initialAvatarUri: string | null;
  invalidate: () => Promise<void>;
}): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [avatarUri, setAvatarUri] = React.useState<string | null>(initialAvatarUri);

  /** 头像走 `kind:'custom'`（DSL 没有媒体 kind；`render` 就是为这种字段准备的） */
  const fields = React.useMemo<readonly FormFieldDescriptor[]>(
    () => [
      ...TEXT_FIELDS,
      ...VISIBILITY_FIELDS,
      {
        kind: 'custom',
        name: 'avatar',
        labelKey: 'me.edit.avatar',
        // ⛔ 本地 URI 重启后失效 → 绝不落草稿
        neverDraft: true,
        render: (api) => (
          <MediaPicker
            testID="me-edit-avatar"
            value={api.value && typeof api.value === 'object' && typeof (api.value as {uri?: unknown}).uri === 'string'
              ? api.value as {uri:string;mimeType?:string|null;sizeBytes?:number|null}
              : avatarUri === null ? null : { uri: avatarUri }}
            onChange={(next) => {
              api.onChange(next);
              setAvatarUri(next?.uri ?? null);
            }}
            maxBytes={8 * 1024 * 1024}
            allowGif
            pickLabel={t('me.edit.avatar')}
            removeLabel={t('action.clear')}
            onPick={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
              if (result.canceled) return { ok: false, reason: 'cancelled' };
              const asset = result.assets[0];
              if (!asset?.uri || !asset.mimeType || !asset.fileSize) return { ok: false, reason: 'failed' };
              return { ok: true, image: { uri: asset.uri, mimeType: asset.mimeType, sizeBytes: asset.fileSize } };
            }}
          />
        ),
      },
    ],
    [avatarUri, t]
  );

  const invalidateRef = React.useRef(invalidate);
  invalidateRef.current = invalidate;

  const form = useForm({
    formId: 'me:edit',
    fields,
    initialValues: initial,
    onSubmit: async (values) => {
      await updateProfileInfo(formValuesToProfileBody(values));
      const avatar = avatarUploadFile(values.avatar);
      if (avatar) await updateAvatar(avatar);
      // 保存成功 → 显式失效资料 query（返回「我的」立即是新值，⛔ 不靠"下一页碰巧重拉"）
      await invalidateRef.current();
    },
  });

  const labels = React.useMemo<FormLabels>(
    () => ({
      submit: t('action.save'),
      cancel: t('action.cancel'),
      errorSummaryTitle: t('form.summary.title'),
      leaveTitle: t('form.leave.title'),
      leaveBody: t('form.leave.body'),
      leaveConfirm: t('form.leave.confirm'),
      leaveCancel: t('form.leave.cancel'),
    }),
    [t]
  );

  return (
    <Form
      testID="me-edit-form"
      form={form}
      sections={[{ title: 'me.edit.section', fields }]}
      labels={labels}
      semantic="update"
      onSettled={() => router.back()}
      onCancel={() => router.back()}
      onRetrySubmit={() => void form.submit()}
    />
  );
}
