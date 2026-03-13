import type { Contract, Position, Vulnerability } from './types.js';

/**
 * Check if a position is vulnerable given the vulnerability setting.
 */
export function isVulnerable(
  position: Position,
  vulnerability: Vulnerability,
): boolean {
  if (vulnerability === 'none') return false;
  if (vulnerability === 'both') return true;
  if (vulnerability === 'ns') return position === 'North' || position === 'South';
  // vulnerability === 'ew'
  return position === 'East' || position === 'West';
}

/**
 * Score a bridge contract given the contract, vulnerability, and tricks made (0-13).
 * Returns the score from the declaring side's perspective.
 */
export function scoreContract(
  contract: Contract,
  vulnerability: Vulnerability,
  tricksMade: number,
): number {
  const tricksNeeded = contract.level + 6;
  const vul = isVulnerable(contract.declarer, vulnerability);

  if (tricksMade >= tricksNeeded) {
    return scoreMade(contract, vul, tricksMade, tricksNeeded);
  } else {
    return scoreDown(contract, vul, tricksNeeded - tricksMade);
  }
}

function scoreMade(
  contract: Contract,
  vul: boolean,
  tricksMade: number,
  tricksNeeded: number,
): number {
  let score = 0;

  // 1. Trick score (only for contracted tricks, not overtricks)
  const trickScore = calcTrickScore(contract);

  // 2. Game/part-score bonus
  if (trickScore >= 100) {
    score += vul ? 500 : 300; // game bonus
  } else {
    score += 50; // part-score bonus
  }

  // 3. Slam bonuses
  if (contract.level === 6) {
    score += vul ? 750 : 500; // small slam
  } else if (contract.level === 7) {
    score += vul ? 1500 : 1000; // grand slam
  }

  // 4. Trick score
  score += trickScore;

  // 5. Overtricks
  const overtricks = tricksMade - tricksNeeded;
  if (overtricks > 0) {
    if (contract.redoubled) {
      score += overtricks * (vul ? 400 : 200);
    } else if (contract.doubled) {
      score += overtricks * (vul ? 200 : 100);
    } else {
      // Undoubled overtricks at trick value
      score += overtricks * perTrickValue(contract);
    }
  }

  // 6. Insult bonus for making doubled/redoubled
  if (contract.redoubled) score += 100;
  else if (contract.doubled) score += 50;

  return score;
}

function calcTrickScore(contract: Contract): number {
  const { suit, level } = contract;
  let base: number;

  if (suit === 'notrump') {
    base = 40 + (level - 1) * 30;
  } else if (suit === 'hearts' || suit === 'spades') {
    base = level * 30;
  } else {
    // clubs, diamonds
    base = level * 20;
  }

  if (contract.redoubled) return base * 4;
  if (contract.doubled) return base * 2;
  return base;
}

function perTrickValue(contract: Contract): number {
  if (contract.suit === 'notrump') return 30;
  if (contract.suit === 'hearts' || contract.suit === 'spades') return 30;
  return 20; // minor suits
}

function scoreDown(
  contract: Contract,
  vul: boolean,
  undertricks: number,
): number {
  if (!contract.doubled && !contract.redoubled) {
    // Undoubled: 50/100 per undertrick
    return -(undertricks * (vul ? 100 : 50));
  }

  const multiplier = contract.redoubled ? 2 : 1;

  let penalty = 0;

  for (let i = 1; i <= undertricks; i++) {
    if (i === 1) {
      penalty += (vul ? 200 : 100) * multiplier;
    } else if (i <= 3) {
      penalty += (vul ? 300 : 200) * multiplier;
    } else {
      penalty += 300 * multiplier; // 300 for both vul and non-vul from 4th onward
    }
  }

  return -penalty;
}
