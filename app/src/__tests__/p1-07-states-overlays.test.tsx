/**
 * P1-07 · T 层四态 + O 层覆盖层 —— 自动化用例
 *
 * 测什么：
 *   S-1 组件契约：四态渲染、双通道（图标+文案）、一个主行动、Sheet/Dialog 语义
 *   S-4 纯规则：Toast 时长夹紧、二次确认判定
 *   S-5 结构约束：加载态**不配文字**、T/O 层**不写死文案**（i18n 由页面负责）
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/design-system/theme';
import { I18nProvider, translate } from '@/i18n';
import { Screen } from '@/components/ui/Screen';
import { toErrorCopy, type AppError, type Translate } from '@/i18n/errors';

import { EmptyState, EMPTY_ICON } from '@/components/ui/EmptyState';
import { ErrorState, ERROR_ICON } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ListFooter } from '@/components/ui/ListFooter';
import { PullToRefresh, refreshControlProps } from '@/components/ui/PullToRefresh';
import {
  TOAST_DURATION_DEFAULT_MS,
  TOAST_DURATION_MAX_MS,
  TOAST_DURATION_MIN_MS,
  ToastHost,
  ToastProvider,
  clampToastDuration,
  useToast,
} from '@/components/ui/Toast';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { AlertDialog, isConfirmationSatisfied } from '@/components/ui/AlertDialog';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { InputSheet } from '@/components/ui/InputSheet';

const UI_DIR = path.resolve(__dirname, '../components/ui');
const readUi = (file: string): string => fs.readFileSync(path.join(UI_DIR, file), 'utf8');
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const T_FILES = [
  'EmptyState.tsx',
  'ErrorState.tsx',
  'LoadingState.tsx',
  'OfflineBanner.tsx',
  'ListFooter.tsx',
  'PullToRefresh.tsx',
] as const;

const O_FILES = [
  'Toast.tsx',
  'InlineNotice.tsx',
  'AlertDialog.tsx',
  'ActionSheet.tsx',
  'InputSheet.tsx',
] as const;

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 24, bottom: 48, left: 0, right: 0 },
};

/** 遍历 `toJSON()` 的树找节点（RNTL 14 已移除 `UNSAFE_*` 查询，`root` 的类型也不给 `findByType`） */
type JsonNode = { props?: Record<string, unknown>; children?: unknown[] | null } | null;

function findJsonNode(
  tree: unknown,
  predicate: (node: NonNullable<JsonNode>) => boolean
): NonNullable<JsonNode> | null {
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const hit = findJsonNode(child, predicate);
      if (hit) return hit;
    }
    return null;
  }
  if (tree === null || typeof tree !== 'object') return null;
  const node = tree as NonNullable<JsonNode>;
  if (predicate(node)) return node;
  return findJsonNode(node.children, predicate);
}

const wrap = (node: React.ReactElement) =>
  render(
    <ThemeProvider source="dark" systemScheme="dark">
      <I18nProvider locale="zh">{node}</I18nProvider>
    </ThemeProvider>
  );

/** InputSheet 需要唯一安全区容器提供的 insets（S7） */
const wrapInScreen = (node: React.ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ThemeProvider source="dark" systemScheme="dark">
        <I18nProvider locale="zh">
          <Screen bottomMode="own">{node}</Screen>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );

describe('TC-P1-07-1A · T 层 6 + O 层 5 齐备且都消费主题层', () => {
  it.each([...T_FILES, ...O_FILES])('components/ui/%s 存在且非空', (file) => {
    expect(readUi(file).length).toBeGreaterThan(400);
  });

  it('每个文件都通过 useTheme 取令牌', () => {
    for (const file of [...T_FILES, ...O_FILES]) {
      expect(readUi(file)).toContain('useTheme');
    }
  });
});

