const { toFormData } = require('../../shared/utils/toFormData');

describe('toFormData', () => {
  it('returns a FormData instance', () => {
    const fd = toFormData({ name: 'test' });
    expect(fd).toBeInstanceOf(FormData);
  });

  it('includes body key-value pairs', () => {
    const fd = toFormData({ name: 'test', price: 10 });
    expect(fd.get('name')).toBe('test');
    expect(fd.get('price')).toBe('10');
  });

  it('skips undefined and null values', () => {
    const fd = toFormData({ name: 'test', skip: null, also: undefined });
    expect(fd.get('name')).toBe('test');
    expect(fd.get('skip')).toBeNull();
    expect(fd.get('also')).toBeNull();
  });

  it('handles empty body', () => {
    const fd = toFormData();
    expect(fd).toBeInstanceOf(FormData);
  });

  it('handles empty body with files', () => {
    const fd = toFormData({}, []);
    expect(fd).toBeInstanceOf(FormData);
  });
});
