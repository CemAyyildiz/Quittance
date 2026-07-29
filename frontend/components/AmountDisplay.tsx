import { formatAmount } from '@/lib/utils';

interface AmountDisplayProps {
  amount: number | string;
  assetCode: string;
  decimals?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: { amount: 'text-sm', code: 'text-xs font-semibold' },
  md: { amount: 'text-lg font-bold', code: 'text-sm font-semibold' },
  lg: { amount: 'text-2xl font-bold', code: 'text-base font-semibold' },
};

export default function AmountDisplay({
  amount,
  assetCode,
  decimals = 7,
  size = 'md',
  className = '',
}: AmountDisplayProps) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = formatAmount(numericAmount, decimals);
  const s = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 ${className}`}
      aria-label={`${formatted} ${assetCode}`}
    >
      <span className={s.amount}>{formatted}</span>
      <span className={`text-cyan-600 ${s.code}`}>{assetCode}</span>
    </span>
  );
}
