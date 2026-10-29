/**
 * S2-06 Â· ã€Œæˆ‘çš„ã€èµ„æ–™å•ä¸€å–æ•°ç‚¹ï¼ˆé˜¶æ®µ2-02ï¼‰â€”â€” è‡ªåŠ¨åŒ–ç”¨ä¾‹
 *
 * æµ‹ä»€ä¹ˆï¼ˆä¼šè¯ hook + getMe æŽ¥ç¼ï¼‰ï¼š
 *   1. ä¼šè¯ `restoring` **ä¸å‘è¯·æ±‚**ï¼ˆ"æ¯æ¬¡è¿›å…¥æŠ¥é”™"çš„ç—…æ ¹ï¼‰ï¼›
 *   2. è¿›å…¥ `signedIn` åŽæ°å¥½å–ä¸€æ¬¡å¹¶æ˜¾ç¤ºèµ„æ–™ï¼›
 *   3. å–æ•°å¤±è´¥**ä¿ç•™æ—§èµ„æ–™**å¹¶æ ‡å¤±è´¥ï¼›
 *   4. é‡è¯•æˆåŠŸåŽæ˜¾ç¤ºæ–°èµ„æ–™ï¼›
 *   5. æœªç™»å½•ä¸å±•ç¤ºç¼“å­˜èµ„æ–™ï¼ˆä¸æ³„éœ²ä¸Šä¸€è´¦å·ï¼‰ï¼›
 *   6. æºç æ‰«æï¼š`MeScreen` ä¸å†ç›´æŽ¥ import `getMe`ï¼Œæ”¹ç”¨ `useMeProfile`ã€‚
 *
 * ä¾æ®ï¼š`docs/app_stage2/task/è§’è‰²ç”²-å…¬å…±å£³ä¸Žæ¶ˆæ¯/é˜¶æ®µ2-01-åŠ è½½æ—¶åºå¤çŽ°ä¸Žæ ¹å› .md`ã€
 *       `é˜¶æ®µ2-02-èµ„æ–™å–æ•°æ”¶æˆå•ä¸€å–æ•°ç‚¹.md`ã€‚
 */
import * as fs from 'fs';
import * as path from 'path';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { stripComments } from './helpers/sourceScan';
import { Text } from '@/components/ui/Text';
import { useMeProfile, type MeProfileLoadable } from '@/features/me/useMeProfile';
import { getMe } from '../../../shared/api/users';

jest.mock('@/features/auth/session', () => {
  const state = { status: 'restoring', identifier: null as string | null };
  return {
    __state: state,
    useSession: () => ({
      status: state.status,
      identifier: state.identifier,
      isSignedIn: state.status === 'signedIn',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      markExpired: jest.fn(),
      handleAuthFailure: jest.fn(),
    }),
  };
});
jest.mock('../../../shared/api/users', () => ({ getMe: jest.fn() }));

const sessionState = require('@/features/auth/session').__state as { status: string; identifier: string | null };
const getMeMock = getMe as jest.Mock;

let last: MeProfileLoadable | null = null;
let bump: () => void = () => undefined;

function Probe(): React.ReactElement {
  const [, setTick] = React.useState(0);
  bump = () => setTick((tick) => tick + 1);
  const me = useMeProfile();
  last = me;
  return (
    <>
      <Text testID="nick">{me.profile?.displayName ?? 'none'}</Text>
      <Text testID="failed">{String(me.failed)}</Text>
    </>
  );
}

function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

function tree(client: QueryClient): React.ReactElement {
  return (
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>
  );
}

async function enterSignedIn(): Promise<void> {
  await act(async () => {
    sessionState.status = 'signedIn';
    sessionState.identifier = 'alice';
    bump();
  });
}

beforeEach(() => {
  sessionState.status = 'restoring';
  sessionState.identifier = null;
  last = null;
  getMeMock.mockReset();
});

describe('S2-06 æˆ‘çš„èµ„æ–™å•ä¸€å–æ•°ç‚¹', () => {
  it('æ¢å¤æœŸä¸å‘è¯·æ±‚ï¼ˆç—…æ ¹ï¼šä»¥å‰æŒ‚è½½å³å–ï¼Œ401 åŽåœåœ¨å¤±è´¥æ€ï¼‰', async () => {
    await renderApp(tree(makeClient()));
    expect(getMeMock).not.toHaveBeenCalled();
    expect(last?.loading).toBe(false);
  });

  it('è¿›å…¥å·²ç™»å½•åŽæ°å¥½å–ä¸€æ¬¡å¹¶æ˜¾ç¤ºèµ„æ–™', async () => {
    getMeMock.mockResolvedValue({ id: 1, nickname: 'Alice', level: 2 });
    await renderApp(tree(makeClient()));
    await enterSignedIn();
    await waitFor(() => expect(getMeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(last?.profile?.displayName).toBe('Alice'));
  });

  it('å–æ•°å¤±è´¥ä¿ç•™æ—§èµ„æ–™å¹¶æ ‡å¤±è´¥', async () => {
    getMeMock.mockResolvedValueOnce({ id: 1, nickname: 'Alice' });
    await renderApp(tree(makeClient()));
    await enterSignedIn();
    await waitFor(() => expect(last?.profile?.displayName).toBe('Alice'));

    getMeMock.mockRejectedValueOnce({ kind: 'unreachable' });
    await act(async () => {
      await last?.refresh();
    });

    await waitFor(() => expect(last?.failed).toBe(true));
    expect(last?.profile?.displayName).toBe('Alice');
  });

  it('å¤±è´¥åŽé‡è¯•æˆåŠŸï¼šæ˜¾ç¤ºæ–°èµ„æ–™ã€å¤±è´¥æ¸…é™¤', async () => {
    getMeMock.mockResolvedValueOnce({ id: 1, nickname: 'Alice' });
    await renderApp(tree(makeClient()));
    await enterSignedIn();
    await waitFor(() => expect(last?.profile?.displayName).toBe('Alice'));

    getMeMock.mockRejectedValueOnce({ kind: 'unreachable' });
    await act(async () => {
      await last?.refresh();
    });
    getMeMock.mockResolvedValueOnce({ id: 1, nickname: 'Bob' });
    await act(async () => {
      await last?.refresh();
    });

    await waitFor(() => expect(last?.profile?.displayName).toBe('Bob'));
    expect(last?.failed).toBe(false);
  });

  it('æœªç™»å½•ä¸å±•ç¤ºç¼“å­˜èµ„æ–™ï¼ˆä¸æ³„éœ²ä¸Šä¸€è´¦å·ï¼‰', async () => {
    getMeMock.mockResolvedValue({ id: 1, nickname: 'Alice' });
    const client = makeClient();
    await renderApp(tree(client));
    await enterSignedIn();
    await waitFor(() => expect(last?.profile?.displayName).toBe('Alice'));

    await act(async () => {
      sessionState.status = 'signedOut';
      sessionState.identifier = null;
      bump();
    });

    expect(last?.profile).toBeNull();
    expect(getMeMock).toHaveBeenCalledTimes(1);
  });

  it('æºç æ‰«æï¼šMeScreen ä¸å†ç›´æŽ¥å–æ•°ï¼Œæ”¹ç”¨ useMeProfile', () => {
    const source = stripComments(
      fs.readFileSync(path.resolve(__dirname, '../features/me/MeScreen.tsx'), 'utf8')
    );
    expect(source).toContain('useMeProfile');
    expect(source).not.toContain('getMe');
  });
});


