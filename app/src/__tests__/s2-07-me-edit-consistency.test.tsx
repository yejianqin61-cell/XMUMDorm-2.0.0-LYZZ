/**
 * S2-07 Â· ä¿å­˜åŽä¸€è‡´æ€§ï¼ˆé˜¶æ®µ2-03ï¼‰â€”â€” è‡ªåŠ¨åŒ–ç”¨ä¾‹
 *
 * æµ‹ä»€ä¹ˆï¼ˆ`useMeProfile` + `Form` æäº¤è¯­ä¹‰ï¼‰ï¼š
 *   1. ç¼–è¾‘é¡µä¸Žã€Œæˆ‘çš„ã€å…±ç”¨åŒä¸€ä»½èµ„æ–™ï¼ˆæ•´æ£µæ ‘é‡Œ `getMe` åª 1 æ¬¡ï¼‰ï¼›
 *   2. ä¿å­˜å¤±è´¥ â†’ ä¸å¤±æ•ˆã€è¾“å…¥ä¿ç•™ã€é”™è¯¯æ‘˜è¦å¯è§ã€ä¸è¿”å›žï¼›
 *   3. èµ„æ–™å–æ•°å¤±è´¥ä»å¯è¿›ç©ºè¡¨å•ç¼–è¾‘ï¼ˆåŽŸå…œåº•ä¸é€€åŒ–ï¼‰ï¼›
 *   4. ä¿å­˜æˆåŠŸ â†’ èµ„æ–™ query å¤±æ•ˆå¹¶è¢«é‡å– â†’ æŽ¢é’ˆç«‹å³æ˜¾ç¤ºæ–°æ˜µç§°ã€‚
 *
 * âš ï¸ ç”¨ä¾‹é¡ºåºæœ‰è®²ç©¶ï¼š**å¸¦æäº¤æˆåŠŸçš„ç”¨ä¾‹æ”¾æœ€åŽ**ã€‚æäº¤é“¾ä¼šç•™ä¸‹è¿›è¡Œä¸­çš„å¤±æ•ˆ/é‡å–ï¼Œ
 *    åœ¨ RNTL 14 + React 19 ä¸‹ä¼šæ±¡æŸ“**åŽç»­**ç”¨ä¾‹ï¼ˆ`helpers/renderApp.tsx` å¤´æ³¨é‡Šè®°äº†åŒç±»ç—‡çŠ¶ï¼‰ï¼›
 *    å®žæµ‹"1â†’3â†’2"ä¼šçº¢ã€"1â†’3â†’4â†’2"å…¨ç»¿ã€‚æ¯ä¸ªç”¨ä¾‹ç»“æŸéƒ½æ˜¾å¼ unmountã€‚
 *
 * ä¾æ®ï¼š`docs/app_stage2/task/è§’è‰²ç”²-å…¬å…±å£³ä¸Žæ¶ˆæ¯/é˜¶æ®µ2-03-ä¿å­˜åŽä¸€è‡´æ€§.md`ã€‚
 */
