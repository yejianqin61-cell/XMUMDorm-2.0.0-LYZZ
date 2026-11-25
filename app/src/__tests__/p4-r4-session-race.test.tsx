/**
 * 第四轮 R4-01 续：水合前发出的请求晚到的 401，不能把有效会话清掉。
 */
import * as React from 'react';
import { Button } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { Text } from '@/components/ui/Text';
import { SessionProvider, useSession } from '@/features/auth/session';
import { clearToken, readTokenSync, saveToken } from '@/features/auth/tokenStore';

afterEach(async () => { await clearToken(); });

function Probe(): React.ReactElement {
  const session = useSession();
  return (
    <>
      <Text role="body">{session.status}</Text>
      <Button title="late401" onPress={() => void session.handleAuthFailure({ status: 401 })} />
      <Button title="bad403" onPress={() => void session.handleAuthFailure({ status: 403 })} />
    </>
  );
}

describe('晚到的 401', () => {
  it('手里有令牌时忽略 401；403（坏令牌）才过期', async () => {
    await saveToken('race-token');
    const view = await renderApp(<SessionProvider><Probe /></SessionProvider>);
    await waitFor(() => expect(view.getByText('signedIn')).toBeTruthy());
    await fireEvent.press(view.getByText('LATE401'));
    expect(view.getByText('signedIn')).toBeTruthy();
    expect(readTokenSync()).toBe('race-token');
    await fireEvent.press(view.getByText('BAD403'));
    await waitFor(() => expect(view.getByText('expired')).toBeTruthy());
  });
});
