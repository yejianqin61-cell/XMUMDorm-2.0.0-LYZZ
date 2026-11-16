const { needsTranslation, translationTarget } = require('../../shared/utils/translation');

describe('needsTranslation', () => {
  test('offers translation for English and Malay text in the Chinese UI', () => {
    expect(needsTranslation('Anyone selling a rice cooker near D6?', 'zh')).toBe(true);
    expect(needsTranslation('Saya nak beli buku teks ini', 'zh')).toBe(true);
  });

  test('offers translation for Chinese text in the English UI', () => {
    expect(needsTranslation('今天食堂的鸡饭很好吃', 'en')).toBe(true);
    expect(needsTranslation('B1 食堂的 chicken rice 不错', 'en')).toBe(true);
  });

  test('stays quiet when the text already matches the UI language', () => {
    expect(needsTranslation('今天食堂的鸡饭很好吃', 'zh')).toBe(false);
    expect(needsTranslation('Anyone selling a rice cooker?', 'en')).toBe(false);
    expect(needsTranslation('这个 app 真好用', 'zh')).toBe(false);
  });

  test('ignores short, emoji-only or empty text', () => {
    expect(needsTranslation('ok', 'zh')).toBe(false);
    expect(needsTranslation('哈哈', 'en')).toBe(false);
    expect(needsTranslation('👍👍👍 123!!!', 'zh')).toBe(false);
    expect(needsTranslation('', 'zh')).toBe(false);
    expect(needsTranslation(null, 'zh')).toBe(false);
  });
});

test('translationTarget follows the UI language', () => {
  expect(translationTarget('en')).toBe('en');
  expect(translationTarget('zh')).toBe('zh');
  expect(translationTarget(undefined)).toBe('zh');
});
