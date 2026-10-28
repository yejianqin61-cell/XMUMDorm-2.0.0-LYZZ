jest.mock('../../shared/api/request', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
}));

const { post } = require('../../shared/api/request');
const { buyerSendMarketplaceMessage } = require('../../shared/api/marketplace');

describe('marketplace buyer chat API', () => {
  beforeEach(() => post.mockReset());

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
