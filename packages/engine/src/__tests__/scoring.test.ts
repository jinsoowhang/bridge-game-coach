import { describe, it, expect } from 'vitest';
import type { Contract } from '../types.js';
import { scoreContract, isVulnerable } from '../scoring.js';

function contract(
  level: number,
  suit: string,
  declarer = 'North' as const,
  doubled = false,
  redoubled = false,
): Contract {
  return {
    level: level as any,
    suit: suit as any,
    declarer,
    doubled,
    redoubled,
  };
}

describe('isVulnerable', () => {
  it('none: nobody is vulnerable', () => {
    expect(isVulnerable('North', 'none')).toBe(false);
    expect(isVulnerable('East', 'none')).toBe(false);
  });

  it('both: everybody is vulnerable', () => {
    expect(isVulnerable('North', 'both')).toBe(true);
    expect(isVulnerable('East', 'both')).toBe(true);
  });

  it('ns: only North/South are vulnerable', () => {
    expect(isVulnerable('North', 'ns')).toBe(true);
    expect(isVulnerable('South', 'ns')).toBe(true);
    expect(isVulnerable('East', 'ns')).toBe(false);
    expect(isVulnerable('West', 'ns')).toBe(false);
  });

  it('ew: only East/West are vulnerable', () => {
    expect(isVulnerable('East', 'ew')).toBe(true);
    expect(isVulnerable('West', 'ew')).toBe(true);
    expect(isVulnerable('North', 'ew')).toBe(false);
  });
});

describe('scoreContract — made contracts', () => {
  it('1H making exactly (7 tricks): part-score', () => {
    // Trick score: 1*30 = 30 (< 100, part-score)
    // 30 + 50 (part-score bonus) = 80
    expect(scoreContract(contract(1, 'hearts'), 'none', 7)).toBe(80);
  });

  it('1NT making exactly: part-score', () => {
    // Trick score: 40 (first trick at NT)
    // 40 + 50 = 90
    expect(scoreContract(contract(1, 'notrump'), 'none', 7)).toBe(90);
  });

  it('3NT making exactly: game, not vulnerable', () => {
    // Trick score: 40 + 2*30 = 100 (>= 100, game)
    // 100 + 300 = 400
    expect(scoreContract(contract(3, 'notrump'), 'none', 9)).toBe(400);
  });

  it('3NT making exactly: game, vulnerable', () => {
    // 100 + 500 = 600
    expect(scoreContract(contract(3, 'notrump'), 'both', 9)).toBe(600);
  });

  it('4H making exactly: game, not vulnerable', () => {
    // Trick score: 4*30 = 120 (game)
    // 120 + 300 = 420
    expect(scoreContract(contract(4, 'hearts'), 'none', 10)).toBe(420);
  });

  it('4S making exactly: game, vulnerable', () => {
    // 4*30 = 120 + 500 = 620
    expect(scoreContract(contract(4, 'spades'), 'both', 10)).toBe(620);
  });

  it('5C making exactly: game, not vulnerable', () => {
    // 5*20 = 100 (game)
    // 100 + 300 = 400
    expect(scoreContract(contract(5, 'clubs'), 'none', 11)).toBe(400);
  });

  it('5D making exactly: game, vulnerable', () => {
    // 5*20 = 100 + 500 = 600
    expect(scoreContract(contract(5, 'diamonds'), 'both', 11)).toBe(600);
  });

  it('2C making exactly: part-score', () => {
    // 2*20 = 40 + 50 = 90
    expect(scoreContract(contract(2, 'clubs'), 'none', 8)).toBe(90);
  });

  it('2NT making exactly: part-score', () => {
    // 40 + 30 = 70 + 50 = 120
    expect(scoreContract(contract(2, 'notrump'), 'none', 8)).toBe(120);
  });

  it('small slam 6H not vulnerable', () => {
    // 6*30 = 180 + 300 (game) + 500 (small slam NV) = 980
    expect(scoreContract(contract(6, 'hearts'), 'none', 12)).toBe(980);
  });

  it('small slam 6H vulnerable', () => {
    // 180 + 500 (game) + 750 (small slam V) = 1430
    expect(scoreContract(contract(6, 'hearts'), 'both', 12)).toBe(1430);
  });

  it('grand slam 7NT not vulnerable', () => {
    // 40 + 6*30 = 220 + 300 (game) + 1000 (grand slam NV) = 1520
    expect(scoreContract(contract(7, 'notrump'), 'none', 13)).toBe(1520);
  });

  it('grand slam 7NT vulnerable', () => {
    // 220 + 500 (game) + 1500 (grand slam V) = 2220
    expect(scoreContract(contract(7, 'notrump'), 'both', 13)).toBe(2220);
  });
});

