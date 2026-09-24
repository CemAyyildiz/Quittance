'use client';

import MemoChip from '@/components/MemoChip';

export default function MemoChipDemo() {
  return (
    <div className="flex flex-col gap-4 p-8">
      <h2 className="text-lg font-semibold">MemoChip</h2>
      <div className="flex flex-wrap items-center gap-3">
        <MemoChip memo="INV-1A2B3C-D4E5F6GH" />
        <MemoChip memo="INV-1A2B3C-D4E5F6GH" maxLength={16} />
        <MemoChip memo="INV-1A2B3C-D4E5F6GH" maxLength={32} />
        <MemoChip memo="short" />
        <MemoChip memo="INV-Z9Y8X7-W6V5U4T3" className="bg-blue-100 text-blue-700" />
        <MemoChip memo="INV-K1L2M3-N4P5Q6R7" className="bg-purple-100 text-purple-700" />
      </div>
    </div>
  );
}
