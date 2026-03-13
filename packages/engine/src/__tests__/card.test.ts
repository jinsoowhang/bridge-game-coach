import { describe, it, expect } from 'vitest';
import {
  createCard,
  SUIT_SYMBOLS,
  SUIT_ORDER,
  RANK_ORDER,
  compareBySuit,
  compareByRank,
  cardEquals,
  cardToString,
} from '../card.js';

describe('createCard', () => {
  it('creates a card with the given suit and rank', () => {
    const card = createCard('spades', 'A');
    expect(card.suit).toBe('spades');
    expect(card.rank).toBe('A');
  });
});

describe('SUIT_SYMBOLS', () => {
  it('maps each suit to the correct unicode symbol', () => {
    expect(SUIT_SYMBOLS.clubs).toBe('\u2663');
    expect(SUIT_SYMBOLS.diamonds).toBe('\u2666');
    expect(SUIT_SYMBOLS.hearts).toBe('\u2665');
    expect(SUIT_SYMBOLS.spades).toBe('\u2660');
  });
});

describe('SUIT_ORDER', () => {
  it('orders suits ascending: clubs < diamonds < hearts < spades', () => {
    expect(SUIT_ORDER.clubs).toBeLessThan(SUIT_ORDER.diamonds);
    expect(SUIT_ORDER.diamonds).toBeLessThan(SUIT_ORDER.hearts);
    expect(SUIT_ORDER.hearts).toBeLessThan(SUIT_ORDER.spades);
  });
});

describe('RANK_ORDER', () => {
  it('orders 2 as lowest and A as highest', () => {
    expect(RANK_ORDER['2']).toBe(0);
    expect(RANK_ORDER['A']).toBe(12);
  });

  it('has 13 distinct values', () => {
    const values = Object.values(RANK_ORDER);
    expect(new Set(values).size).toBe(13);
  });
});

describe('compareBySuit', () => {
  it('sorts spades before hearts', () => {
    const aceSpades = createCard('spades', 'A');
    const aceHearts = createCard('hearts', 'A');
    expect(compareBySuit(aceSpades, aceHearts)).toBeLessThan(0);
  });

  it('sorts higher rank first within the same suit', () => {
    const aceSpades = createCard('spades', 'A');
    const kingSpades = createCard('spades', 'K');
    expect(compareBySuit(aceSpades, kingSpades)).toBeLessThan(0);
  });

  it('produces correct display order for a full hand', () => {
    const cards = [
      createCard('clubs', '3'),
      createCard('spades', 'A'),
      createCard('hearts', 'K'),
      createCard('diamonds', '7'),
      createCard('spades', '2'),
    ];
    const sorted = [...cards].sort(compareBySuit);
    expect(sorted.map(c => `${c.rank}${c.suit}`)).toEqual([
      'Aspades',
      '2spades',
      'Khearts',
      '7diamonds',
      '3clubs',
    ]);
  });
});

describe('compareByRank', () => {
  it('ranks A higher than K', () => {
    const ace = createCard('spades', 'A');
    const king = createCard('hearts', 'K');
    expect(compareByRank(ace, king)).toBeGreaterThan(0);
  });

  it('ranks 2 lower than 3', () => {
    const two = createCard('clubs', '2');
    const three = createCard('clubs', '3');
    expect(compareByRank(two, three)).toBeLessThan(0);
  });
});

describe('cardEquals', () => {
  it('returns true for identical cards', () => {
    expect(cardEquals(createCard('spades', 'A'), createCard('spades', 'A'))).toBe(true);
  });

  it('returns false for different suit', () => {
    expect(cardEquals(createCard('spades', 'A'), createCard('hearts', 'A'))).toBe(false);
  });

  it('returns false for different rank', () => {
    expect(cardEquals(createCard('spades', 'A'), createCard('spades', 'K'))).toBe(false);
  });
});

describe('cardToString', () => {
  it('formats ace of spades', () => {
    expect(cardToString(createCard('spades', 'A'))).toBe('A\u2660');
  });

  it('formats 10 of hearts', () => {
    expect(cardToString(createCard('hearts', '10'))).toBe('10\u2665');
  });

  it('formats 2 of clubs', () => {
    expect(cardToString(createCard('clubs', '2'))).toBe('2\u2663');
  });
});
