/**
 * `T-03` 课表导入（页面清单 `T-03`，父 `T-02`/`T-05`，原型 `P4`）
 *
 * 链路：
 * ```
 * T-05 读表（客户端）─┐
 *                    ├─▶ POST /schedule/import/preview ──▶ 预览（ImportPreviewList）
 * 手动粘贴（兜底）────┘                                        │
 *                                    O03 AlertDialog(整表覆盖) ─┘──▶ POST /schedule/import/commit
 * ```
 *
 * 复用（⛔ 不新建第二套机制）：
 *   · **`K01 useForm`** —— 单字段表单，**草稿落盘**：粘贴的长文本在进程被杀后不丢（宪法 4.4.3）
 *   · `K02/K03` 分节与字段外壳、`C05 TextArea`（含计数器）
 *   · `O03 AlertDialog(danger)` —— **整表覆盖必须二次确认**（服务端是删旧写新）
 *   · `K04 ErrorSummary` + `i18n/errors` —— 错误三要素
 *   · **P1-13 的会话接缝** —— 401/403 交给 `useSession().handleAuthFailure`
 *
 * ⚠️ README §7-1：文档写 `POST /api/schedule/import`，**实际是 `/import/commit`**；
 *    路径由 `shared/api/schedule.js` 封装，本页不拼字符串。
 */

import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { AppError } from '@/i18n/errors';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { FormSection } from '@/components/ui/FormSection';
import { FormField } from '@/components/ui/FormField';
import { Screen } from '@/components/ui/Screen';
import { useMailboxBadge } from '@/features/mailbox/useUnread';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useForm } from '@/components/ui/Form';
import { useSession } from '@/features/auth/session';
import { commitScheduleImport, previewScheduleImport } from '../../../../shared/api/schedule';
import { ImportPreviewList } from '@/features/tools/ImportPreviewList';
import { invalidateTimetable } from '@/features/tools/timetable';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import {
  IMPORT_MIN_TEXT_LENGTH,
  canCommit,
  importReducer,
  INITIAL_IMPORT_STATE,
  normalizeImportPreview,
  validateImportText,
  type ScheduleImportPreview,
} from '@/features/tools/scheduleImport';
import type { MessageKey } from '@/i18n/zh';

/** 把请求失败归到统一错误模型（鉴权类交给 P1-13 的接缝） */
function toAppError(error: unknown, label: string, rule: string): AppError {
  const status = (error as { status?: number } | null)?.status;
  if (status === 400) {
    // 服务端 400 = "文本太短 / 没解析到课程" → 是"这一项要改"，不是权限问题
    return { kind: 'validation', target: label, params: { rule } };
  }
  return toToolsError(error);
}

/** 唯一的字段描述符（⛔ 不在两处各写一份，否则迟早不一致） */
const TEXT_FIELD = {
  kind: 'textarea' as const,
  name: 'text',
  labelKey: 'import.pasteLabel' as MessageKey,
  helpKey: 'import.pasteHelp' as MessageKey,
  required: true,
  maxLength: 20000,
};

export default function ScheduleImportScreen(): React.ReactElement {
  useSession();
  const epoch = timetableIdentity().epoch;
  const enteredEpoch = React.useRef(epoch);
  return <ScheduleImportForm key={epoch} acceptScrapedText={enteredEpoch.current === epoch} />;
}

