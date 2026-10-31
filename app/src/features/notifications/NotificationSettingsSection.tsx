import * as React from 'react';
import {AppState, type AppStateStatus, View} from 'react-native';

import {Button} from '@/components/ui/Button';
import {SectionHeader} from '@/components/ui/SectionHeader';
import {Text} from '@/components/ui/Text';
import {useTheme} from '@/design-system/theme';
import {useI18n} from '@/i18n';
import {notificationPermission, type NotificationPermission} from './permissions';

export function NotificationSettingsSection(): React.ReactElement {
  const {t} = useI18n();
  const theme = useTheme();
  const [status, setStatus] = React.useState<NotificationPermission | null>(null);
  const [working, setWorking] = React.useState(false);

  const refresh = React.useCallback(async (): Promise<void> => {
    try {
      setStatus(await notificationPermission.read());
    } catch {
      setStatus('denied');
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = async (): Promise<void> => {
    setWorking(true);
    try {
      setStatus(await notificationPermission.request());
    } catch {
      setStatus('denied');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={{gap: theme.space('space_2')}}>
      <SectionHeader title={t('me.settings.notifications')} />
      <Text role="body" colorToken="text-secondary">
        {/* D-2（团队领导 2026-10-31）：提醒说明全 App 用同一句，含 30 分钟提前量 */}
        {t('tools.reminders.class.explanation')}
      </Text>
      {status === 'unavailable' ? (
        <Text testID="settings-notifications-unavailable" role="body">
          {t('me.settings.notifications.unavailable')}
        </Text>
      ) : status === 'granted' ? (
        <Text testID="settings-notifications-granted" role="body">
          {t('me.settings.notifications.enabled')}
        </Text>
      ) : status === 'denied' ? (
        <>
          <Text role="body">{t('me.settings.notifications.disabled')}</Text>
          <Button
            testID="settings-notifications-open-settings"
            variant="secondary"
            label={t('me.settings.notifications.openSettings')}
            onPress={() => { void notificationPermission.openSettings(); }}
          />
        </>
      ) : (
        <Button
          testID="settings-notifications-request"
          label={t('me.settings.notifications.request')}
          loading={working}
          onPress={() => { void request(); }}
        />
      )}
    </View>
  );
}
