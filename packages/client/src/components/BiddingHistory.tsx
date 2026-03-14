import type { Bid, Position } from '@bridge-coach/engine';
import { isContractBid, POSITIONS, SUIT_SYMBOLS } from '@bridge-coach/engine';

interface BiddingHistoryProps {
  auction: Bid[];
  dealer: Position;
}

export function BiddingHistory({ auction, dealer }: BiddingHistoryProps) {
  if (auction.length === 0) return null;

  const dealerIndex = POSITIONS.indexOf(dealer);
  const padded: (Bid | null)[] = [
    ...Array(dealerIndex).fill(null),
    ...auction,
  ];

  const rows: (Bid | null)[][] = [];
  for (let i = 0; i < padded.length; i += 4) {
    rows.push(padded.slice(i, i + 4));
  }
  while (rows.length > 0 && rows[rows.length - 1].length < 4) {
    rows[rows.length - 1].push(null);
  }

  const formatBid = (bid: Bid): string => {
    if (isContractBid(bid)) {
      return `${bid.level}${bid.suit === 'notrump' ? 'NT' : SUIT_SYMBOLS[bid.suit]}`;
    }
    if (bid.type === 'pass') return 'Pass';
    if (bid.type === 'double') return 'Dbl';
    return 'Rdbl';
  };

  return (
    <div className="mx-2 bg-black/30 rounded-lg p-2">
      <div className="grid grid-cols-4 gap-0.5 text-center text-xs text-[var(--gold)] mb-1">
        {POSITIONS.map((p) => (
          <span key={p}>{p[0]}</span>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-4 gap-0.5 text-center text-xs text-[var(--gold-light)]">
          {row.map((bid, ci) => (
            <span key={ci}>
              {bid ? formatBid(bid) : ri === rows.length - 1 ? '' : '-'}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
