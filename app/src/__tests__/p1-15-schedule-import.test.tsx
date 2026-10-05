/**
 * P1-15 · 工具 B（`T-03` 课表导入）—— 自动化用例
 *
 * 测什么：
 *   S-4 纯规则：**服务端规则的镜像**（10 字门槛）、预览规范化、星期映射、**导入流程状态机**
 *   S-1 页面：粘贴 → 预览 → **整表覆盖二次确认** → 导入；⛔ 未预览不能覆盖
 *   S-5 结构约束：两步流程不塞进 `K01` 的单一提交；错误走三要素；鉴权走 P1-13 的接缝
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { getItem, removeItem, setItem } from '@/shared/storage';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/features/auth/session';
import { Text } from '@/components/ui/Text';

import {
  IMPORT_MIN_TEXT_LENGTH,
  INITIAL_IMPORT_STATE,
  canCommit,
  importReducer,
  normalizeImportPreview,
  summarizePreview,
  validateImportText,
  weekdayLabelKey,
  type ImportAction,
  type ImportState,
} from '@/features/tools/scheduleImport';
import { ImportPreviewList } from '@/features/tools/ImportPreviewList';
import { draftKeyFor } from '@/components/ui/Form';

/* ── 接口打桩：预览 / 提交 ──────────────────────────────────────────── */
jest.mock('../../../shared/api/schedule', () => ({
  previewScheduleImport: jest.fn(),
  commitScheduleImport: jest.fn(),
}));
// 路由打桩
jest.mock('expo-router', () => {
  const state = { pushed: [] as unknown[], backCount: 0, text: '' as string };
  return {
    __state: state,
    useRouter: () => ({
      push: (target: unknown) => state.pushed.push(target),
      back: () => {
        state.backCount += 1;
      },
      canGoBack: () => true,
      replace: () => undefined,
    }),
    useLocalSearchParams: () => ({ text: state.text }),
  };
});

const api = require('../../../shared/api/schedule') as {
  previewScheduleImport: jest.Mock;
  commitScheduleImport: jest.Mock;
};
const routerState = require('expo-router').__state as {
  pushed: unknown[];
  backCount: number;
  text: string;
};

const ToolsDir = path.resolve(__dirname, '../features/tools');
const readTools = (file: string): string => fs.readFileSync(path.join(ToolsDir, file), 'utf8');
const APP_DIR = path.resolve(__dirname, '../app');
const readApp = (file: string): string => fs.readFileSync(path.join(APP_DIR, file), 'utf8');

const ImportScreen = require('../app/tools/schedule-import').default as () => React.ReactElement;

const withProviders = (node: React.ReactElement): React.ReactElement => (
  <SessionProvider>
    <ToastProvider>{node}</ToastProvider>
  </SessionProvider>
);

const SERVER_PREVIEW = {
  courses: [
    { no: '1', course_code: 'G0173', course_name: '大学英语', credit: 3, lecturer: '张三', raw_block: '' },
  ],
  meetings: [
    {
      course_code: 'G0173',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '10:00',
      venue: 'A5#G11',
      week_start: 1,
      week_end: 5,
      raw_line: '',
    },
  ],
  stats: { courseCount: 1, meetingCount: 1, errorCount: 0 },
  errors: [],
};

beforeEach(async () => {
  api.previewScheduleImport.mockReset();
  api.commitScheduleImport.mockReset();
  routerState.pushed.length = 0;
  routerState.backCount = 0;
  routerState.text = '';
  await removeItem(draftKeyFor('schedule-import'));
});

