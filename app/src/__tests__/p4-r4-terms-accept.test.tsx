/**
 * 第四轮 R4-32：App 里能接受服务条款（原来没有任何入口，发布永远被门控拦住）。
 */
import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderApp } from './helpers/renderApp';
import { LegalDocScreen } from '@/features/me/LegalScreens';
import { subscribeTermsAccepted } from '@/features/publish/termsAcceptedSignal';
import * as users from '../../../shared/api/users';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true }),
}));
let mockSignedIn = true;
jest.mock('@/features/auth/session', () => ({ useSession: () => ({ isSignedIn: mockSignedIn }) }));
jest.mock('../../../shared/api/users', () => ({ getMyTermsStatus: jest.fn(), acceptCurrentTerms: jest.fn() }));

const status = users.getMyTermsStatus as jest.Mock;
const accept = users.acceptCurrentTerms as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSignedIn = true;
});

describe('R4-32 · 条款页接受入口', () => {
  it('未接受：只有点了「同意」才提交当前版本，成功后通知门控并返回', async () => {
    status.mockResolvedValue({ accepted: false, version: '2026-10-09' });
    accept.mockResolvedValue({ accepted: true });
    const listener = jest.fn();
    const off = subscribeTermsAccepted(listener);
    const view = await renderApp(<LegalDocScreen docId="terms" />);
    const button = await waitFor(() => view.getByTestId('terms-accept'));
    expect(accept).not.toHaveBeenCalled();
    await fireEvent.press(button);
    await waitFor(() => expect(accept).toHaveBeenCalledWith('2026-10-09'));
    await waitFor(() => expect(listener).toHaveBeenCalled());
    expect(mockBack).toHaveBeenCalled();
    off();
  });

  it('已接受或游客：不显示按钮', async () => {
    mockSignedIn = false;
    const view = await renderApp(<LegalDocScreen docId="terms" />);
    expect(view.queryByTestId('terms-accept')).toBeNull();
    expect(status).not.toHaveBeenCalled();
  });
});
