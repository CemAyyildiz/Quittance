'use client';

import CopyButton from '@/components/CopyButton';

export default function CopyButtonDemo() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <h2 className="text-lg font-semibold">CopyButton</h2>

      <section>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Default</h3>
        <CopyButton text="Hello, world!" />
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Custom Label</h3>
        <CopyButton text="Stellar address: GABCD1234" label="Copy address" />
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Icon Only</h3>
        <CopyButton text="Copy me" iconOnly />
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Styled</h3>
        <CopyButton
          text="Stellar: GAXZKZKZKZKZKZ"
          className="bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
          label="Copy TX"
        />
      </section>
     </div>
  );
}
