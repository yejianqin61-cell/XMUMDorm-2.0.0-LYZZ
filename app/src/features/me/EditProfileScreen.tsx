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

import { Form, useForm, type FormLabels } from '@/components/ui/Form';
import type { FormFieldDescriptor } from '@/components/ui/FormField';
import { MediaPicker } from '@/components/ui/MediaPicker';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n';
import { getMe, updateProfileInfo } from '../../../../shared/api/users';
import { normalizeProfile } from './profile';

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

export function EditProfileScreen(): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [initial, setInitial] = React.useState<Record<string, unknown> | null>(null);
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await getMe();
        if (cancelled) return;
        setInitial(profileToFormValues(payload));
        setAvatarUri(normalizeProfile(payload).avatarUri);
      } catch {
        // 拉不到资料也要能进来（空表单），⛔ 不白屏
        if (!cancelled) setInitial(profileToFormValues(null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        render: () => (
          <MediaPicker
            testID="me-edit-avatar"
            value={avatarUri === null ? null : { uri: avatarUri }}
            onChange={() => undefined}
            maxBytes={8 * 1024 * 1024}
            allowGif
            pickLabel={t('me.edit.avatar')}
            unavailableLabel={t('me.edit.avatarUnavailable')}
            removeLabel={t('action.clear')}
            disabled
          />
        ),
      },
    ],
    [avatarUri, t]
  );

  const form = useForm({
    formId: 'me:edit',
    fields,
    initialValues: initial ?? undefined,
    onSubmit: async (values) => {
      await updateProfileInfo(formValuesToProfileBody(values));
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

  // 资料还没拉回来就先不渲染表单：否则会把空值当初始值，用户一提交就把昵称清空
  if (initial === null) {
    return <Screen testID="screen-me-edit" titleKey="me.edit.title" bottomMode="none" />;
  }

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
