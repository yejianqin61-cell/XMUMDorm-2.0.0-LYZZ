const store: Record<string, string> = {};
export default {
  getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
  multiRemove: jest.fn((keys: string[]) => { keys.forEach((k) => delete store[k]); return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
  __store: store,
  __clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
