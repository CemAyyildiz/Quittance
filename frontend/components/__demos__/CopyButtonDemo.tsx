'use client';

import CopyButton from '@/components/CopyButton';

export default function CopyButtonDemo() {
  return (
    <div className="min-h-screen bg-[var(--paper)] p-8">
      <h1 className="text-2xl font-bold mb-8 font-display">CopyButton — Demo</h1>

      <div className="space-y-10">
        {/* Size variants */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Size Variants</h2>
          <div className="flex items-end gap-4">
            <CopyButton text="GABC123...XYZ" size="sm" label="Copy small" />
            <CopyButton text="GABC123...XYZ" size="md" label="Copy medium" />
            <CopyButton text="GABC123...XYZ" size="lg" label="Copy large" />
          </div>
        </section>

        {/* Style variants */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Style Variants</h2>
          <div className="flex items-end gap-4">
            <CopyButton text="GABC123...XYZ" variant="primary" label="Primary" />
            <CopyButton text="GABC123...XYZ" variant="secondary" label="Secondary" />
            <CopyButton text="GABC123...XYZ" variant="outline" label="Outline" />
            <CopyButton text="GABC123...XYZ" variant="ghost" label="Ghost" />
          </div>
        </section>

        {/* Custom labels */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Custom Labels</h2>
          <div className="flex items-end gap-4">
            <CopyButton
              text="GABC123...XYZ"
              label="Copy wallet address"
              copiedLabel="Address copied!"
            />
          </div>
        </section>

        {/* Icon-only, screen-reader accessible */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Icon-only (Screen-Reader Accessible)</h2>
          <CopyButton
            text="GABC123...XYZ"
            label="Copy invoice link"
            hideLabel
            data-testid="icon-only-copy"
          />
        </section>

        {/* Disabled */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Disabled</h2>
          <CopyButton text="GABC123...XYZ" label="Copy" disabled />
        </section>
      </div>
    </div>
  );
}
