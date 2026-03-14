import { Link } from 'react-router-dom';
import type { Contract, Vulnerability, Position } from '@bridge-coach/engine';
import { SUIT_SYMBOLS } from '@bridge-coach/engine';

interface GameHeaderProps {
  contract: Contract | null;
  vulnerability: Vulnerability;
  phase: string;
  dealer: Position;
}

export function GameHeader({ contract, vulnerability, phase, dealer }: GameHeaderProps) {
  const nsVul = vulnerability === 'ns' || vulnerability === 'both';

  const contractStr = contract
    ? `${contract.level}${contract.suit === 'notrump' ? 'NT' : SUIT_SYMBOLS[contract.suit]} by ${contract.declarer}`
    : phase === 'bidding'
      ? `Bidding · Dealer: ${dealer}`
      : '';

  return (
    <div className="bg-black/30 px-3 py-1.5 flex items-center justify-between text-xs text-[var(--gold)]">
      <Link to="/" className="text-lg hover:opacity-80">&#8962;</Link>
      <span>{contractStr}</span>
      <span
        className={`px-1.5 py-0.5 rounded text-[9px] text-white ${nsVul ? 'bg-[var(--vul-red)]' : 'bg-[var(--vul-none)]'}`}
      >
        {nsVul ? 'VUL' : 'N/V'}
      </span>
    </div>
  );
}
