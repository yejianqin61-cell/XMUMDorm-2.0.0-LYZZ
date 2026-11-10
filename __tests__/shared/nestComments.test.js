const { nestComments } = require('../../shared/utils/nestComments');

describe('nestComments', () => {
  it('returns empty array for null/undefined', () => {
    expect(nestComments(null)).toEqual([]);
    expect(nestComments(undefined)).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(nestComments('string')).toEqual([]);
    expect(nestComments(42)).toEqual([]);
  });

  it('returns top-level comments without replies', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'A' },
      { id: 2, parent_id: null, content: 'B' },
    ];
    const result = nestComments(flat);
    expect(result).toHaveLength(2);
    expect(result[0].replies).toEqual([]);
    expect(result[1].replies).toEqual([]);
  });

  it('nests replies under their parent', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'Parent' },
      { id: 2, parent_id: 1, content: 'Reply' },
    ];
    const result = nestComments(flat);
    expect(result).toHaveLength(1);
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].content).toBe('Reply');
  });

  it('flattens deeper replies under the root while keeping parent_id', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'root', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, parent_id: 1, content: 'reply', created_at: '2026-01-01T01:00:00.000Z' },
      { id: 3, parent_id: 2, content: 'reply to reply', created_at: '2026-01-01T02:00:00.000Z' },
      { id: 4, parent_id: 3, content: 'third level', created_at: '2026-01-01T03:00:00.000Z' },
    ];
    const result = nestComments(flat);
    expect(result).toHaveLength(1);
    expect(result[0].replies.map((r) => r.id)).toEqual([2, 3, 4]);
    expect(result[0].replies[1].parent_id).toBe(2);
  });

  it('sorts roots by latest while replies stay chronological', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'old', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, parent_id: null, content: 'new', created_at: '2026-01-03T00:00:00.000Z' },
      { id: 3, parent_id: 2, content: 'late reply', created_at: '2026-01-04T00:00:00.000Z' },
      { id: 4, parent_id: 2, content: 'early reply', created_at: '2026-01-02T00:00:00.000Z' },
    ];
    const result = nestComments(flat, { sort: 'latest' });
    expect(result.map((r) => r.id)).toEqual([2, 1]);
    expect(result[0].replies.map((r) => r.id)).toEqual([4, 3]);
  });

  it('sorts roots by likes and reply count for hot, ties by time', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'a', like_count: 1, created_at: '2026-01-01T00:00:00.000Z' },
      { id: 2, parent_id: null, content: 'b', like_count: 5, created_at: '2026-01-02T00:00:00.000Z' },
      { id: 3, parent_id: 1, content: 'reply to a', created_at: '2026-01-01T01:00:00.000Z' },
    ];
    const result = nestComments(flat, { sort: 'hot' });
    // b = 10, a = 1*2+1 = 3
    expect(result.map((r) => r.id)).toEqual([2, 1]);
  });

  it('pins featured roots first regardless of sort', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'ordinary', created_at: '2026-01-03T00:00:00.000Z' },
      { id: 2, parent_id: null, content: 'featured', featured: true, featured_at: '2026-01-02T00:00:00.000Z', created_at: '2026-01-01T00:00:00.000Z' },
    ];
    const result = nestComments(flat, { sort: 'latest' });
    expect(result.map((r) => r.id)).toEqual([2, 1]);
  });

  it('drops replies whose root is not loaded', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'root' },
      { id: 9, parent_id: 999, content: 'orphan' },
    ];
    const result = nestComments(flat);
    expect(result).toHaveLength(1);
    expect(result[0].replies).toEqual([]);
  });

  it('handles mixed top-level and replies', () => {
    const flat = [
      { id: 1, parent_id: null, content: 'A' },
      { id: 2, parent_id: 1, content: 'Reply to A' },
      { id: 3, parent_id: null, content: 'B' },
      { id: 4, parent_id: 1, content: 'Another reply to A' },
    ];
    const result = nestComments(flat);
    expect(result).toHaveLength(2);
    expect(result[0].replies).toHaveLength(2);
    expect(result[1].replies).toHaveLength(0);
  });
});
