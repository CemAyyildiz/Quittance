import { formatDecimalAmount } from '@/lib/utils';

interface AmountDisplayProps {
  amount: number | string;
  assetCode: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /**
   * Label a non-native asset, so the amount is never mistaken for XLM.
   * Native XLM is already named by its code and gets no extra label.
   */
  showAssetKind?: boolean;
}

const sizeStyles = {
  sm: { amount: 'text-sm', code: 'text-xs font-semibold' },
  md: { amount: 'text-lg font-bold', code: 'text-sm font-semibold' },
  lg: { amount: 'text-2xl font-bold', code: 'text-base font-semibold' },
  xl: {
    amount:
      'text-4xl sm:text-6xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent break-all',
    code: 'text-xl font-bold',
  },
};

export default function AmountDisplay({
  amount,
  assetCode,
  decimals = 7,
  size = 'md',
  className = '',
  showAssetKind = false,
}: AmountDisplayProps) {
  const formatted = formatDecimalAmount(amount, decimals);
  const s = sizeStyles[size];
  // The stored asset code is shown as-is; only its native/credit status is derived.
  const showCreditLabel = showAssetKind && assetCode !== 'XLM';

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className="inline-flex items-baseline gap-1.5" aria-label={`${formatted} ${assetCode}`}>
        <span className={s.amount}>{formatted}</span>
        <span className={`text-cyan-600 ${s.code}`}>{assetCode}</span>
      </span>
      {showCreditLabel && (
        <span className="text-xs font-medium text-gray-600">Credit asset, not native XLM</span>
      )}
    </span>
  );
}