function ScheduleImportForm({ acceptScrapedText }: { acceptScrapedText: boolean }): React.ReactElement {
  const badge = useMailboxBadge();
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const session = useSession();
  const toast = useToast();
  const params = useLocalSearchParams<{ text?: string }>();

  const [state, dispatch] = React.useReducer(importReducer, INITIAL_IMPORT_STATE);
  const [overwriteOpen, setOverwriteOpen] = React.useState(false);
  const previewVersion = React.useRef(0);
  const previewText = React.useRef<string | null>(null);
  const previewBusy = React.useRef(false);
  const commitBusy = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; previewVersion.current += 1; }; }, []);

  const scrapedText = acceptScrapedText && typeof params.text === 'string' ? params.text : '';

  /**
   * ⭐ 文本字段走 `K01 useForm`：**草稿落盘**（宪法 4.4.3）。
   *    ⚠️ `T-05` 抓来的文本一定要赢过旧草稿，所以给它 `skipDraftRestore`：
   *    草稿恢复是异步的，会在挂载后把值**再写一遍** —— 实测结果就是
   *    "刚抓来的长文本被昨天的旧草稿覆盖"，而且旧草稿短到连按钮都变灰。
   *    （草稿**保存**仍然开着：用户之后的编辑照旧不丢。）
   */
  const form = useForm({
    formId: 'schedule-import',
    draftScope: timetableIdentity().scope.startsWith('user') ? timetableIdentity().scope : undefined,
    fields: [TEXT_FIELD],
    initialValues: { text: scrapedText },
    skipDraftRestore: scrapedText.trim() !== '',
    // 本页自己管提交（两步：先预览再覆盖），所以 `onSubmit` 不会被调用
    onSubmit: async () => undefined,
  });

  const text = typeof form.values.text === 'string' ? form.values.text : '';
  const textRef = React.useRef(text); textRef.current = text;
  const previousText = React.useRef(text);
  React.useEffect(() => {
    if (previousText.current === text) return;
    previousText.current = text;
    if (commitBusy.current) return;
    previewVersion.current += 1; previewBusy.current = false; previewText.current = null;
    setOverwriteOpen(false); dispatch({ type: 'text:changed' });
  }, [text]);
  const localProblem = validateImportText(text);

  const runPreview = React.useCallback(async () => {
    if (validateImportText(text) !== null || previewBusy.current || commitBusy.current) return;
    previewBusy.current = true;
    const version = ++previewVersion.current;
    const owner = timetableIdentity().epoch;
    const active = () => mounted.current && version === previewVersion.current && textRef.current === text && owner === timetableIdentity().epoch;
    dispatch({ type: 'preview:start' });
    try {
      const data = await previewScheduleImport(text);
      if (!active()) return;
      const preview = normalizeImportPreview(data);
      if (preview === null) {
        dispatch({ type: 'preview:failure', error: { kind: 'unknown' } });
        return;
      }
      previewText.current = text;
      dispatch({ type: 'preview:success', preview });
    } catch (error) {
      if (!active()) return;
      const appError = await session.handleAuthFailure(error);
      if (!active()) return;
      dispatch({
        type: 'preview:failure',
        error: appError.kind === 'unknown' ? toAppError(error, t('import.pasteLabel'), t('import.parseRule')) : appError,
      });
    } finally {
      if (version === previewVersion.current) previewBusy.current = false;
    }
  }, [text, session, t]);

  const runCommit = React.useCallback(async () => {
    if (commitBusy.current || !canCommit(state) || previewText.current !== text) return;
    commitBusy.current = true;
    const owner = timetableIdentity().epoch;
    setOverwriteOpen(false);
    dispatch({ type: 'commit:start' });
    try {
      await commitScheduleImport(text);
      if (!mounted.current || owner !== timetableIdentity().epoch) return;
      // Import is already committed; a disk error must never invite a second commit.
      await invalidateTimetable().catch(() => undefined);
      dispatch({ type: 'commit:success' });
      // 成功**不弹对话框**（宪法 10.4）：给一条回执 + 返回
      toast.show({
        message: t('import.done', {
          courses: state.preview?.courses.length ?? 0,
        }),
        tone: 'success',
      });
      if (router.canGoBack()) router.back();
      else router.replace('/tools');
    } catch (error) {
      if (!mounted.current || owner !== timetableIdentity().epoch) return;
      const appError = await session.handleAuthFailure(error);
      if (!mounted.current || owner !== timetableIdentity().epoch) return;
      dispatch({
        type: 'commit:failure',
        error: appError.kind === 'unknown' ? toAppError(error, t('import.pasteLabel'), t('import.parseRule')) : appError,
      });
    } finally {
      commitBusy.current = false;
    }
  }, [text, session, toast, t, state, router]);

  const busy = state.phase === 'previewing' || state.phase === 'committing';

  return (
    <Screen testID="screen-schedule-import" titleKey="import.title" bottomMode="own" {...badge}>
      <View style={{ flex: 1, padding: theme.space('space_4'), gap: theme.space('space_4') }}>
        <ErrorSummary
          testID="import-summary"
          title={t('import.failed')}
          formError={state.error}
        />

        <FormSection title={t('import.pasteLabel')} description={t('import.pasteHelp')}>
          <FormField
            testID="import-text"
            field={{ ...TEXT_FIELD, disabledWhen: () => state.phase === 'committing' }}
            value={text}
            values={form.values}
            onChange={(name, value) => {
              if (commitBusy.current) return;
              previewVersion.current += 1; previewBusy.current = false; previewText.current = null;
              setOverwriteOpen(false); dispatch({ type: 'text:changed' }); form.setValue(name, value);
            }}
            // 客户端镜像校验（服务端另有 10 字门槛，且它才是权威）
            errorText={localProblem === 'tooShort' && text !== '' ? t('import.tooShort') : undefined}
          />
        </FormSection>

        <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
          <Button
            testID="import-preview"
            label={t('import.preview')}
            variant="secondary"
            loading={state.phase === 'previewing'}
            disabled={busy || localProblem !== null}
            onPress={() => {
              void runPreview();
            }}
          />
          <Button
            testID="import-commit"
            label={t('import.commit')}
            variant="primary"
            loading={state.phase === 'committing'}
            // ⛔ 只有"已预览且解析出课程"才允许覆盖式导入
            disabled={busy || !canCommit(state)}
            onPress={() => setOverwriteOpen(true)}
          />
        </View>

        {state.preview ? (
          <ImportPreviewList testID="import-preview-list" preview={state.preview} />
        ) : (
          <Text role="caption" colorToken="text-muted" testID="import-hint">
            {t('import.pasteHelp')}
          </Text>
        )}

        {text.trim().length > 0 && text.trim().length < IMPORT_MIN_TEXT_LENGTH ? (
          <Text role="caption" colorToken="text-warning">
            {t('import.tooShort')}
          </Text>
        ) : null}
      </View>

      {/* 整表覆盖：服务端会**删旧写新**，所以必须二次确认（§2.5 `O03 danger`） */}
      <AlertDialog
        testID="import-overwrite"
        visible={overwriteOpen}
        variant="danger"
        title={t('import.overwriteTitle')}
        body={t('import.overwriteBody')}
        confirmLabel={t('import.overwriteConfirm')}
        cancelLabel={t('action.cancel')}
        onCancel={() => setOverwriteOpen(false)}
        onConfirm={() => {
          void runCommit();
        }}
      />
    </Screen>
  );
}
