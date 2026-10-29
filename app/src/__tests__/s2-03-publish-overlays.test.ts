/**
 * S2-03 · 发布链路的覆盖层安全区（阶段1-04）—— 自动化用例
 *
 * 盘点结论（阶段1-01 表 §3/§5）：**发布链路没有自绘弹层** ——
 *   · 媒体选择走系统 `ImagePicker`（`PublishMedia` 只给 `onPick`），预览是行内 `<Image>`；
 *   · 日期字段是行内 native picker（`DeadlineField` → `DateTimeField`）；
 *   · 离开确认是 `AlertDialog`（居中，不消费 inset，可接受）；回执是根布局注入 `bottomInset` 的 `Toast`。
 *
 * 所以本任务不做"弹层加 inset"，而是**加一道守卫**，防止以后把自绘覆盖层塞进发布链路却忘了 S7：
 *   1. 发布链路组件不得 import `react-native-safe-area-context`、不得声明 `Modal`；
 *   2. 组件层覆盖层也不得自己读 insets（只从容器上下文 / prop 取）；
 *   3. 这些文件里不得出现写死的数值 padding（S1）。
 *
 * 依据：`docs/app_stage2/task/角色甲-公共壳与消息/阶段1-04-媒体与覆盖层安全区核查.md`。
 */
import * as fs from 'fs';
import * as path from 'path';

import { stripComments } from './helpers/sourceScan';

const UI_DIR = path.resolve(__dirname, '../components/ui');
const PUBLISH_DIR = path.resolve(__dirname, '../features/publish');

const readUi = (file: string): string => stripComments(fs.readFileSync(path.join(UI_DIR, file), 'utf8'));
const readPublish = (file: string): string => stripComments(fs.readFileSync(path.join(PUBLISH_DIR, file), 'utf8'));

/** 发布链路里可能承载媒体/预览的组件 */
const PUBLISH_CHAIN = ['PublishMedia.tsx', 'PublishFormHost.tsx'] as const;
/** 组件层的覆盖层：insets 只能来自容器上下文或 prop */
const OVERLAYS = [
  'AlertDialog.tsx',
  'Toast.tsx',
  'BottomSheet.tsx',
  'ActionSheet.tsx',
  'InputSheet.tsx',
  'ReportSheet.tsx',
  'MediaPicker.tsx',
] as const;

describe('S2-03 发布链路覆盖层安全区', () => {
  it.each(PUBLISH_CHAIN)('%s 不自读 insets、不自绘 Modal', (file) => {
    const source = readPublish(file);
    expect(source).not.toContain('react-native-safe-area-context');
    expect(source).not.toContain('<Modal');
  });

  it.each(OVERLAYS)('%s 不从 safe-area-context 自读 insets（S7）', (file) => {
    const source = readUi(file);
    expect(source).not.toContain('react-native-safe-area-context');
    expect(source).not.toContain('SafeAreaView');
  });

  it('覆盖层不出现写死的数值 padding（S1）', () => {
    const offenders: string[] = [];
    for (const file of OVERLAYS) {
      if (/padding(Top|Bottom|Left|Right)?\s*:\s*\d/.test(readUi(file))) offenders.push(file);
    }
    for (const file of PUBLISH_CHAIN) {
      if (/padding(Top|Bottom|Left|Right)?\s*:\s*\d/.test(readPublish(file))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('覆盖层只在容器注入的位置使用 inset 值', () => {
    // 唯一允许的两处调用点在 Screen 与根布局；其余文件只能接收 prop / 上下文
    const screen = fs.readFileSync(path.join(UI_DIR, 'Screen.tsx'), 'utf8');
    expect(screen).toContain('useSafeAreaInsets');
    for (const file of OVERLAYS) {
      expect(readUi(file)).not.toMatch(/useSafeAreaInsets\s*\(/);
    }
  });
});