describe('scoreContract — overtricks', () => {
  it('1H with 1 overtrick undoubled', () => {
    // 30 + 50 + 30 (overtrick) = 110
    expect(scoreContract(contract(1, 'hearts'), 'none', 8)).toBe(110);
  });

  it('1C with 2 overtricks undoubled', () => {
    // 20 + 50 + 2*20 = 110
    expect(scoreContract(contract(1, 'clubs'), 'none', 9)).toBe(110);
  });

  it('1NT with 1 overtrick undoubled', () => {
    // 40 + 50 + 30 = 120
    expect(scoreContract(contract(1, 'notrump'), 'none', 8)).toBe(120);
  });

  it('doubled overtrick not vulnerable', () => {
    // 2H doubled: trick score = 2*30*2 = 120 (game)
    // 120 + 300 (game NV) + 50 (insult) + 100 (1 doubled OT NV) = 570
    expect(scoreContract(contract(2, 'hearts', 'North', true), 'none', 9)).toBe(570);
  });

  it('doubled overtrick vulnerable', () => {
    // 2H doubled: 120 + 500 (game V) + 50 (insult) + 200 (1 doubled OT V) = 870
    expect(scoreContract(contract(2, 'hearts', 'North', true), 'both', 9)).toBe(870);
  });

  it('redoubled overtrick not vulnerable', () => {
    // 2H redoubled: trick = 2*30*4 = 240 (game)
    // 240 + 300 + 100 (insult) + 200 (1 redoubled OT NV) = 840
    expect(scoreContract(contract(2, 'hearts', 'North', false, true), 'none', 9)).toBe(840);
  });
});

describe('scoreContract — insult bonus', () => {
  it('doubled made gives 50 insult bonus', () => {
    // 1H doubled: trick = 30*2 = 60 (part-score)
    // 60 + 50 (part-score) + 50 (insult) = 160
    expect(scoreContract(contract(1, 'hearts', 'North', true), 'none', 7)).toBe(160);
  });

  it('redoubled made gives 100 insult bonus', () => {
    // 1H redoubled: trick = 30*4 = 120 (game)
    // 120 + 300 (game NV) + 100 (insult) = 520
    expect(scoreContract(contract(1, 'hearts', 'North', false, true), 'none', 7)).toBe(520);
  });
});

describe('scoreContract — undertricks (set)', () => {
  it('undoubled down 1 not vulnerable', () => {
    expect(scoreContract(contract(3, 'notrump'), 'none', 8)).toBe(-50);
  });

  it('undoubled down 1 vulnerable', () => {
    expect(scoreContract(contract(3, 'notrump'), 'both', 8)).toBe(-100);
  });

  it('undoubled down 3 not vulnerable', () => {
    expect(scoreContract(contract(4, 'hearts'), 'none', 7)).toBe(-150);
  });

  it('undoubled down 3 vulnerable', () => {
    expect(scoreContract(contract(4, 'hearts'), 'both', 7)).toBe(-300);
  });

  it('doubled down 1 not vulnerable', () => {
    // 100
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'none', 9)).toBe(-100);
  });

  it('doubled down 1 vulnerable', () => {
    // 200
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'both', 9)).toBe(-200);
  });

  it('doubled down 2 not vulnerable', () => {
    // 1st: 100, 2nd: 200 = 300
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'none', 8)).toBe(-300);
  });

  it('doubled down 2 vulnerable', () => {
    // 1st: 200, 2nd: 300 = 500
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'both', 8)).toBe(-500);
  });

  it('doubled down 3 not vulnerable', () => {
    // 1st: 100, 2nd: 200, 3rd: 200 = 500
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'none', 7)).toBe(-500);
  });

  it('doubled down 3 vulnerable', () => {
    // 1st: 200, 2nd: 300, 3rd: 300 = 800
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'both', 7)).toBe(-800);
  });

  it('doubled down 4 not vulnerable', () => {
    // 1st: 100, 2nd: 200, 3rd: 200, 4th: 300 = 800
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'none', 6)).toBe(-800);
  });

  it('doubled down 4 vulnerable', () => {
    // 1st: 200, 2nd: 300, 3rd: 300, 4th: 300 = 1100
    expect(scoreContract(contract(4, 'hearts', 'North', true), 'both', 6)).toBe(-1100);
  });

  it('redoubled down 1 not vulnerable', () => {
    // 200
    expect(scoreContract(contract(4, 'hearts', 'North', false, true), 'none', 9)).toBe(-200);
  });

  it('redoubled down 2 vulnerable', () => {
    // 2 * (200 + 300) = 1000
    expect(scoreContract(contract(4, 'hearts', 'North', false, true), 'both', 8)).toBe(-1000);
  });
});
