jest.mock('../../shared/api/request', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
}));

const { get, post, patch } = require('../../shared/api/request');
const {
  buyerSendMarketplaceMessage,
  createMarketplaceItem,
  updateMarketplaceItem,
  listMarketplaceMyItems,
} = require('../../shared/api/marketplace');

describe('marketplace buyer chat API', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it('keeps publish, edit, and my-items calls on their server contracts', async () => {
    const form = { append: jest.fn() };
    post.mockResolvedValueOnce({ id: 31 });
    patch.mockResolvedValueOnce({ id: 31, title: '改后标题' });
    get.mockResolvedValueOnce({ list: [{ id: 31 }], hasMore: false });

    await expect(createMarketplaceItem(form)).resolves.toEqual({ id: 31 });
    await expect(updateMarketplaceItem(31, { title: '改后标题' })).resolves.toEqual({ id: 31, title: '改后标题' });
    await expect(listMarketplaceMyItems({ page: 2, pageSize: 10 })).resolves.toEqual({ list: [{ id: 31 }], hasMore: false });

    expect(post).toHaveBeenCalledWith('/api/marketplace/items', form);
    expect(patch).toHaveBeenCalledWith('/api/marketplace/items/31', { title: '改后标题' });
    expect(get).toHaveBeenCalledWith('/api/marketplace/me/items?page=2&pageSize=10');
  });

  it('deduplicates a repeated first-send while the request is pending', async () => {
    let resolve;
    const response = new Promise((done) => { resolve = done; });
    post.mockReturnValue(response);

    const first = buyerSendMarketplaceMessage(5, '还在吗？');
    const second = buyerSendMarketplaceMessage(5, '还在吗？');

    expect(second).toBe(first);
    expect(post).toHaveBeenCalledTimes(1);
    resolve({ thread_id: 11, id: 101 });
    await expect(first).resolves.toEqual({ thread_id: 11, id: 101 });
  });

  it('allows an explicit retry after a failed request', async () => {
    post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ thread_id: 11, id: 102 });

    await expect(buyerSendMarketplaceMessage(5, '稍后联系')).rejects.toThrow('offline');
    await expect(buyerSendMarketplaceMessage(5, '稍后联系')).resolves.toEqual({ thread_id: 11, id: 102 });
    expect(post).toHaveBeenCalledTimes(2);
  });
});