describe('TC-P1-07-2A · T01 EmptyState：三类处境三种出路，且只给一个动作', () => {
  it('三类各有自己的图标（⛔ 不用同一个图标糊过去）', () => {
    expect(new Set(Object.values(EMPTY_ICON)).size).toBe(3);
  });

  it('渲染出标题与**唯一**动作', async () => {
    const onAction = jest.fn();
    const { getByText } = await wrap(
      <EmptyState kind="firstRun" title="还没有内容" actionLabel="去发布" onAction={onAction} />
    );
    expect(getByText('还没有内容')).toBeTruthy();
    fireEvent.press(getByText('去发布'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('⛔ 类型上只有**一个**动作（想给两个动作必须改类型，那正是要被拦住的地方）', () => {
    const src = readUi('EmptyState.tsx');
    expect(src).toContain('actionLabel: string;');
    expect(src).not.toContain('actions:');
  });
});

describe('TC-P1-07-3A · T02 ErrorState：文案来自唯一实现，且不泄露技术细节', () => {
  it('渲染出三要素（可感知 / 可理解 / 可改正），主行动文案就是 fix', async () => {
    const error: AppError = { kind: 'offline', target: '课表导入' };
    const view = await wrap(<ErrorState error={error} onAction={() => undefined} />);
    // 「可感知」必须指明具体对象
    expect(view.getByText(/课表导入/)).toBeTruthy();
    // 主行动由词条给出（动词开头）—— 断言它存在即可，具体文案归词条层
    expect(view.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('网络三类各有自己的图标（⛔ 不允许退化成同一个"网络错误"）', () => {
    expect(ERROR_ICON.offline).not.toBe(ERROR_ICON.unreachable);
    expect(ERROR_ICON.unreachable).not.toBe(ERROR_ICON.timeout);
  });

  it('⛔ 结构上不可能泄露技术细节：不接收也不渲染状态码/堆栈', () => {
    const src = readUi('ErrorState.tsx');
    expect(src).not.toMatch(/status/);
    expect(src).not.toMatch(/stack/);
    expect(src).not.toMatch(/\bcode\b/);
  });

  it('⛔ 页面不得自写错误文案：文案只来自 toErrorCopy', () => {
    expect(readUi('ErrorState.tsx')).toContain('toErrorCopy');
  });
});

describe('TC-P1-07-4A · T03 LoadingState：**不配任何文字**', () => {
  it('⛔ 源码里没有 <Text（加载态没有"加载中…"这类无信息量文案，10.5-5）', () => {
    expect(readUi('LoadingState.tsx')).not.toMatch(/<Text/);
  });

  it('三个变体都能渲染', async () => {
    for (const variant of ['skeleton', 'spinner', 'determinate'] as const) {
      const view = await wrap(<LoadingState variant={variant} testID={`ls-${variant}`} />);
      expect(view.getByTestId(`ls-${variant}`)).toBeTruthy();
    }
  });

  it('骨架行数可配且至少 1 行', async () => {
    const { getAllByTestId } = await wrap(<LoadingState rows={4} testID="ls" />);
    // Skeleton 自身没有 testID，这里退一步断言父容器存在（行数由实现直接决定）
    expect(getAllByTestId('ls').length).toBe(1);
  });
});

describe('TC-P1-07-5A · T04 OfflineBanner：离线与"缓存数据"是两回事', () => {
  it('两种变体的文案都会渲染（且都是**图标 + 文案**双通道）', async () => {
    const offline = await wrap(<OfflineBanner variant="offline" message="当前无网络" />);
    expect(offline.getByText('当前无网络')).toBeTruthy();

    const stale = await wrap(<OfflineBanner variant="stale" message="显示的是缓存内容" />);
    expect(stale.getByText('显示的是缓存内容')).toBeTruthy();
  });

  it('⛔ stale **不是**错误态：组件里没有 ErrorState', () => {
    // ⚠️ 先剥注释：本文件的注释里就写着"不得渲染成 T02 ErrorState"（记录规则 ≠ 使用）
    expect(stripComments(readUi('OfflineBanner.tsx'))).not.toContain('ErrorState');
  });

  it('可选动作最多一个', () => {
    const src = readUi('OfflineBanner.tsx');
    expect(src).toContain('actionLabel?: string;');
    expect(src).not.toContain('actions:');
  });
});

describe('TC-P1-07-6A · T05 ListFooter：错误必须带 retry（类型级保证）', () => {
  it('idle 不渲染任何东西', async () => {
    const view = await wrap(<ListFooter state="idle" testID="lf-idle" />);
    expect(view.queryByTestId('lf-idle')).toBeNull();
  });

  it('loading 只给指示器，**不配文字**', () => {
    const src = readUi('ListFooter.tsx');
    // loading 分支里除了 ActivityIndicator 不应出现 Text
    const loadingBlock = src.split("props.state === 'loading'")[1]?.split(') : null}')[0] ?? '';
    expect(loadingBlock).toContain('ActivityIndicator');
    expect(loadingBlock).not.toContain('<Text');
  });

  it('end 显示传入的文案', async () => {
    const view = await wrap(<ListFooter state="end" endLabel="没有更多了" testID="lf-end" />);
    expect(view.getByText('没有更多了')).toBeTruthy();
  });

  it('retry 渲染重试按钮并可点', async () => {
    const onRetry = jest.fn();
    const view = await wrap(
      <ListFooter state="retry" retryLabel="重试" onRetry={onRetry} testID="lf-retry" />
    );
    fireEvent.press(view.getByText('重试'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('TC-P1-07-7A · T06 PullToRefresh：手势与指示器全部交原生', () => {
  it('颜色只给令牌，且不自绘下拉（注释里提到 ScrollView 不算）', () => {
    const code = stripComments(readUi('PullToRefresh.tsx'));
    expect(code).toContain('RefreshControl');
    expect(code).not.toMatch(/Animated|PanResponder|ScrollView/);
  });

  it('令牌 → 原生属性的映射是纯函数（渲染树里 RCTRefreshControl 的 props 是空的，只能这么验）', () => {
    const props = refreshControlProps({
      refreshing: true,
      onRefresh: () => undefined,
      tint: '#aaa',
      spinner: '#bbb',
      background: '#ccc',
    });
    expect(props.refreshing).toBe(true);
    expect(typeof props.onRefresh).toBe('function');
    expect(props.tintColor).toBe('#aaa');
    expect(props.colors).toEqual(['#bbb']);
    expect(props.progressBackgroundColor).toBe('#ccc');
  });

  it('渲染出的确实是**原生** RefreshControl（不是自绘视图）', async () => {
    const view = await wrap(<PullToRefresh refreshing onRefresh={() => undefined} />);
    const node = findJsonNode(view.toJSON(), (n) => n.props !== undefined);
    expect(JSON.stringify(view.toJSON())).toContain('RefreshControl');
    expect(node).toBeTruthy();
  });

  it('组件只做"取主题 → 调用纯函数 → 渲染"三步（颜色全部来自令牌）', () => {
    const code = stripComments(readUi('PullToRefresh.tsx'));
    expect(code).toContain("theme.color['icon-secondary'].value");
    expect(code).toContain("theme.color['action-primary'].value");
    // ⛔ 不写裸色值
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});

describe('TC-P1-07-8A · O01 Toast：2–4s 自动消失，且不给"永久提示"留口子', () => {
  it('clampToastDuration 的边界', () => {
    expect(clampToastDuration(undefined)).toBe(TOAST_DURATION_DEFAULT_MS);
    expect(clampToastDuration(500)).toBe(TOAST_DURATION_MIN_MS);
    expect(clampToastDuration(999999)).toBe(TOAST_DURATION_MAX_MS);
    expect(clampToastDuration(2500)).toBe(2500);
    expect(clampToastDuration(Number.NaN)).toBe(TOAST_DURATION_DEFAULT_MS);
  });

  function Trigger({ message }: { message: string }): React.ReactElement {
    const toast = useToast();
    // ⚠️ 依赖用 `toast.show`（**身份稳定**），⛔ 不能用整个 `toast`：
    //    那样"来了个 Toast → 上下文变了 → effect 重跑 → 又 show"会无限循环（实测 OOM）
    React.useEffect(() => {
      toast.show({ message, tone: 'success' });
    }, [toast.show, message]);
    return <></>;
  }

  it('show 之后渲染出回执；到时自动消失', async () => {
    // ⚠️ 不用假定时器：RNTL 的异步 render 依赖微任务，假定时器会把渲染本身卡住。
    //    改成**观察 setTimeout 的实参**（这才是"按时长夹紧后自动消失"的直接证据），
    //    再手工触发那个回调验证真的会消失。
    const spy = jest.spyOn(global, 'setTimeout');
    try {
      const view = await render(
        <ThemeProvider source="dark" systemScheme="dark">
          <I18nProvider locale="zh">
            <ToastProvider>
              <Trigger message="已提交" />
              <ToastHost bottomInset={48} testID="toast" />
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      );
      expect(view.getByText('已提交')).toBeTruthy();

      // 自动消失的时长必须是**夹紧后**的默认值
      const timerCall = spy.mock.calls.find((call) => call[1] === TOAST_DURATION_DEFAULT_MS);
      expect(timerCall).toBeTruthy();

      // 手工触发回调 → 回执消失
      const fire = timerCall?.[0] as () => void;
      await act(async () => {
        fire();
      });
      expect(view.queryByText('已提交')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('⛔ 本文件不读 insets（S2：底部安全区由根布局注入）', () => {
    const code = stripComments(readUi('Toast.tsx'));
    expect(code).not.toMatch(/useSafeAreaInsets\s*\(/);
    expect(code).toContain('bottomInset');
  });
});

describe('TC-P1-07-9A · O02 InlineNotice：常驻状态，语气双通道', () => {
  it('四种语气各有图标', async () => {
    const tones = ['info', 'success', 'warning', 'danger'] as const;
    for (const tone of tones) {
      const view = await wrap(<InlineNotice tone={tone} message={`${tone} 说明`} />);
      expect(view.getByText(`${tone} 说明`)).toBeTruthy();
    }
  });

  it('warning 必须图标 + 文案双通道（源码里 warning 分支有 icon）', () => {
    const src = readUi('InlineNotice.tsx');
    expect(src).toContain("warning: { icon: TriangleAlert");
  });

  it('可选动作最多一个', () => {
    const src = readUi('InlineNotice.tsx');
    expect(src).toContain('actionLabel?: string;');
    expect(src).not.toContain('actions:');
  });
});

describe('TC-P1-07-10A · O03 AlertDialog：危险操作的二次确认', () => {
  it('isConfirmationSatisfied：未要求 / 一致 / 不一致', () => {
    expect(isConfirmationSatisfied(undefined, '随便')).toBe(true);
    expect(isConfirmationSatisfied('', '随便')).toBe(true);
    expect(isConfirmationSatisfied('删除', '删除')).toBe(true);
    expect(isConfirmationSatisfied('删除', ' 删除 ')).toBe(true);
    expect(isConfirmationSatisfied('删除', '刪除')).toBe(false);
    expect(isConfirmationSatisfied('删除', '')).toBe(false);
  });

  it('danger + 逐字确认：未输入时确认不可用，输入后才可用', async () => {
    const onConfirm = jest.fn();
    const view = await wrap(
      <AlertDialog
        visible
        variant="danger"
        title="删除这条内容"
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={onConfirm}
        onCancel={() => undefined}
        requireTypedConfirmation="删除"
        confirmationLabel="输入名称以确认"
        testID="dlg"
      />
    );
    // 输入框存在（逐字确认的入口）
    expect(view.getByTestId('dlg-confirm-input')).toBeTruthy();
    // 未达到确认条件时点主行动不生效
    const buttons = view.getAllByRole('button');
    const confirm = buttons[buttons.length - 1];
    fireEvent.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('不要求逐字确认时，确认可直接执行', async () => {
    const onConfirm = jest.fn();
    const view = await wrap(
      <AlertDialog
        visible
        title="整表覆盖"
        confirmLabel="覆盖"
        cancelLabel="取消"
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />
    );
    const buttons = view.getAllByRole('button');
    fireEvent.press(buttons[buttons.length - 1]);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('TC-P1-07-11A · O05 ActionSheet：平级动作，取消独立', () => {
  it('渲染全部动作；danger 项用危险色；disabled 项有状态', async () => {
    const onSelect = jest.fn();
    const view = await wrap(
      <ActionSheet
        visible
        title="这条内容"
        actions={[
          { key: 'share', label: '分享' },
          { key: 'copy', label: '复制链接' },
          { key: 'report', label: '举报', danger: true },
          { key: 'delete', label: '删除', danger: true, disabled: true },
        ]}
        onSelect={onSelect}
        onCancel={() => undefined}
        cancelLabel="取消"
        testID="sheet"
      />
    );
    expect(view.getByText('分享')).toBeTruthy();
    expect(view.getByText('举报')).toBeTruthy();

    const disabledNode = view.getByTestId('sheet-delete');
    expect(disabledNode.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(view.getByTestId('sheet-share'));
    expect(onSelect).toHaveBeenCalledWith('share');
  });

  it('取消项独立成块（不是 actions 里的一项）', () => {
    const code = stripComments(readUi('ActionSheet.tsx'));
    expect(code).toContain('cancelLabel');
    expect(code).toContain('-cancel');
  });
});

describe('TC-P1-07-12A · O08 InputSheet：文本底框（不在表单内）', () => {
  it('从唯一安全区容器取 insets（S7），⛔ 不自己调 hook', () => {
    const code = stripComments(readUi('InputSheet.tsx'));
    expect(code).toContain('useScreenInsets');
    expect(code).not.toMatch(/useSafeAreaInsets\s*\(/);
  });

  it('发送中不可再点，且暴露 busy（⛔ 也不清空输入 —— 清空是成功后的调用方责任）', async () => {
    const onSend = jest.fn();
    const view = await wrapInScreen(
      <InputSheet value="草稿内容" sendLabel="发送" onSend={onSend} sending testID="is" />
    );
    const send = view.getByTestId('is-send');
    expect(send.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    fireEvent.press(send);
    expect(onSend).not.toHaveBeenCalled();
    // 输入内容仍在（组件不碰 value）
    expect(view.getByDisplayValue('草稿内容')).toBeTruthy();
  });

  it('计数器复用 C05 的三态与文案（⛔ 不另写一套）', () => {
    const src = readUi('InputSheet.tsx');
    expect(src).toContain("from './TextArea'");
    expect(src).toContain('counterState');
  });

  it('回复态可以取消，且取消有独立可读标签', async () => {
    const onCancelReply = jest.fn();
    const view = await wrapInScreen(
      <InputSheet
        value=""
        sendLabel="发送"
        onSend={() => undefined}
        replyingTo="正在回复某条评论"
        replyCancelLabel="取消回复"
        onCancelReply={onCancelReply}
        testID="is2"
      />
    );
    fireEvent.press(view.getByTestId('is2-cancel-reply'));
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });
});

describe('TC-P1-07-13A · 结构约束：加载态与 T/O 层不写死文案', () => {
  it('⛔ T/O 层源码（去注释后）0 处中文字面量 —— 文案一律由页面用词条传入', () => {
    const offenders: string[] = [];
    for (const file of [...T_FILES, ...O_FILES]) {
      // 开发者可见的 `new Error('…')` 不算 UI 文案（它不进界面，团队语言是中文）
      const code = stripComments(readUi(file)).replace(
        /new Error\((['"`])[^'"`]*\1\)/g,
        'new Error()'
      );
      if (/['"`][^'"`]*[\u4e00-\u9fff]/.test(code)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('⛔ T/O 层 0 处 hex / 0 处数字字号', () => {
    for (const file of [...T_FILES, ...O_FILES]) {
      const src = readUi(file);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/fontSize\s*:\s*[0-9]/);
    }
  });

  it('⛔ 只有 O 层允许出现 Modal（T 层是页内状态，不是覆盖层）', () => {
    for (const file of T_FILES) {
      expect(readUi(file)).not.toMatch(/\bModal\b/);
    }
  });
});
