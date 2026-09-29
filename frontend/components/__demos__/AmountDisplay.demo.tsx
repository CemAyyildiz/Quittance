import AmountDisplay from '@/components/AmountDisplay';

export default function AmountDisplayDemo() {
  return (
    <div className="space-y-6 p-6 max-w-md">
      <h2 className="text-xl font-bold">AmountDisplay sizes</h2>
      <AmountDisplay amount={123.456789} assetCode="XLM" size="sm" />
      <AmountDisplay amount={123.456789} assetCode="XLM" size="md" />
      <AmountDisplay amount={123.456789} assetCode="XLM" size="lg" />

      <h2 className="text-xl font-bold">Custom decimals</h2>
      <AmountDisplay amount={100.5} assetCode="USDC" decimals={2} />
      <AmountDisplay amount="250.00" assetCode="USDC" decimals={2} />

      <h2 className="text-xl font-bold">String amount</h2>
      <AmountDisplay amount="500.1234567" assetCode="XLM" />
    </div>
  );
}
