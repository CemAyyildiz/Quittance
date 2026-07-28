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
            <LoadingSpinner size="sm" label="Small spinner" hideLabel />
            <LoadingSpinner size="md" label="Medium spinner" hideLabel />
            <LoadingSpinner size="lg" label="Large spinner" hideLabel />
          </div>
        </section>

        {/* Color variants */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Color Variants</h2>
          <div className="flex items-end gap-8">
            <LoadingSpinner variant="default" label="Default spinner" hideLabel />
            <LoadingSpinner variant="teal" label="Teal spinner" hideLabel />
            <LoadingSpinner variant="muted" label="Muted spinner" hideLabel />
          </div>
        </section>

        {/* With messages */}
        <section>
          <h2 className="text-lg font-semibold mb-4">With Messages</h2>
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
              message="Connecting to Stellar network…"
              variant="default"
            />
          </div>
        </section>

        {/* Screen-reader only label */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Screen-Reader Only Label</h2>
          <LoadingSpinner
            label="Processing your payment"
            hideLabel
            data-testid="sr-spinner"
          />
        </section>
      </div>
    </div>
  );
}
