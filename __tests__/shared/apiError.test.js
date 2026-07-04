const { getApiErrorMessage, apiFailureFromResponse } = require('../../shared/utils/apiError');

describe('getApiErrorMessage', () => {
  it('returns error message if present', () => {
    expect(getApiErrorMessage({ message: 'Something broke' })).toBe('Something broke');
  });

  it('returns trimmed message', () => {
    expect(getApiErrorMessage({ message: '  spaced  ' })).toBe('spaced');
  });

  it('returns unauthorized message for 401', () => {
    expect(getApiErrorMessage({ status: 401 })).toContain('Session expired');
  });

  it('returns 404 hint for 404 without message', () => {
    expect(getApiErrorMessage({ status: 404 })).toContain('Not found');
  });

  it('returns network fallback for unknown errors', () => {
    expect(getApiErrorMessage(null)).toContain('Check network');
    expect(getApiErrorMessage({})).toContain('Check network');
    expect(getApiErrorMessage({ message: '' })).toContain('Check network');
  });

  it('handles various HTTP status codes', () => {
    expect(getApiErrorMessage({ status: 403 })).toContain('Forbidden');
    expect(getApiErrorMessage({ status: 429 })).toContain('Too many requests');
    expect(getApiErrorMessage({ status: 500 })).toContain('Check network');
  });
});

describe('apiFailureFromResponse', () => {
  it('extracts message from data', () => {
    const res = { status: 400 };
    const data = { message: 'Invalid input' };
    const result = apiFailureFromResponse(res, data);
    expect(result.message).toBe('Invalid input');
    expect(result.status).toBe(400);
  });

  it('handles missing data', () => {
    const res = { status: 500 };
    const result = apiFailureFromResponse(res, null);
    expect(result.message).toBeUndefined();
    expect(result.status).toBe(500);
  });

  it('handles missing res', () => {
    const result = apiFailureFromResponse(null, {});
    expect(result.status).toBeUndefined();
  });
});