describe('TC-P1-15-1A · 服务端规则的镜像与规范化（纯函数）', () => {
  it('⛔ 10 字门槛与后端一致（`routes/schedule.js` 两处都判 10）', () => {
    expect(IMPORT_MIN_TEXT_LENGTH).toBe(10);
    expect(validateImportText('123456789')).toBe('tooShort');
    expect(validateImportText('1234567890')).toBeNull();
    // 空白不算长度（服务端也是 trim 后判）
    expect(validateImportText('   \n\t  ')).toBe('tooShort');
  });

  it('规范化服务端返回：字段改名 + 去空串 + 类型护栏', () => {
    const preview = normalizeImportPreview(SERVER_PREVIEW);
    expect(preview).not.toBeNull();
    expect(preview?.courses[0]).toEqual({
      courseCode: 'G0173',
      courseName: '大学英语',
      credit: 3,
      lecturer: '张三',
    });
    expect(preview?.meetings[0]).toEqual({
      courseCode: 'G0173',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '10:00',
      venue: 'A5#G11',
    });
  });

  it('⛔ 畸形输入返回 null（⛔ 不在渲染路径上抛）', () => {
    expect(normalizeImportPreview(null)).toBeNull();
    expect(normalizeImportPreview('nope')).toBeNull();
    expect(normalizeImportPreview({})).toBeNull();
    expect(normalizeImportPreview({ courses: 'nope' })).toBeNull();
  });

  it('缺字段不炸：`meetings` / `errors` 缺失时给空数组，空串字段归 null', () => {
    const preview = normalizeImportPreview({
      courses: [{ course_code: 'A', course_name: '   ', credit: 'x', lecturer: '' }],
    });
    expect(preview?.meetings).toEqual([]);
    expect(preview?.errors).toEqual([]);
    expect(preview?.courses[0]).toEqual({
      courseCode: 'A',
      courseName: null,
      credit: null,
      lecturer: null,
    });
  });

  it('摘要：几门课 / 几段课 / 几行没解析', () => {
    const preview = normalizeImportPreview({ ...SERVER_PREVIEW, errors: ['x', 'y'] });
    expect(summarizePreview(preview!)).toEqual({ courseCount: 1, meetingCount: 1, errorCount: 2 });
  });

  it('星期映射：1–7 → 词条 key；越界/非法 → null（⛔ 不猜）', () => {
    expect(weekdayLabelKey(1)).toBe('weekday.1');
    expect(weekdayLabelKey(7)).toBe('weekday.7');
    expect(weekdayLabelKey(0)).toBeNull();
    expect(weekdayLabelKey(8)).toBeNull();
    expect(weekdayLabelKey(1.5)).toBeNull();
    expect(weekdayLabelKey(null)).toBeNull();
  });
});

