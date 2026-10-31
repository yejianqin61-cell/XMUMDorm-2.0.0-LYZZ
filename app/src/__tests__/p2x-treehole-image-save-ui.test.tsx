import * as React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';
import { TreeholeMedia } from '@/features/campus/TreeholeMedia';
import type { TreeholeSaveResult } from '@/features/campus/treeholeImageSave';
import { configureApi } from '../../../shared/api/platform';
import { renderApp } from './helpers/renderApp';

const urls = ['https://assets.example.test/a.png', 'https://assets.example.test/b.webp'];
const messages = { save: '保存图片', saving: '保存中', saved: '已保存到相册',
  permissionDenied: '未获相册权限，请在设置中允许后重试', failed: '保存失败，请重试' };
const save = jest.fn<Promise<TreeholeSaveResult>, [string]>();
beforeEach(() => save.mockReset().mockResolvedValue({ status: 'saved' }));
const config = { save, messages };
type View = Awaited<ReturnType<typeof renderApp>>;
const next = (view: View) => fireEvent(view.getByTestId('treehole-media-drag-area'),
  'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
// 2026-10-31：详情不循环，末张再"下一张"不换图 —— 回上一张必须用 decrement
const prev = (view: View) => fireEvent(view.getByTestId('treehole-media-drag-area'),
  'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
const source = (view: View, url: string) => waitFor(() =>
  expect(JSON.stringify(view.getByTestId('treehole-media-detail-image').props.source)).toContain(url));

it('未接入图库与词条时不显示可用保存入口，阅读与预览仍可用', async () => {
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" />);
  expect(view.queryByTestId('treehole-save-detail')).toBeNull();
  await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
  expect(view.getByTestId('treehole-media-preview-image')).toBeTruthy();
  expect(view.queryByTestId('treehole-save-preview')).toBeNull();
});

it('详情与全屏预览共享忙态，写入回执前不假成功或重复提交', async () => {
  let finish!: (result: TreeholeSaveResult) => void;
  save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" imageSave={config} />);
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
  expect(view.getByTestId('treehole-save-preview').props.accessibilityState.busy).toBe(true);
  await fireEvent.press(view.getByTestId('treehole-save-preview'));
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(urls[0]);
  expect(view.queryByText(messages.saved)).toBeNull();
  await act(async () => finish({ status: 'saved' }));
  expect(view.getByTestId('treehole-save-detail-notice')).toHaveTextContent(messages.saved);
  expect(view.getByTestId('treehole-save-preview-notice')).toHaveTextContent(messages.saved);
});

it.each(['permission-denied', 'failed', 'throw'] as const)('%s留在预览，提示准确且可恢复', async (status) => {
  if (status === 'throw') save.mockRejectedValueOnce(new Error('secret native path'));
  else save.mockResolvedValueOnce(status === 'failed' ? { status, reason: 'write' } : { status });
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" imageSave={config} />);
  await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
  await fireEvent.press(view.getByTestId('treehole-save-preview'));
  const notice = await waitFor(() => view.getByTestId('treehole-save-preview-notice'));
  expect(within(notice).getByText(status === 'permission-denied' ? messages.permissionDenied : messages.failed)).toBeTruthy();
  expect(view.getByTestId('treehole-media-preview-dialog')).toBeTruthy();
  expect(view.queryByText('secret native path')).toBeNull();
  if (status !== 'permission-denied') await fireEvent.press(within(notice).getByText('重试'));
  else await fireEvent.press(view.getByTestId('treehole-save-preview'));
  await waitFor(() => expect(view.getByTestId('treehole-save-preview-notice')).toHaveTextContent(messages.saved));
  await fireEvent.press(view.getByLabelText('关闭'));
  expect(view.queryByTestId('treehole-media-preview-dialog')).toBeNull();
});

it('切到第二张后详情和预览的保存都使用同一个第二张真实URL', async () => {
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" imageSave={config} />);
  await next(view); await source(view, urls[1]);
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await waitFor(() => expect(view.getByTestId('treehole-save-detail-notice')).toBeTruthy());
  await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
  await fireEvent.press(view.getByTestId('treehole-save-preview'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls.map(call => call[0])).toEqual([urls[1], urls[1]]);
});

it('A保存迟到失败不覆盖B已保存，返回A也不显示旧回执', async () => {
  let finishA!: (result: TreeholeSaveResult) => void;
  save.mockReturnValueOnce(new Promise(resolve => { finishA = resolve; }));
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" imageSave={config} />);
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await next(view); await source(view, urls[1]);
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await waitFor(() => expect(view.getByTestId('treehole-save-detail-notice')).toHaveTextContent(messages.saved));
  await act(async () => finishA({ status: 'failed', reason: 'write' }));
  expect(view.getByTestId('treehole-save-detail-notice')).toHaveTextContent(messages.saved);
  await prev(view); await source(view, urls[0]);
  expect(view.queryByTestId('treehole-save-detail-notice')).toBeNull();
});

it('A到B到A时旧A保存成功不冒充新A操作的结果', async () => {
  let finish!: (result: TreeholeSaveResult) => void;
  save.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" imageSave={config} />);
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await next(view); await source(view, urls[1]);
  await prev(view); await source(view, urls[0]);
  await act(async () => finish({ status: 'saved' }));
  expect(view.queryByTestId('treehole-save-detail-notice')).toBeNull();
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await waitFor(() => expect(view.getByTestId('treehole-save-detail-notice')).toHaveTextContent(messages.saved));
});

it('关闭预览不丢失当前图保存结果，仍可回详情操作', async () => {
  let finish!: (result: TreeholeSaveResult) => void;
  save.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail" imageSave={config} />);
  await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
  await fireEvent.press(view.getByTestId('treehole-save-preview'));
  await fireEvent.press(view.getByLabelText('关闭'));
  await act(async () => finish({ status: 'saved' }));
  expect(view.queryByTestId('treehole-media-preview-dialog')).toBeNull();
  expect(view.getByTestId('treehole-save-detail-notice')).toHaveTextContent(messages.saved);
});

it('换帖后旧保存回执不进入新帖', async () => {
  let finish!: (result: TreeholeSaveResult) => void;
  save.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  function Harness() {
    const [id, setId] = React.useState(7);
    return <><Button label="更换帖子" onPress={() => setId(8)} />
      <TreeholeMedia postId={id} urls={urls} mode="detail" imageSave={config} /></>;
  }
  const view = await renderApp(<Harness />);
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await fireEvent.press(view.getByText('更换帖子'));
  await act(async () => finish({ status: 'saved' }));
  expect(view.queryByTestId('treehole-save-detail-notice')).toBeNull();
  expect(view.getByTestId('treehole-save-detail').props.accessibilityState.busy).toBe(false);
});

it('英文词条由调用方提供，不硬编码模块中文', async () => {
  const english = { save: 'Save image', saving: 'Saving', saved: 'Saved to photos',
    permissionDenied: 'Allow photos access, then retry', failed: 'Save failed. Retry.' };
  const view = await renderApp(<TreeholeMedia postId={7} urls={urls} mode="detail"
    imageSave={{ save, messages: english }} />, { locale: 'en' });
  await fireEvent.press(view.getByTestId('treehole-save-detail'));
  await waitFor(() => expect(view.getByTestId('treehole-save-detail-notice')).toHaveTextContent(english.saved));
  expect(view.queryByText(messages.saved)).toBeNull();
});

it('本地uploads路径沿用现有后端地址解析，显示与保存同一真实地址', async () => {
  configureApi({ baseUrl: 'https://api.example.test' });
  try {
    const view = await renderApp(<TreeholeMedia postId={7} urls={['/uploads/posts/local.png']} mode="detail" imageSave={config} />);
    expect(JSON.stringify(view.getByTestId('treehole-media-detail-image').props.source)).toContain('https://api.example.test/uploads/posts/local.png');
    await fireEvent.press(view.getByTestId('treehole-save-detail'));
    await waitFor(() => expect(save).toHaveBeenCalledWith('https://api.example.test/uploads/posts/local.png'));
    await fireEvent.press(view.getByTestId('treehole-media-drag-area'));
    expect(JSON.stringify(view.getByTestId('treehole-media-preview-image').props.source)).toContain('https://api.example.test/uploads/posts/local.png');
  } finally { configureApi({ baseUrl: null }); }
});
