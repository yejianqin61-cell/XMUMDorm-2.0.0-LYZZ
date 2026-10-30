import * as React from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { TreeholeImageSaver } from './treeholeImageSave';

/** 文本由甲统一词条后注入，未接入时不显示可用的原生保存入口。 */
export type TreeholeImageSaveOptions = {
  save: TreeholeImageSaver;
  messages: { save: string; saving: string; saved: string; permissionDenied: string; failed: string };
};
type SavePhase = 'idle' | 'saving' | 'saved' | 'permission-denied' | 'failed';
type Operation = { scope: string; save: TreeholeImageSaver };

/** 一个媒体详情拥有一个控制器，详情与预览只是两个视图，不各自发起事务。 */
export function useTreeholeImageSave(url: string, scope: string, save?: TreeholeImageSaver) {
  const pending = React.useRef<Operation | null>(null);
  const [state, setState] = React.useState<{ operation: Operation; phase: SavePhase } | null>(null);
  React.useEffect(() => () => { pending.current = null; }, []);
  const onSave = React.useCallback(() => {
    if (!save || (pending.current?.scope === scope && pending.current.save === save)) return;
    const operation = { scope, save };
    pending.current = operation;
    setState({ operation, phase: 'saving' });
    const finish = (phase: SavePhase) => {
      if (pending.current !== operation) return;
      setState(previous => previous?.operation === operation ? { operation, phase } : previous);
    };
    void Promise.resolve().then(() => save(url)).then(result => {
      finish(result?.status === 'saved' || result?.status === 'permission-denied' ? result.status : 'failed');
    }).catch(() => finish('failed')).finally(() => {
      if (pending.current === operation) pending.current = null;
    });
  }, [save, scope, url]);
  // 派生可见状态，无需effect重置；A→B→A由媒体请求revision区分。
  const phase: SavePhase = state?.operation.scope === scope && state.operation.save === save ? state.phase : 'idle';
  return { phase, onSave };
}

export function TreeholeImageSaveControls({ options, controller, testID }: {
  options: TreeholeImageSaveOptions;
  controller: ReturnType<typeof useTreeholeImageSave>;
  testID: string;
}): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const { phase, onSave } = controller;
  const message = phase === 'saved' ? options.messages.saved
    : phase === 'permission-denied' ? options.messages.permissionDenied
      : phase === 'failed' ? options.messages.failed : null;
  return (
    <View style={{ gap: theme.space('space_2') }}>
      <Button testID={testID} label={phase === 'saving' ? options.messages.saving : options.messages.save}
        loading={phase === 'saving'} onPress={onSave} variant="secondary" />
      {message ? <InlineNotice testID={`${testID}-notice`} message={message}
        tone={phase === 'saved' ? 'success' : phase === 'permission-denied' ? 'warning' : 'danger'}
        actionLabel={phase === 'failed' ? t('action.retry') : undefined}
        onAction={phase === 'failed' ? onSave : undefined} /> : null}
    </View>
  );
}