describe('TC-P1-15-2A · 导入流程状态机（纯函数）', () => {
  const run = (...actions: ImportAction[]): ImportState =>
    actions.reduce(importReducer, INITIAL_IMPORT_STATE);

  it('主链路：preview → previewed → commit → committed', () => {
    const preview = normalizeImportPreview(SERVER_PREVIEW)!;
    const s1 = importReducer(run({ type: 'preview:start' }), { type: 'preview:success', preview });
    expect(s1.phase).toBe('previewed');
    const s2 = importReducer(s1, { type: 'commit:start' });
    expect(s2.phase).toBe('committing');
    expect(importReducer(s2, { type: 'commit:success' }).phase).toBe('committed');
  });

  it('⛔ **改文本即作废预览**（否则用户改完还能把旧文本覆盖上去）', () => {
    const preview = normalizeImportPreview(SERVER_PREVIEW)!;
    const previewed = importReducer(run({ type: 'preview:start' }), {
      type: 'preview:success',
      preview,
    });
    const afterEdit = importReducer(previewed, { type: 'text:changed' });
    expect(afterEdit).toEqual(INITIAL_IMPORT_STATE);
    expect(canCommit(afterEdit)).toBe(false);
  });

  it('⛔ 提交中改文本不打断提交（与 K01 同一条不变量）', () => {
    const preview = normalizeImportPreview(SERVER_PREVIEW)!;
    const committing = run(
      { type: 'preview:start' },
      { type: 'preview:success', preview },
      { type: 'commit:start' }
    );
    expect(importReducer(committing, { type: 'text:changed' }).phase).toBe('committing');
  });

  it('⛔ 防重复请求：previewing / committing 期间再 start 无效（同引用）', () => {
    const previewing = run({ type: 'preview:start' });
    expect(importReducer(previewing, { type: 'preview:start' })).toBe(previewing);
    const preview = normalizeImportPreview(SERVER_PREVIEW)!;
    const committing = run(
      { type: 'preview:start' },
      { type: 'preview:success', preview },
      { type: 'commit:start' }
    );
    expect(importReducer(committing, { type: 'commit:start' })).toBe(committing);
  });

  it('**没有预览就不许提交**（`commit:start` 被忽略）', () => {
    expect(importReducer(INITIAL_IMPORT_STATE, { type: 'commit:start' })).toBe(
      INITIAL_IMPORT_STATE
    );
    expect(canCommit(INITIAL_IMPORT_STATE)).toBe(false);
  });

  it('⛔ 解析出 0 门课程时不许覆盖（会把用户现有课表清空）', () => {
    const empty = normalizeImportPreview({ courses: [] })!;
    const previewed = importReducer(run({ type: 'preview:start' }), {
      type: 'preview:success',
      preview: empty,
    });
    expect(canCommit(previewed)).toBe(false);
  });

  it('预览失败 → 回到 idle 且带着错误；提交失败 → 留在 previewed（可重试）', () => {
    const failed = importReducer(run({ type: 'preview:start' }), {
      type: 'preview:failure',
      error: { kind: 'validation' },
    });
    expect(failed.phase).toBe('idle');
    expect(failed.error).toEqual({ kind: 'validation' });

    const preview = normalizeImportPreview(SERVER_PREVIEW)!;
    const commitFailed = importReducer(
      run({ type: 'preview:start' }, { type: 'preview:success', preview }, { type: 'commit:start' }),
      { type: 'commit:failure', error: { kind: 'offline' } }
    );
    expect(commitFailed.phase).toBe('previewed');
    expect(canCommit(commitFailed)).toBe(true);
  });
});