import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, userEvent, waitFor } from '@testing-library/react-native';
import type { RenderResult } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { Text } from '@/components/ui/Text';
import { EditProfileScreen } from '@/features/me/EditProfileScreen';
import { useMeProfile } from '@/features/me/useMeProfile';
import { getMe, updateProfileInfo } from '../../../shared/api/users';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useNavigation: () => ({ dispatch: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('@/features/auth/session', () => ({
  useSession: () => ({
    status: 'signedIn', identifier: 'alice', isSignedIn: true,
    login: jest.fn(), register: jest.fn(), logout: jest.fn(), markExpired: jest.fn(), handleAuthFailure: jest.fn(),
  }),
}));
jest.mock('../../../shared/api/users', () => ({
  getMe: jest.fn(),
  updateProfileInfo: jest.fn(),
  updateAvatar: jest.fn(),
}));

const getMeMock = getMe as jest.Mock;
const updateMock = updateProfileInfo as jest.Mock;

let probeNick: string | null | undefined;
function Probe(): React.ReactElement {
  const me = useMeProfile();
  probeNick = me.profile?.displayName;
  return <Text testID="probe-nick">{me.profile?.displayName ?? 'none'}</Text>;
}

function tree(): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return (
    <QueryClientProvider client={client}>
      <Probe />
      <EditProfileScreen />
    </QueryClientProvider>
  );
}

async function close(view: RenderResult): Promise<void> {
  await act(async () => {
    view.unmount();
  });
}

beforeEach(async () => {
  getMeMock.mockReset();
  updateMock.mockReset();
  probeNick = undefined;
  await AsyncStorage.clear();
});

describe('S2-07 èµ„æ–™ä¿å­˜åŽä¸€è‡´æ€§', () => {
  it('ç¼–è¾‘é¡µä¸Žã€Œæˆ‘çš„ã€å…±ç”¨ä¸€ä»½èµ„æ–™ï¼šgetMe åª 1 æ¬¡ï¼Œè¡¨å•å›žå¡«åŒä¸€ä»½', async () => {
    getMeMock.mockResolvedValue({ id: 1, nickname: 'Alice', college: 'CS' });
    const view = await renderApp(tree());

    await waitFor(() => expect(view.getByTestId('me-edit-form-nickname')).toBeTruthy());
    expect(getMeMock).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('me-edit-form-nickname').props.value).toBe('Alice');
    expect(view.getByTestId('me-edit-form-college').props.value).toBe('CS');
    await close(view);
  });

  it('ä¿å­˜å¤±è´¥ï¼šä¸å¤±æ•ˆã€è¾“å…¥ä¿ç•™ã€é”™è¯¯æ‘˜è¦å¯è§', async () => {
    getMeMock.mockResolvedValue({ id: 1, nickname: 'Alice' });
    updateMock.mockRejectedValue({ kind: 'unreachable' });

    const user = userEvent.setup();
    const view = await renderApp(tree());
    await waitFor(() => expect(view.getByTestId('me-edit-form-nickname')).toBeTruthy());
    await user.clear(view.getByTestId('me-edit-form-nickname'));
    await user.type(view.getByTestId('me-edit-form-nickname'), 'Alice2');
    await user.press(view.getByTestId('me-edit-form-submit'));

    await waitFor(() => expect(view.getByTestId('me-edit-form-summary')).toBeTruthy());
    expect(view.getByTestId('me-edit-form-nickname').props.value).toBe('Alice2');
    expect(getMeMock).toHaveBeenCalledTimes(1);
    await close(view);
  });

  it('èµ„æ–™å–æ•°å¤±è´¥ä»å¯è¿›ç©ºè¡¨å•ï¼ˆåŽŸå…œåº•ä¸é€€åŒ–ï¼‰', async () => {
    getMeMock.mockRejectedValue({ kind: 'unreachable' });
    const view = await renderApp(tree());
    await waitFor(() => expect(view.getByTestId('me-edit-form-nickname')).toBeTruthy());
    expect(view.getByTestId('me-edit-form-nickname').props.value).toBe('');
    await close(view);
  });

  it('ä¿å­˜æˆåŠŸï¼šèµ„æ–™å¤±æ•ˆå¹¶é‡å–ï¼ŒæŽ¢é’ˆç«‹å³æ˜¾ç¤ºæ–°æ˜µç§°', async () => {
    getMeMock.mockResolvedValueOnce({ id: 1, nickname: 'Alice' });
    getMeMock.mockResolvedValue({ id: 1, nickname: 'Alice2' });
    updateMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    const view = await renderApp(tree());
    await waitFor(() => expect(view.getByTestId('me-edit-form-nickname')).toBeTruthy());
    await user.clear(view.getByTestId('me-edit-form-nickname'));
    await user.type(view.getByTestId('me-edit-form-nickname'), 'Alice2');
    await user.press(view.getByTestId('me-edit-form-submit'));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(probeNick).toBe('Alice2'));
    expect(getMeMock).toHaveBeenCalledTimes(2);
    await close(view);
  });
});


