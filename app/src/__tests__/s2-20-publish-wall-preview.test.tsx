/**
 * 阶段A-06 · 发布页万能墙实时预览
 *
 * 两段：① 表单骨架的预览槽（不传即零变化）；② 发布宿主只对万能墙传预览，
 * 且预览值来自当前表单值。宿主用 mock 表单骨架捕获 props，不重复测表单内部。
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/auth/session', () => ({
  useSession: () => ({ status: 'signedIn', identifier: '42' }),
}));

jest.mock('@/features/publish/usePublishForm', () => ({
  usePublishForm: jest.fn(),
}));

jest.mock('@/features/publish/descriptors', () => ({
  PUBLISH_DESCRIPTORS: mockDescriptors,
}));

jest.mock('@/features/publish/resolveDescriptor', () => ({
  useResolvedDescriptor: (descriptor: unknown) => ({
    loading: false,
    error: null,
    descriptor,
    retry: jest.fn(),
  }),
}));

jest.mock('@/components/ui/Form', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const actual = jest.requireActual('@/components/ui/Form');
  return {
    // 表单槽用例要真实 hook；宿主用例只看骨架收到的 props
    useForm: actual.useForm,
    Form: (props: Record<string, unknown>) => {
      mockFormProps(props);
      return <View testID="form-probe" />;
    },
  };
});

import * as React from 'react';
import { Text } from 'react-native';
import { renderApp } from './helpers/renderApp';
import { Form, useForm } from '@/components/ui/Form';
import { PublishFormHost } from '@/features/publish/PublishFormHost';
import { WallPublishPreview } from '@/features/campus/WallPublishPreview';
import type { PublishFormDescriptor } from '@/features/publish/descriptor';

const mockFormProps = jest.fn();
const mockDescriptors: Record<string, PublishFormDescriptor> = {
  wall: { id: 'wall' } as PublishFormDescriptor,
  confession: { id: 'confession' } as PublishFormDescriptor,
};
const wallDescriptor = mockDescriptors.wall;
const confessionDescriptor = mockDescriptors.confession;
const mockUsePublishForm = require('@/features/publish/usePublishForm').usePublishForm as jest.Mock;

const values = { content: '今晚八点图书馆闭馆', template_key: 'announcement' };
beforeEach(() => {
  mockFormProps.mockClear();
  mockUsePublishForm.mockReturnValue({
    gate: { allowed: true },
    form: { values, state: { formError: null } },
    sections: [],
    labels: {},
    semantic: 'create',
    onSettled: jest.fn(),
  });
});

const lastFormProps = (): Record<string, any> => mockFormProps.mock.calls.at(-1)?.[0] ?? {};

describe('发布宿主只有万能墙带预览（阶段A-06）', () => {
  it('万能墙：预览元素带当前表单值', async () => {
    await renderApp(<PublishFormHost descriptor={wallDescriptor} />);
    const preview = lastFormProps().preview;
    expect(React.isValidElement(preview)).toBe(true);
    expect((preview as React.ReactElement<{ values: unknown }>).type).toBe(WallPublishPreview);
    expect((preview as React.ReactElement<{ values: unknown }>).props.values).toEqual(values);
  });

  it('非万能墙：不传预览', async () => {
    await renderApp(<PublishFormHost descriptor={confessionDescriptor} />);
    expect(lastFormProps().preview).toBeUndefined();
  });
});
