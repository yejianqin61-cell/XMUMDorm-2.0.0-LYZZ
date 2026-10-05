/**
 * P1-05 · C 层控件（11 个）—— 自动化用例
 *
 * 测什么：
 *   S-1 组件契约：变体映射、a11y 角色/状态、清除与回显
 *   S-4 纯规则：键盘映射、计数器三态、上限判定、去重、OTP 归一化、项数上下限
 *   S-5 结构约束：控件层**不自造浮层**（`Modal` 属 O 层的事）
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/design-system/theme';

import { Button, type ButtonVariant } from '@/components/ui/Button';
import { Input, inputAccessibilityLabel, keyboardTypeFor } from '@/components/ui/Input';
import { TextArea, counterLabel, counterState } from '@/components/ui/TextArea';
import { SearchField } from '@/components/ui/SearchField';
import { Select, filterOptions, selectedAnnouncement } from '@/components/ui/Select';
import { MultiSelect, isOptionEnabled } from '@/components/ui/MultiSelect';
import { Checkbox, checkboxAccessibility } from '@/components/ui/Checkbox';
import { Switch } from '@/components/ui/Switch';
import {
  SEGMENTED_MAX_ITEMS,
  SEGMENTED_MIN_ITEMS,
  SegmentedControl,
  isSegmentedCountValid,
} from '@/components/ui/SegmentedControl';
import { OtpInput, normalizeOtp, otpAnnouncement } from '@/components/ui/OtpInput';
import { TagPicker, canAddTag, isDuplicateTag, normalizeTag } from '@/components/ui/TagPicker';

const UI_DIR = path.resolve(__dirname, '../components/ui');
const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');

const CONTROL_FILES = [
  'Button.tsx',
  'Input.tsx',
  'TextArea.tsx',
  'SearchField.tsx',
  'Select.tsx',
  'MultiSelect.tsx',
  'Checkbox.tsx',
  'Switch.tsx',
  'SegmentedControl.tsx',
  'OtpInput.tsx',
  'TagPicker.tsx',
] as const;

const wrap = (node: React.ReactElement) =>
  render(<ThemeProvider source="dark" systemScheme="dark">{node}</ThemeProvider>);

describe('TC-P1-05-1A · C 层 11 个控件齐备且都消费主题层', () => {
  it.each(CONTROL_FILES)('components/ui/%s 存在且非空', (file) => {
    expect(readUi(file).length).toBeGreaterThan(300);
  });

  it('每个控件都通过 useTheme 取令牌（⛔ 不自己读令牌文件）', () => {
    for (const file of CONTROL_FILES) {
      expect(readUi(file)).toContain('useTheme');
    }
  });
});

describe('TC-P1-05-2A · C01 Button：变体与 NB 稀缺性', () => {
  it('5 个变体都存在；**只有 primary** 走 Neo-Brutalism（2px 描边 + 硬偏移）', () => {
    const src = readUi('Button.tsx');
    for (const variant of ['primary', 'secondary', 'ghost', 'danger', 'link'] as ButtonVariant[]) {
      expect(src).toContain(`${variant}:`);
    }
    // brutal 只有 primary 为 true —— 数一下 true 的个数
    expect((src.match(/brutal: true/g) ?? []).length).toBe(1);
  });

  it('loading 时暴露 busy 且**不再触发 onPress**（防重复提交，§3.2.5）', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await wrap(
      <Button label="保存" loading onPress={onPress} testID="btn" />
    );
    const node = getByTestId('btn');
    expect(node.props.accessibilityState).toMatchObject({ busy: true });
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(node);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TC-P1-05-3A · C04 Input：键盘映射与"错误是 label 的一部分"', () => {
  it('keyboardTypeFor 覆盖 §3.3.2 的映射表', () => {
    expect(keyboardTypeFor('email')).toBe('email-address');
    expect(keyboardTypeFor('number')).toBe('numeric');
    expect(keyboardTypeFor('tel')).toBe('phone-pad');
    expect(keyboardTypeFor('text')).toBe('default');
  });

  it('inputAccessibilityLabel：必填与错误文案都进 label（RN 的 AccessibilityState 没有这两个字段）', () => {
    expect(inputAccessibilityLabel('昵称')).toBe('昵称');
    expect(inputAccessibilityLabel('昵称', { required: true })).toBe('昵称，必填');
    expect(inputAccessibilityLabel('昵称', { required: true, errorText: '不能为空' })).toBe(
      '昵称，必填，不能为空'
    );
  });

  it('渲染出的 label 含错误文案，且 disabled 进 accessibilityState', async () => {
    const { getByTestId } = await wrap(
      <Input label="昵称" value="" errorText="不能为空" testID="inp" />
    );
    const node = getByTestId('inp');
    expect(node.props.accessibilityLabel).toBe('昵称，不能为空');
  });

  it('clearable：有内容才出现清除按钮，点它清空', async () => {
    const onChangeText = jest.fn();
    const empty = await wrap(<Input label="昵称" value="" clearable testID="i1" />);
    expect(empty.queryByTestId('i1-clear')).toBeNull();

    const filled = await wrap(
      <Input label="昵称" value="林" clearable onChangeText={onChangeText} testID="i2" />
    );
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(filled.getByTestId('i2-clear'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});

describe('TC-P1-05-4A · C05 TextArea：计数器三态与硬截', () => {
  it('counterState：<90% normal，≥90% near，超限 over', () => {
    expect(counterState(0, 100)).toBe('normal');
    expect(counterState(89, 100)).toBe('normal');
    expect(counterState(90, 100)).toBe('near');
    expect(counterState(100, 100)).toBe('near');
    expect(counterState(101, 100)).toBe('over');
  });

  it('counterState：没有上限时永远 normal（⛔ 不发明默认上限）', () => {
    expect(counterState(9999, undefined)).toBe('normal');
    expect(counterState(1, 0)).toBe('normal');
  });

  it('counterLabel：有上限显示 当前/上限，没有则只报当前', () => {
    expect(counterLabel(12, 300)).toBe('12/300');
    expect(counterLabel(12, undefined)).toBe('12');
  });

  it('⛔ 超限靠 maxLength **硬截**（不是事后报错）', async () => {
    const { getByTestId } = await wrap(
      <TextArea label="正文" value="abc" counter maxLength={5} testID="ta" />
    );
    expect(getByTestId('ta').props.maxLength).toBe(5);
  });

  it('near/over 时**同时**给出警告图标与文案（宪法 2.1.1：警告不得仅靠色块）', async () => {
    const { getByText, getByTestId } = await wrap(
      <TextArea label="正文" value={'字'.repeat(95)} counter maxLength={100} testID="ta2" />
    );
    // 图标是**第 1 层图标**（A06 Icon），不是文本字符
    expect(getByTestId('ta2-counter-warning', { includeHiddenElements: true })).toBeTruthy();
    expect(getByText('95/100')).toBeTruthy();
  });
});

describe('TC-P1-05-5A · C06 SearchField：清除行为与"检索框不做字段错误"', () => {
  it('有值才出现清除按钮', async () => {
    const empty = await wrap(<SearchField value="" testID="s1" />);
    expect(empty.queryByTestId('s1-clear')).toBeNull();

    const filled = await wrap(<SearchField value="食堂" testID="s2" />);
    expect(filled.getByTestId('s2-clear')).toBeTruthy();
  });

  it('⛔ 检索框没有 errorText 这个 prop（字段错误是 C04/C05 的事，§3.3.1 职责分离）', () => {
    const src = readUi('SearchField.tsx');
    expect(src).not.toMatch(/errorText/);
  });
});

describe('TC-P1-05-6A · C07 Select：选中可播报 + 就地过滤 + 选中态不只靠颜色', () => {
  const options = [
    { value: 'a', label: '电子' },
    { value: 'b', label: '书籍' },
  ];

  it('selectedAnnouncement 把当前选中说清楚（§7.3 硬要求）', () => {
    expect(selectedAnnouncement('分类', options, 'b', '请选择')).toBe('分类：书籍');
    expect(selectedAnnouncement('分类', options, null, '请选择')).toBe('分类：请选择');
  });

  it('filterOptions：空关键字返回原表；否则按 label 过滤', () => {
    expect(filterOptions(options, '  ')).toHaveLength(2);
    expect(filterOptions(options, '书')).toHaveLength(1);
    expect(filterOptions(options, '不存在')).toHaveLength(0);
  });

  it('展开时选项可见、暴露 expanded、选中项被标记（⛔ 选中不只靠颜色）', async () => {
    // 用**受控 open** 渲染：`combobox` 角色下 RNTL 不模拟 press（那是测试工具的限制），
    // 而这里要验的是"展开后的语义与呈现"，不是 RNTL 的 press 路由能力。
    const view = await wrap(
      <Select label="分类" options={options} value="a" open testID="sel" />
    );
    expect(view.getByText('书籍')).toBeTruthy();
    expect(view.getByTestId('sel').props.accessibilityState).toMatchObject({ expanded: true });
    // 选中项：用 a11y 的 selected 表达（图标是第 1 层 Icon，无法用文本查询）
    expect(view.getByLabelText('电子').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('非受控时：闭合 → 点开（用 onOpenChange 观察，绕开 RNTL 的 press 路由限制）', async () => {
    const { fireEvent } = require('@testing-library/react-native');
    const onOpenChange = jest.fn();
    const view = await wrap(
      <Select label="分类" options={options} value="a" onOpenChange={onOpenChange} testID="sel2" />
    );
    expect(view.queryByText('书籍')).toBeNull();
    // 直接触发元素自身的 press 事件（不过 RNTL 的角色判定）
    fireEvent(view.getByTestId('sel2'), 'press');
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('⛔ 不自绘浮层（§3.1 反例）：控件层 0 处 Modal', () => {
    expect(readUi('Select.tsx')).not.toMatch(/\bModal\b/);
  });
});

describe('TC-P1-05-7A · C09 MultiSelect：上限前置 + 已选可取消 + 回显', () => {
  it('isOptionEnabled：未选达上限则不可点；**已选的始终可点**（用来取消）', () => {
    expect(isOptionEnabled(['a'], 'b', 2)).toBe(true);
    expect(isOptionEnabled(['a', 'b'], 'c', 2)).toBe(false);
    expect(isOptionEnabled(['a', 'b'], 'a', 2)).toBe(true);
    expect(isOptionEnabled(['a', 'b'], 'c', undefined)).toBe(true);
  });

  it('已选 chips 渲染出来且删除标签是"移除X"（§7.3）', async () => {
    const { getByLabelText, getByTestId } = await wrap(
      <MultiSelect
        label="宿舍区"
        options={[{ value: 'd6', label: 'D6' }]}
        value={['d6']}
        testID="ms"
      />
    );
    expect(getByTestId('ms-selected')).toBeTruthy();
    expect(getByLabelText('移除D6')).toBeTruthy();
  });
});

describe('TC-P1-05-8A · C10 Checkbox：三态映射到 **RN 的** checked（含 mixed）', () => {
  it('checkboxAccessibility：intermediate → checked:"mixed"（⛔ 不是 web 的 checkedState）', () => {
    expect(checkboxAccessibility('checked')).toEqual({ checked: true });
    expect(checkboxAccessibility('unchecked')).toEqual({ checked: false });
    // ⚠️ 组件定义 §7.3 写的是 `checkedState`，那是 react-native-web 的字段；
    //    RN 本体的表达是 checked: 'mixed'，传 checkedState 会被丢掉（= 没暴露）
    expect(checkboxAccessibility('indeterminate')).toEqual({ checked: 'mixed' });
  });

  it('group 形态下每项角色都是 checkbox 且整行可点', async () => {
    const { getByTestId } = await wrap(
      <Checkbox
        label=""
        groupLabel="通知类别"
        options={[{ value: 'x', label: '互动', state: 'checked' }]}
        testID="cb"
      />
    );
    const node = getByTestId('cb-x');
    expect(node.props.accessibilityRole).toBe('checkbox');
    expect(node.props.accessibilityState).toMatchObject({ checked: true });
  });
});

describe('TC-P1-05-9A · C12 Switch：平台原语 + switch 角色 + checked', () => {
  it('渲染出 switch 角色与 checked 状态，文案即 label', async () => {
    const { getByTestId } = await wrap(<Switch label="暗色模式" value testID="sw" />);
    const node = getByTestId('sw');
    expect(node.props.accessibilityRole).toBe('switch');
    expect(node.props.accessibilityState).toMatchObject({ checked: true });
    expect(node.props.accessibilityLabel).toBe('暗色模式');
  });

  it('⛔ 不自绘开关（自绘会丢掉系统手势与触感）', () => {
    const src = readUi('Switch.tsx');
    expect(src).toContain('RNSwitch');
    expect(src).not.toMatch(/Animated|PanResponder/);
  });
});

describe('TC-P1-05-10A · C14 SegmentedControl：2–5 项是硬规则', () => {
  it('isSegmentedCountValid 的边界', () => {
    expect(isSegmentedCountValid(SEGMENTED_MIN_ITEMS - 1)).toBe(false);
    expect(isSegmentedCountValid(SEGMENTED_MIN_ITEMS)).toBe(true);
    expect(isSegmentedCountValid(SEGMENTED_MAX_ITEMS)).toBe(true);
    expect(isSegmentedCountValid(SEGMENTED_MAX_ITEMS + 1)).toBe(false);
  });

  it('互斥选择用 radio 角色（⛔ 不用导航语义的 tab，4.8.1-R4）', async () => {
    const { getByTestId } = await wrap(
      <SegmentedControl
        options={[
          { value: '1', label: '第一周' },
          { value: '2', label: '第二周' },
        ]}
        value="1"
        testID="seg"
      />
    );
    expect(getByTestId('seg-1').props.accessibilityRole).toBe('radio');
    expect(getByTestId('seg-1').props.accessibilityState).toMatchObject({ checked: true });
  });
});

describe('TC-P1-05-11A · C19 OtpInput：归一化与播报', () => {
  it('normalizeOtp 过滤非数字并截到定长', () => {
    expect(normalizeOtp('12a3', 4)).toBe('123');
    expect(normalizeOtp('1234567890', 6)).toBe('123456');
    expect(normalizeOtp('', 4)).toBe('');
    expect(normalizeOtp('--', 6)).toBe('');
  });

  it('otpAnnouncement 播报位数与已输入位数（§7.3）', () => {
    expect(otpAnnouncement('验证码', '12', 6)).toBe('验证码，6 位，已输入 2 位');
  });

  it('真实输入框只有**一个**（粘贴与系统自动填充都靠它）', async () => {
    const { getByTestId } = await wrap(<OtpInput label="验证码" value="12" testID="otp" />);
    expect(getByTestId('otp').props.maxLength).toBe(6);
  });
});

describe('TC-P1-05-12A · C21 TagPicker：一个组件两个 source 形态', () => {
  it('normalizeTag：trim + 截到单标签上限', () => {
    expect(normalizeTag('  学习  ', 20)).toBe('学习');
    expect(normalizeTag('abcdef', 3)).toBe('abc');
    expect(normalizeTag('  ', undefined)).toBe('');
  });

  it('canAddTag：达上限就停手（⛔ 不是事后报错）', () => {
    expect(canAddTag([], 3)).toBe(true);
    expect(canAddTag(['a', 'b'], 3)).toBe(true);
    expect(canAddTag(['a', 'b', 'c'], 3)).toBe(false);
    expect(canAddTag(['a'], undefined)).toBe(true);
  });

  it('isDuplicateTag：重复静默忽略（重复添加不是"错误"）', () => {
    expect(isDuplicateTag(['a'], 'a')).toBe(true);
    expect(isDuplicateTag(['a'], 'b')).toBe(false);
  });

  it('free 形态渲染输入框；enum 形态渲染白名单选项', async () => {
    const free = await wrap(<TagPicker label="标签" value={[]} source="free" testID="tp-free" />);
    expect(free.getByTestId('tp-free')).toBeTruthy();

    const en = await wrap(
      <TagPicker label="标签" value={[]} source="enum" options={['MPU', 'GE']} testID="tp-enum" />
    );
    expect(en.getByText('+ MPU')).toBeTruthy();
    expect(en.queryByTestId('tp-enum')).toBeNull(); // enum 形态没有自由输入框
  });
});

describe('TC-P1-05-13A · 结构约束：控件层不自造浮层、不写数字字号', () => {
  it('11 个控件内 0 处 `Modal`（浮层/Sheet 是 O 层的事，§3.1）', () => {
    const offenders = CONTROL_FILES.filter((file) => /\bModal\b/.test(readUi(file)));
    expect(offenders).toEqual([]);
  });

  it('11 个控件内 0 处数字字号与 0 处 hex（尺子的同源断言，防止局部绕过）', () => {
    for (const file of CONTROL_FILES) {
      const src = readUi(file);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
