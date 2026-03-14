import type { Bid, ContractBid, BidSuit } from '@bridge-coach/engine';
import { isContractBid, SUIT_SYMBOLS, BID_LEVELS, BID_SUITS } from '@bridge-coach/engine';

interface BiddingBoxProps {
  validBids: Bid[];
  onBid: (bid: Bid) => void;
  highlightedBid?: Bid | null;
}

function bidsMatch(a: Bid, b: Bid): boolean {
  const aIsContract = isContractBid(a);
  const bIsContract = isContractBid(b);
  if (aIsContract && bIsContract) {
    return a.level === b.level && a.suit === b.suit;
  }
  if (!aIsContract && !bIsContract) {
    return (a as { type: string }).type === (b as { type: string }).type;
  }
  return false;
}

const suitDisplay: Record<BidSuit, string> = {
  clubs: SUIT_SYMBOLS.clubs,
  diamonds: SUIT_SYMBOLS.diamonds,
  hearts: SUIT_SYMBOLS.hearts,
  spades: SUIT_SYMBOLS.spades,
  notrump: 'NT',
};

const suitColor: Record<BidSuit, string> = {
  clubs: 'text-[var(--pip-black)]',
  diamonds: 'text-[var(--pip-red)]',
  hearts: 'text-[var(--pip-red)]',
  spades: 'text-[var(--pip-black)]',
  notrump: 'text-[var(--gold-light)]',
};

export function BiddingBox({ validBids, onBid, highlightedBid }: BiddingBoxProps) {
  const isValid = (bid: Bid) => validBids.some((v) => bidsMatch(v, bid));
  const isHighlighted = (bid: Bid) => highlightedBid ? bidsMatch(bid, highlightedBid) : false;

  const passBid: Bid = { type: 'pass' };
  const dblBid: Bid = { type: 'double' };
  const rdblBid: Bid = { type: 'redouble' };

  return (
    <div className="bg-black/25 border-t border-[var(--felt-border)] px-2 py-3">
      {/* Contract bids grid: 7 rows x 5 cols */}
      <div className="grid grid-cols-5 gap-1 max-w-72 mx-auto">
        {BID_LEVELS.map((level) =>
          (BID_SUITS as readonly BidSuit[]).map((suit) => {
            const bid: ContractBid = { level, suit };
            const valid = isValid(bid);
            const highlighted = isHighlighted(bid);

            return (
              <button
                key={`${level}${suit}`}
                onClick={() => valid && onBid(bid)}
                disabled={!valid}
                className={`
                  rounded px-1 py-1.5 text-xs text-center transition-all
                  ${valid
                    ? highlighted
                      ? 'bg-[var(--gold)] text-[var(--felt-dark)] font-bold'
                      : 'bg-[var(--felt-border)] hover:bg-[var(--felt-border)]/80 cursor-pointer'
                    : 'bg-[var(--felt-border)] opacity-40 cursor-not-allowed'
                  }
                `}
              >
                <span className={valid && !highlighted ? suitColor[suit] : ''}>
                  {level}{suitDisplay[suit]}
                </span>
              </button>
            );
          }),
        )}
      </div>

      {/* Pass / Double / Redouble */}
      <div className="flex gap-1 max-w-72 mx-auto mt-2">
        <button
          onClick={() => isValid(passBid) && onBid(passBid)}
          disabled={!isValid(passBid)}
          className={`
            flex-1 rounded py-2 text-sm text-center
            ${isValid(passBid) ? 'bg-[#3a7d4a] text-white cursor-pointer hover:bg-[#3a7d4a]/80' : 'opacity-40 cursor-not-allowed bg-[#3a7d4a]'}
          `}
        >
          Pass
        </button>
        <button
          onClick={() => isValid(dblBid) && onBid(dblBid)}
          disabled={!isValid(dblBid)}
          className={`
            flex-1 rounded py-2 text-sm text-center
            ${isValid(dblBid) ? 'bg-[#8b4513] text-[var(--gold-light)] cursor-pointer hover:bg-[#8b4513]/80' : 'opacity-40 cursor-not-allowed bg-[#8b4513]'}
          `}
        >
          Dbl
        </button>
        <button
          onClick={() => isValid(rdblBid) && onBid(rdblBid)}
          disabled={!isValid(rdblBid)}
          className={`
            flex-1 rounded py-2 text-sm text-center
            ${isValid(rdblBid) ? 'bg-[#8b4513] text-[var(--gold-light)] cursor-pointer hover:bg-[#8b4513]/80' : 'opacity-40 cursor-not-allowed bg-[#8b4513]'}
          `}
        >
          Rdbl
        </button>
      </div>
    </div>
  );
}
