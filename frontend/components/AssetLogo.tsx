'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getAssetByCode } from '@/lib/assets';
import { assetDisplayName } from '@/lib/assetDisplayName';

interface AssetLogoProps {
  code: string;
  size?: number;
  showName?: boolean;
  className?: string;
  priority?: boolean;
}

export default function AssetLogo({ 
  code, 
  size = 24, 
  showName = true,
  className = '',
  priority = false
}: AssetLogoProps) {
  const asset = getAssetByCode(code);
  const [imageError, setImageError] = useState(false);

  if (!asset) {
    return <span className={className}>{code}</span>;
  }

  const fallbackContent = (
    <div 
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{ 
        width: size - 4,
        height: size - 4,
        backgroundColor: asset.color,
        fontSize: size * 0.4
      }}
    >
      {asset.code.slice(0, 2)}
    </div>
  );

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div 
        className="rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-gray-100"
        style={{ 
          width: size, 
          height: size,
          minWidth: size,
          minHeight: size,
          padding: '2px'
        }}
      >
        {imageError ? (
          fallbackContent
        ) : (
          <Image
            src={asset.logo}
            alt={`${assetDisplayName(asset.code)} logo`}
            width={size - 4}
            height={size - 4}
            className="object-contain rounded-full"
            unoptimized
            priority={priority}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      {showName && (
        <span className="font-semibold">{assetDisplayName(asset.code)}</span>
      )}
    </div>
  );
}

