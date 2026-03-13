/**
 * Bridge Game Coach Engine — public API.
 */
export const ENGINE_VERSION = '0.1.0';

export * from './types.js';
export * from './card.js';
export * from './deck.js';
export * from './hand-evaluator.js';
export * from './auction.js';
export * from './trick.js';
export * from './scoring.js';
export * from './game-state.js';
export * from './coaching.js';
export { GameLoop } from './game-loop.js';
export type { GameLoopConfig } from './game-loop.js';
export { selectBid } from './ai/bidding-engine.js';
export { selectPlay } from './ai/play-engine.js';
export { selectOpeningLead, selectDefensivePlay } from './ai/defense-engine.js';
