'use client';

import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Wallet, ChevronDown, Check, Copy } from 'lucide-react';
import { useWalletStore } from '@/lib/store';
import { copyToClipboard } from '@/lib/utils';

interface UserProfileProps {
  userWallet: string | null;
  onDisconnect?: () => void;
}

export default function UserProfile({ userWallet, onDisconnect }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const copyStatusTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { balance, disconnect } = useWalletStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (copyStatusTimeoutRef.current) {
        clearTimeout(copyStatusTimeoutRef.current);
      }
    };
  }, []);

  if (!userWallet) {
    return null;
  }

  const shortAddress = `${userWallet.substring(0, 6)}...${userWallet.substring(userWallet.length - 4)}`;

  const handleCopyAddress = async () => {
    const copied = await copyToClipboard(userWallet);
    setCopyStatus(copied ? 'copied' : 'error');

    if (copyStatusTimeoutRef.current) {
      clearTimeout(copyStatusTimeoutRef.current);
    }
    copyStatusTimeoutRef.current = setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-gray-200 bg-white"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900">Wallet</p>
          <p className="text-xs text-gray-500 font-mono">{shortAddress}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Connected wallet</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span
                className="text-xs text-gray-500 font-mono"
                title={userWallet}
              >
                {shortAddress}
              </span>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50 transition-colors"
                aria-label="Copy wallet address"
              >
                {copyStatus === 'copied' ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
              </button>
            </div>
            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-medium text-gray-500">XLM balance</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">
                {balance} XLM
              </p>
            </div>
          </div>

          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/dashboard';
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Dashboard
            </button>
          </div>

          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                disconnect();
                if (onDisconnect) onDisconnect();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
