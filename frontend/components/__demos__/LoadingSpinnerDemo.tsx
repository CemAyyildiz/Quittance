'use client';

import LoadingSpinner from '@/components/LoadingSpinner';

export default function LoadingSpinnerDemo() {
  return (
    <div className="min-h-screen bg-[var(--paper)] p-8">
      <h1 className="text-2xl font-bold mb-8 font-display">LoadingSpinner — Demo</h1>

      <div className="space-y-10">
        {/* Size variants */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Size Variants</h2>
          <div className="flex items-end gap-8">
            <LoadingSpinner size="small" label="Small (preset)" showLabel />
            <LoadingSpinner size="medium" label="Medium (preset)" showLabel />
            <LoadingSpinner size="large" label="Large (preset)" showLabel />
            <LoadingSpinner size={48} label="Numeric (48px)" showLabel />
          </div>
        </section>

        {/* Color variants */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Color Variants</h2>
          <div className="flex items-end gap-8">
            <LoadingSpinner variant="default" label="Default" showLabel />
            <LoadingSpinner variant="teal" label="Teal" showLabel />
            <LoadingSpinner variant="muted" label="Muted" showLabel />
            <LoadingSpinner variant="primary" label="Primary" showLabel />
            <LoadingSpinner variant="secondary" label="Secondary" showLabel />
          </div>
        </section>

        {/* With messages and labels */}
        <section>
          <h2 className="text-lg font-semibold mb-4">With Messages and Custom Labels</h2>
          <div className="space-y-6">
            <LoadingSpinner
              size="lg"
              message="Fetching invoice details…"
            />
            <LoadingSpinner
              size="sm"
              message="Verifying payment…"
              variant="muted"
            />
            <LoadingSpinner
              size="md"
              label="Connecting to Stellar network…"
              showLabel
              variant="primary"
            />
          </div>
        </section>

        {/* Accessible Screen-Reader Only Label */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Screen-Reader Only Label</h2>
          <LoadingSpinner
            label="Processing your payment"
            data-testid="sr-spinner"
          />
        </section>
      </div>
    </div>
  );
}
