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
