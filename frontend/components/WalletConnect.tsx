'use client';

import { useState, useEffect } from 'react';
import {
  checkWalletConnection,
  requestWalletAccess,
  getUserPublicKey,
  getAccountBalance,
  getWalletNetwork,
} from '@/lib/stellar';
import { useWalletStore } from '@/lib/store';
import { paymentMonitor } from '@/lib/payment-monitor';
import { Wallet, LogOut, Loader2, ExternalLink, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatAddress } from '@/lib/utils';
import { explorerAccountUrl } from '@/lib/explorerUrl';

interface WalletConnectProps {
  onConnect?: (publicKey: string) => void;
  onConnectionFailure?: () => void;
}

export default function WalletConnect({ onConnect, onConnectionFailure }: WalletConnectProps = {}) {
  const [loading, setLoading] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const { publicKey, balance, connected, setWallet, updateBalance, disconnect } = useWalletStore();

  useEffect(() => {
    if (connected && publicKey) {
      (async () => {
        const walletNetwork = await getWalletNetwork();
        const configured = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET')
          .trim()
          .toUpperCase();
        const expected = configured === 'TESTNET' ? 'TESTNET' : 'PUBLIC';
        setNetworkMismatch(walletNetwork !== 'UNKNOWN' && walletNetwork !== expected);
      })();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (connected && publicKey && !paymentMonitor.isMonitoring(publicKey)) {
      paymentMonitor.startMonitoring(publicKey, () => loadBalance(publicKey));
      setMonitoringActive(true);
    }

    return () => {
      if (publicKey) {
        paymentMonitor.stopMonitoring(publicKey);
      }
    };
  }, [connected, publicKey]);

  const loadBalance = async (key: string) => {
    try {
      const balances = await getAccountBalance(key);
      const xlmBalance = balances.find((b) => b.assetCode === 'XLM');
      const balanceStr = xlmBalance ? parseFloat(xlmBalance.balance).toFixed(2) : '0.00';
      setWallet(key, balanceStr);
    } catch (error: any) {
      if (error.message?.includes('Not Found') || error.response?.status === 404) {
        setWallet(key, '0.00');
        toast.warning('Account needs funding');
      }
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const allowed = await requestWalletAccess();
      if (allowed) {
        const key = await getUserPublicKey();
        if (key) {
          await loadBalance(key);
          toast.success('Wallet connected');
          onConnect?.(key);
        } else {
          onConnectionFailure?.();
        }
      } else {
        toast.error('Access denied');
        onConnectionFailure?.();
      }
    } catch (error: any) {
      toast.error('Failed to connect. Install Freighter wallet.');
      onConnectionFailure?.();
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (publicKey) {
      paymentMonitor.stopMonitoring(publicKey);
    }
    setMonitoringActive(false);
    disconnect();
    toast.info('Wallet disconnected');
  };

  const toggleMonitoring = () => {
    if (!publicKey) return;

    if (monitoringActive) {
      paymentMonitor.stopMonitoring(publicKey);
      setMonitoringActive(false);
      toast.info('Monitoring paused');
    } else {
      paymentMonitor.startMonitoring(publicKey, () => loadBalance(publicKey));
      setMonitoringActive(true);
    }
  };

  const openExplorer = () => {
    if (!publicKey) return;
    window.open(explorerAccountUrl(publicKey), '_blank');
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        {/* Network mismatch banner */}
        {networkMismatch && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-red-100 border border-red-200 rounded-lg text-sm text-red-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path className="stroke-current" d="M12 9v2m0 6l-6-6m6 6l6-6"/></svg>
            <span>Network mismatch: Freighter is on a different network than the API. Please connect to the correct network.</span>
            <button
              onClick={() => setNetworkMismatch(false)}
              className="ml-2 text-red-600 hover underline"
            >
             Dismiss
            </button>
          </div>
        )}
        {/* Balance */}
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-xs text-gray-500 font-medium">Balance</span>
          <span className="text-sm font-semibold text-gray-900">{balance} XLM</span>
        </div>

        {/* Address */}
        <button
          onClick={openExplorer}
          className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          aria-label="View wallet on Stellar Explorer"
        >
          <Wallet className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-mono text-gray-900">{formatAddress(publicKey, 4)}</span>
          <ExternalLink className="w-3 h-3 text-gray-500" />
        </button>

        {/* Mobile view */}
        <button
          onClick={openExplorer}
          className="sm:hidden p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          aria-label="View wallet on Stellar Explorer"
        >
          <Wallet className="w-5 h-5 text-cyan-600" />
        </button>

        {/* Monitoring Toggle */}
        <button
          onClick={toggleMonitoring}
          className={`p-2 rounded-lg transition-colors ${
            monitoringActive
              ? 'text-green-600 bg-green-50 hover:bg-green-100'
              : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
          }`}
          title={monitoringActive ? 'Monitoring active' : 'Start monitoring'}
          aria-label={monitoringActive ? 'Monitoring active' : 'Start monitoring'}
        >
          {monitoringActive ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Disconnect wallet"
          aria-label="Disconnect wallet"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      aria-busy={loading}
      className="btn btn-primary flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          <span className="hidden sm:inline">Connecting...</span>
        </>
      ) : (
        <>
          <Wallet className="w-5 h-5" />
          <span className="hidden sm:inline">Connect Wallet</span>
        </>
      )}
    </button>
  );
}
