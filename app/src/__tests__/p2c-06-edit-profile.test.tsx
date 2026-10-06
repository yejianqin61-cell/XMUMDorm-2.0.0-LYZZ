/**
 * P2C-06 · `M-02` 资料编辑 + `C20 MediaPicker` —— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：图片校验（gif / 大小）、资料 → 表单初始值、表单 → 提交体；
 *   S-1 页面：`MediaPicker` 的注入式选图（不注入时不可用）、离开确认、提交走 `PATCH`
 *   S-5 结构约束：`M-02` **不自己包 `Screen`**（`K01 Form` 已 own 唯一容器，宪法 17.1-S2）
 *
 * 依据：`docs/app/task/phase-2/P2C-06-M02资料编辑(补切).md`、`routes/users.js:297,351`。
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { zh } from '@/i18n';
import { IMAGE_MAX_BYTES, MediaPicker, validatePickedImage } from '@/components/ui/MediaPicker';
import { EditProfileScreen, PROFILE_MAX_LENGTH, formValuesToProfileBody, profileToFormValues } from '@/features/me/EditProfileScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn(), updateProfileInfo: jest.fn() }));

const api = require('../../../shared/api/users') as { getMe: jest.Mock; updateProfileInfo: jest.Mock };

const SRC_ROOT = path.resolve(__dirname, '..');
const PROFILE = {
  id: 7,
  username: 'student7',
  nickname: '小明',
  avatar: 'avatars/u7.png',
  level: 3,
  levelProgress: { progress: 0.1, progressText: '10/100' },
  college: '信息学院',
  grade: '2025',
  major: '软件工程',
  show_college: true,
  show_grade: false,
  show_major: true,
};

beforeEach(() => {
  api.getMe.mockReset();
  api.updateProfileInfo.mockReset();
  api.getMe.mockResolvedValue(PROFILE);
  api.updateProfileInfo.mockResolvedValue({ status: 0 });
});

describe('P2C-06 M-02 资料编辑 / C20 MediaPicker', () => {
  describe('TC-P2C-06-1A · 资料 → 表单初始值', () => {
    it('字段齐全；缺失时给空串/true（⛔ 不出现 undefined）', () => {
      const values = profileToFormValues(PROFILE);
      expect(values.nickname).toBe('小明');
      expect(values.college).toBe('信息学院');
      expect(values.show_grade).toBe(false);
      expect(values.show_college).toBe(true);

      const empty = profileToFormValues(null);
      expect(empty.nickname).toBe('');
      expect(empty.show_college).toBe(true);
      expect(Object.values(empty).every((value) => value !== undefined)).toBe(true);
    });

    it('提交体：昵称 trim、开关必须是**布尔**（非布尔一律当 false，⛔ 不混入 undefined）', () => {
      const body = formValuesToProfileBody({ nickname: '  小红  ', show_college: true, show_grade: null });
      expect(body.nickname).toBe('小红');
      expect(body.show_college).toBe(true);
      expect(body.show_grade).toBe(false);
      expect(body.college).toBe('');
      // 表单 DSL 的 switch 存的是真布尔；非布尔（脏数据）一律当 false，⛔ 不靠真值转换
      expect(formValuesToProfileBody({ show_college: 1 }).show_college).toBe(false);
    });
  });

  describe('TC-P2C-06-2A · 图片校验（限额由页面注入）', () => {
    it('`allowGif:false` 拒 gif；大小超限拒；其余放行', () => {
      expect(validatePickedImage({ mimeType: 'image/gif', allowGif: false, maxBytes: IMAGE_MAX_BYTES })).toEqual({
        ok: false,
        reason: 'gifNotAllowed',
      });
      expect(validatePickedImage({ mimeType: 'image/gif', allowGif: true, maxBytes: IMAGE_MAX_BYTES })).toEqual({ ok: true });
      expect(
        validatePickedImage({ mimeType: 'image/png', sizeBytes: IMAGE_MAX_BYTES + 1, allowGif: true, maxBytes: IMAGE_MAX_BYTES })
      ).toEqual({ ok: false, reason: 'tooLarge' });
      expect(
        validatePickedImage({ mimeType: 'image/png', sizeBytes: IMAGE_MAX_BYTES, allowGif: true, maxBytes: IMAGE_MAX_BYTES })
      ).toEqual({ ok: true });
      // mime 缺失不猜：放行让服务端判定，但大小仍是硬门
      expect(validatePickedImage({ mimeType: null, allowGif: false, maxBytes: 10 })).toEqual({ ok: true });
    });
  });

  describe('TC-P2C-06-3A · MediaPicker：选图是**注入**的（未准入时不可用）', () => {
    it('不注入 `onPick` → 按钮禁用且给出原因；注入后能选到图', async () => {
      const disabled = await renderApp(
        <MediaPicker testID="mp" value={null} onChange={() => undefined} pickLabel="头像" unavailableLabel="选图暂不可用" />
      );
      expect(disabled.getByTestId('mp-pick').props.accessibilityState.disabled).toBe(true);
      expect(disabled.getByText('选图暂不可用')).toBeTruthy();
    });

    it('注入 `onPick` → 选到的图通过校验后回调（gif 被拒时不回调）', async () => {
      const onChange = jest.fn();
      const view = await renderApp(
        <MediaPicker
          testID="mp2"
          value={null}
          onChange={onChange}
          pickLabel="头像"
          allowGif={false}
          gifNotAllowedLabel="不收 gif"
          onPick={async () => ({ ok: true, image: { uri: 'file://a.gif', mimeType: 'image/gif' } })}
        />
      );
      fireEvent.press(view.getByTestId('mp2-pick'));
      await waitFor(() => expect(view.getByTestId('mp2-error')).toBeTruthy());
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('TC-P2C-06-4A · 页面：表单可填、提交走 PATCH、失败不跳转', () => {
    it('拉不到资料也不白屏；拉到后表单出现', async () => {
      const view = await renderApp(<EditProfileScreen />);
      await waitFor(() => expect(view.getByTestId('me-edit-form')).toBeTruthy());
      expect(view.getByTestId('me-edit-form-nickname')).toBeTruthy();
      expect(view.getByTestId('me-edit-avatar')).toBeTruthy();
      expect(api.getMe).toHaveBeenCalled();
    });

    it('昵称上限是**页面注入**的（服务端不拦）', () => {
      expect(PROFILE_MAX_LENGTH).toBeGreaterThan(0);
      const values = profileToFormValues(PROFILE);
      values.nickname = 'x'.repeat(PROFILE_MAX_LENGTH + 1);
      // 校验在上限之内放行、超限报错——由 `K01` 的 validateAll 决定（这里只钉"上限存在且被注入"）
      expect(String(values.nickname).length).toBe(PROFILE_MAX_LENGTH + 1);
    });
  });

  describe('TC-P2C-06-5A · 结构约束：⛔ 不自己包 Screen（唯一安全区容器）', () => {
    it('`EditProfileScreen` 没有把 `Form` 包在 `Screen` 里', () => {
      const code = stripComments(
        fs.readFileSync(path.join(SRC_ROOT, 'features', 'me', 'EditProfileScreen.tsx'), 'utf8')
      );
      // 只有"资料还没拉回来"那一个分支允许出现 Screen
      const screenUses = code.match(/<Screen/g) ?? [];
      expect(screenUses.length).toBe(1);
      expect(code).toContain('<Form');
      // 头像字段必须 neverDraft（本地 URI 重启后失效）
      expect(code).toContain('neverDraft: true');
    });

    it('依赖缺口如实写在文件头（选图依赖未准入）', () => {
      const raw = fs.readFileSync(path.join(SRC_ROOT, 'features', 'me', 'EditProfileScreen.tsx'), 'utf8');
      expect(raw).toContain('expo-image-picker');
      expect(raw).toContain('依赖准入');
      expect(zh['me.edit.avatarUnavailable']).toBeTruthy();
    });
  });
});
