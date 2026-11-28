import { amountToStroops } from '@/lib/formatStroops';

interface StroopAmountProps {
  /** The stored invoice amount; the stroop total is derived from this value. */
  amount: string | number | null | undefined;
  className?: string;
}

/**
 * The integer stroop total for an invoice amount, shown next to the decimal
 * amount so a payer can compare it with what Freighter will send. A decimal
 * alone can hide a one-stroop difference.
 *
 * Renders nothing when the amount is not a positive whole number of stroops,
 * rather than showing a misleading zero.
 */
export default function StroopAmount({ amount, className = '' }: StroopAmountProps) {
  const stroops = amountToStroops(amount);
  if (stroops === undefined) return null;

  return (
    <span className={className} data-testid="stroop-amount">
      = <span className="font-mono">{stroops}</span> stroops
    </span>
  );
}
