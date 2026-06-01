const store = {};
module.exports = {
  getItem: jest.fn((key) => Promise.resolve(store[key] || null)),
  setItem: jest.fn((key, value) => { store[key] = value; return Promise.resolve(); }),
  multiRemove: jest.fn((keys) => { keys.forEach((k) => delete store[k]); return Promise.resolve(); }),
  removeItem: jest.fn((key) => { delete store[key]; return Promise.resolve(); }),
  __store: store,
  __clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};
