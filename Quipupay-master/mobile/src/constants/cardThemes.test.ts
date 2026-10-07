import { CARD_THEMES, DEFAULT_CARD_THEME_ID, getCardTheme } from './cardThemes';

describe('getCardTheme', () => {
  test('returns the matching theme by id', () => {
    const theme = getCardTheme('esmeralda');
    expect(theme.id).toBe('esmeralda');
    expect(theme.name).toBe('Quipu Verde');
    expect(theme.pattern).toBe('grid');
  });

  test('falls back to the default theme for an unknown id', () => {
    expect(getCardTheme('no-existe').id).toBe(DEFAULT_CARD_THEME_ID);
  });

  test('falls back to the default theme when nothing is stored yet', () => {
    expect(getCardTheme(null).id).toBe(DEFAULT_CARD_THEME_ID);
    expect(getCardTheme(undefined).id).toBe(DEFAULT_CARD_THEME_ID);
  });

  test('there are 8 designs to choose from, each with a distinct id', () => {
    expect(CARD_THEMES).toHaveLength(8);
    expect(new Set(CARD_THEMES.map((theme) => theme.id)).size).toBe(8);
  });
});
