import { formatDecimalAmount } from '@/lib/utils';

interface AmountDisplayProps {
  amount: number | string;
  assetCode: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  amountClassName?: string;
}

const sizeStyles = {
  sm: { amount: 'text-sm', code: 'text-xs font-semibold' },
  md: { amount: 'text-lg font-bold', code: 'text-sm font-semibold' },
  lg: { amount: 'text-2xl font-bold', code: 'text-base font-semibold' },
  xl: { amount: 'text-4xl sm:text-6xl font-bold', code: 'text-xl sm:text-2xl font-bold' },
};

export default function AmountDisplay({
  amount,
  assetCode,
  decimals = 7,
  size = 'md',
  className = '',
  amountClassName = '',
}: AmountDisplayProps) {
  const formatted = formatDecimalAmount(amount, decimals);
  const s = sizeStyles[size];

  // Stellar's native asset is exactly XLM. Anything else is a credit asset and
  // is labeled with the code stored on the invoice, never an alias.
  const isNative = assetCode === 'XLM';

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-2 ${className}`}>
      <span
        className="inline-flex items-baseline gap-1.5"
        aria-label={`${formatted} ${assetCode}`}
      >
        <span className={`${s.amount} ${amountClassName}`}>{formatted}</span>
        <span className={`text-cyan-600 ${s.code}`}>{assetCode}</span>
      </span>
      {!isNative && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
          Not native XLM
        </span>
      )}
    </span>
  );
}
