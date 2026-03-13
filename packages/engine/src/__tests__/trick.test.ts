import { describe, it, expect } from 'vitest';
import { createCard } from '../card.js';
import type { Card, Trick } from '../types.js';
import {
  getValidPlays,
  determineTrickWinner,
  createTrick,
  addCardToTrick,
  isTrickComplete,
} from '../trick.js';

describe('createTrick', () => {
  it('creates an empty trick with the given leader', () => {
    const trick = createTrick('North');
    expect(trick.leader).toBe('North');
    expect(trick.cards.size).toBe(0);
  });
});

describe('addCardToTrick', () => {
  it('adds a card and returns a new trick', () => {
    const trick = createTrick('North');
    const card = createCard('spades', 'A');
    const updated = addCardToTrick(trick, 'North', card);
    expect(updated.cards.size).toBe(1);
    expect(updated.cards.get('North')).toEqual(card);
    // Original unchanged
    expect(trick.cards.size).toBe(0);
  });
});

describe('isTrickComplete', () => {
  it('returns false for incomplete trick', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', 'A'));
    trick = addCardToTrick(trick, 'East', createCard('spades', 'K'));
    expect(isTrickComplete(trick)).toBe(false);
  });

  it('returns true when 4 cards are played', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', 'A'));
    trick = addCardToTrick(trick, 'East', createCard('spades', 'K'));
    trick = addCardToTrick(trick, 'South', createCard('spades', 'Q'));
    trick = addCardToTrick(trick, 'West', createCard('spades', 'J'));
    expect(isTrickComplete(trick)).toBe(true);
  });
});

describe('getValidPlays', () => {
  it('allows any card when leading', () => {
    const hand: Card[] = [
      createCard('spades', 'A'),
      createCard('hearts', 'K'),
      createCard('diamonds', 'Q'),
    ];
    const valid = getValidPlays(hand, null, 'notrump');
    expect(valid.length).toBe(3);
  });

  it('allows any card when trick is empty', () => {
    const hand: Card[] = [
      createCard('spades', 'A'),
      createCard('hearts', 'K'),
    ];
    const trick = createTrick('North');
    const valid = getValidPlays(hand, trick, 'hearts');
    expect(valid.length).toBe(2);
  });

  it('must follow suit when possible', () => {
    const hand: Card[] = [
      createCard('spades', 'A'),
      createCard('spades', 'K'),
      createCard('hearts', 'Q'),
    ];
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', '2'));
    const valid = getValidPlays(hand, trick, 'notrump');
    expect(valid.length).toBe(2);
    expect(valid.every(c => c.suit === 'spades')).toBe(true);
  });

  it('allows any card when unable to follow suit', () => {
    const hand: Card[] = [
      createCard('hearts', 'A'),
      createCard('diamonds', 'K'),
      createCard('clubs', 'Q'),
    ];
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', '2'));
    const valid = getValidPlays(hand, trick, 'hearts');
    expect(valid.length).toBe(3);
  });
});

describe('determineTrickWinner', () => {
  it('highest of led suit wins in notrump', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', '10'));
    trick = addCardToTrick(trick, 'East', createCard('spades', 'A'));
    trick = addCardToTrick(trick, 'South', createCard('spades', 'K'));
    trick = addCardToTrick(trick, 'West', createCard('spades', '2'));
    expect(determineTrickWinner(trick, 'notrump')).toBe('East');
  });

  it('off-suit cards do not win in notrump', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', '2'));
    trick = addCardToTrick(trick, 'East', createCard('hearts', 'A'));
    trick = addCardToTrick(trick, 'South', createCard('diamonds', 'A'));
    trick = addCardToTrick(trick, 'West', createCard('clubs', 'A'));
    expect(determineTrickWinner(trick, 'notrump')).toBe('North');
  });

  it('trump beats non-trump', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', 'A'));
    trick = addCardToTrick(trick, 'East', createCard('hearts', '2')); // trump
    trick = addCardToTrick(trick, 'South', createCard('spades', 'K'));
    trick = addCardToTrick(trick, 'West', createCard('spades', 'Q'));
    expect(determineTrickWinner(trick, 'hearts')).toBe('East');
  });

  it('highest trump wins when multiple trumps played', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', 'A'));
    trick = addCardToTrick(trick, 'East', createCard('hearts', '2'));
    trick = addCardToTrick(trick, 'South', createCard('hearts', 'K'));
    trick = addCardToTrick(trick, 'West', createCard('hearts', '5'));
    expect(determineTrickWinner(trick, 'hearts')).toBe('South');
  });

  it('highest of led suit wins when no trump played in suited contract', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', '10'));
    trick = addCardToTrick(trick, 'East', createCard('spades', 'A'));
    trick = addCardToTrick(trick, 'South', createCard('spades', 'K'));
    trick = addCardToTrick(trick, 'West', createCard('spades', '2'));
    expect(determineTrickWinner(trick, 'hearts')).toBe('East');
  });

  it('off-suit non-trump does not beat led suit in suited contract', () => {
    let trick = createTrick('North');
    trick = addCardToTrick(trick, 'North', createCard('spades', '2'));
    trick = addCardToTrick(trick, 'East', createCard('diamonds', 'A'));
    trick = addCardToTrick(trick, 'South', createCard('clubs', 'A'));
    trick = addCardToTrick(trick, 'West', createCard('spades', '3'));
    expect(determineTrickWinner(trick, 'hearts')).toBe('West');
  });
});