describe('TC-P1-15-3A · 预览列表渲染', () => {
  it('按课程分组显示课程与它的上课时间（星期走词条，⛔ 不显示 1–7 数字）', async () => {
    const preview = normalizeImportPreview(SERVER_PREVIEW)!;
    const view = await renderApp(<ImportPreviewList testID="pv" preview={preview} />);
    expect(view.getByTestId('pv-summary')).toBeTruthy();
    expect(view.getByText('大学英语')).toBeTruthy();
    // 周一 08:00 10:00 · A5#G11
    expect(view.getByText(/周一/)).toBeTruthy();
    expect(view.getByText(/A5#G11/)).toBeTruthy();
  });

  it('未解析的行**如实列出**（⛔ 不吞掉）', async () => {
    const preview = normalizeImportPreview({
      ...SERVER_PREVIEW,
      errors: ['课程号解析失败：???'],
    })!;
    const view = await renderApp(<ImportPreviewList testID="pv" preview={preview} />);
    expect(view.getByTestId('pv-errors')).toBeTruthy();
    expect(view.getByText('课程号解析失败：???')).toBeTruthy();
  });

  it('课程没有上课时间时给出提示（⛔ 不留白）', async () => {
    const preview = normalizeImportPreview({ courses: SERVER_PREVIEW.courses, meetings: [] })!;
    const view = await renderApp(<ImportPreviewList testID="pv" preview={preview} />);
    expect(view.getByText('这一页没有读到课表，请在课表页再试一次')).toBeTruthy();
  });
});

describe('TC-P1-15-4A · T-03 页面：粘贴 → 预览 → 覆盖确认', () => {
  it('文本太短时预览按钮 disabled（客户端镜像校验）', async () => {
    routerState.text = '短';
    const view = await renderApp(withProviders(<ImportScreen />));
    await waitFor(() => expect(view.getByTestId('import-preview')).toBeTruthy());
    expect(view.getByTestId('import-preview').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('预览成功 → 出预览列表，**但还不能**提交前先点确认', async () => {
    routerState.text = 'G0173 大学英语\nMonday 8.00am-10.00am(A5#G11)(Week 1-5)';
    api.previewScheduleImport.mockResolvedValue(SERVER_PREVIEW);
    const view = await renderApp(withProviders(<ImportScreen />));
    await waitFor(() => expect(view.getByTestId('import-preview')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('import-preview'));
    await waitFor(() => expect(view.getByTestId('import-preview-list')).toBeTruthy());
    // ⛔ 预览不等于导入：接口只调了 preview
    expect(api.previewScheduleImport).toHaveBeenCalledTimes(1);
    expect(api.commitScheduleImport).not.toHaveBeenCalled();
  });

  it('点提交 → 先弹**整表覆盖**确认对话框（不直接覆盖）', async () => {
    routerState.text = 'G0173 大学英语\nMonday 8.00am-10.00am(A5#G11)(Week 1-5)';
    api.previewScheduleImport.mockResolvedValue(SERVER_PREVIEW);
    const view = await renderApp(withProviders(<ImportScreen />));
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('import-preview'));
    await waitFor(() => expect(view.getByTestId('import-preview-list')).toBeTruthy());
    await user.press(view.getByTestId('import-commit'));
    await waitFor(() => expect(view.getByTestId('import-overwrite')).toBeTruthy());
    expect(view.getByText('整表覆盖')).toBeTruthy();
    // ⛔ 确认之前**不能**提交
    expect(api.commitScheduleImport).not.toHaveBeenCalled();
  });

  it('确认后提交，并离开本页（⛔ 不弹成功对话框）', async () => {
    routerState.text = 'G0173 大学英语\nMonday 8.00am-10.00am(A5#G11)(Week 1-5)';
    api.previewScheduleImport.mockResolvedValue(SERVER_PREVIEW);
    api.commitScheduleImport.mockResolvedValue({});
    const view = await renderApp(withProviders(<ImportScreen />));
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('import-preview'));
    await waitFor(() => expect(view.getByTestId('import-preview-list')).toBeTruthy());
    await user.press(view.getByTestId('import-commit'));
    await waitFor(() => expect(view.getByTestId('import-overwrite')).toBeTruthy());
    await user.press(view.getByText('覆盖'));
    await waitFor(() => expect(api.commitScheduleImport).toHaveBeenCalledTimes(1));
    expect(routerState.backCount).toBe(1);
  });

  it('⛔ 服务端 400（文本不合格 / 解析不到课程）→ 走**三要素**摘要，且不是"网络错误"', async () => {
    routerState.text = 'G0173 大学英语\nMonday 8.00am-10.00am(A5#G11)(Week 1-5)';
    api.previewScheduleImport.mockRejectedValue({ status: 400 });
    const view = await renderApp(withProviders(<ImportScreen />));
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('import-preview'));
    await waitFor(() => expect(view.getByTestId('import-summary')).toBeTruthy());
    // 业务失败 ≠ 网络失败（宪法 10.4）
    expect(view.queryByText('网络没连上')).toBeNull();
  });

  it('`T-05` 抓来的文本会**覆盖**旧草稿（用户刚点了读表，那才是他的意图）', async () => {
    // 先放一份旧草稿
    await setItem(draftKeyFor('schedule-import'), { text: '旧的草稿内容' });
    routerState.text = 'G0173 大学英语\nMonday 8.00am-10.00am(A5#G11)(Week 1-5)';
    api.previewScheduleImport.mockResolvedValue(SERVER_PREVIEW);
    const view = await renderApp(withProviders(<ImportScreen />));
    const user = require('@testing-library/react-native').userEvent.setup();
    await waitFor(() => expect(view.getByTestId('import-preview')).toBeTruthy());
    await user.press(view.getByTestId('import-preview'));
    await waitFor(() => expect(api.previewScheduleImport).toHaveBeenCalled());
    // 提交上去的是**抓来的**文本，不是旧草稿
    expect(api.previewScheduleImport.mock.calls[0][0]).toContain('G0173');
    expect(api.previewScheduleImport.mock.calls[0][0]).not.toContain('旧的草稿内容');
    await removeItem(draftKeyFor('schedule-import'));
  });
});

describe('TC-P1-15-5A · 入口与接线', () => {
  it('`T-01` 有课表导入入口（T-02 未建时也要可达）', async () => {
    const ToolsScreen = require('../app/(tabs)/tools').default as () => React.ReactElement;
    const view = await renderApp(<ToolsScreen />);
    await waitFor(() => expect(view.getByTestId('tools-schedule-import')).toBeTruthy());
    const user = require('@testing-library/react-native').userEvent.setup();
    await user.press(view.getByTestId('tools-schedule-import'));
    expect(routerState.pushed[0]).toBe('/tools/schedule-import');
  });

  it('`T-05` 的读表结果带"去确认"动作（页面清单说 T-03 的父页含 T-05）', () => {
    const src = readApp('system/[id].tsx');
    expect(src).toContain('toTabSeparated');
    expect(src).toContain('/tools/schedule-import');
  });
});

describe('TC-P1-15-6A · 结构约束', () => {
  it('⛔ 不自己拼接口路径（走 `shared/api/schedule.js`）', () => {
    // ⚠️ 先剥注释：源码注释里正是在**解释**"文档写的是旧路径、实际是 /import/commit"
    const code = stripComments(readApp('tools/schedule-import.tsx'));
    expect(code).toContain('shared/api/schedule');
    expect(code).not.toContain('/api/schedule/import');
  });

  it('⛔ 鉴权失败走 P1-13 的接缝（不自己判 401/403）', () => {
    const src = readApp('tools/schedule-import.tsx');
    expect(src).toContain('handleAuthFailure');
    expect(src).not.toMatch(/status === 40[13]/);
  });

  it('⛔ 去注释后 0 处中文字面量（文案走词条；服务端错误串除外——它不是我们的文案）', () => {
    for (const file of ['scheduleImport.ts', 'ImportPreviewList.tsx']) {
      const code = stripComments(readTools(file));
      expect(/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)).toBe(false);
    }
    const page = stripComments(readApp('tools/schedule-import.tsx'));
    expect(/['"`][^'"`]*[\u4e00-\u9fff]/.test(page)).toBe(false);
  });

  it('⛔ 0 处 hex / 数字字号 / 自造浮层（覆盖确认走 `O03`）', () => {
    for (const file of ['scheduleImport.ts', 'ImportPreviewList.tsx']) {
      const src = readTools(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
      expect(src).not.toMatch(/\bModal\b/);
    }
    const page = readApp('tools/schedule-import.tsx');
    expect(page).toContain('AlertDialog');
    expect(stripComments(page)).not.toMatch(/\bModal\b/);
  });

  it('⚠️ `ImportPreviewList` **没有**被放进 `components/ui`（1 个消费者 → 9.14-③ 就地写）', () => {
    expect(fs.existsSync(path.join(ToolsDir, 'ImportPreviewList.tsx'))).toBe(true);
    const uiDir = path.resolve(__dirname, '../components/ui');
    expect(fs.existsSync(path.join(uiDir, 'ImportPreviewList.tsx'))).toBe(false);
  });

  it('草稿：本页用 `K01 useForm`（粘贴的长文本进程被杀后不丢，宪法 4.4.3）', () => {
    const src = readApp('tools/schedule-import.tsx');
    expect(src).toContain('useForm');
    expect(src).toContain("formId: 'schedule-import'");
  });

  it('`Text` 之外的静态断言：预览列表是纯展示（⛔ 不发请求、⛔ 不写状态）', () => {
    const src = readTools('ImportPreviewList.tsx');
    expect(src).not.toContain('shared/api');
    expect(src).not.toContain('useState');
    expect(src).not.toContain('useReducer');
  });

  it('本页没有第二套分页/列表机制（它是表单页，不是列表页）', () => {
    const page = readApp('tools/schedule-import.tsx');
    expect(page).not.toContain('ListScreen');
    expect(page).not.toContain('FlashList');
  });
});
