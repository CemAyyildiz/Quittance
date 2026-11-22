'use client';

import { useState, useEffect } from 'react';
import {
  checkWalletConnection,
  requestWalletAccess,
  getUserPublicKey,
  getAccountBalance,
} from '@/lib/stellar';
import { useWalletStore } from '@/lib/store';
import { paymentMonitor } from '@/lib/payment-monitor';
import { Wallet, LogOut, Loader2, ExternalLink, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { formatAddress } from '@/lib/utils';
import { explorerAccountUrl } from '@/lib/explorerUrl';
import { NEXT_PUBLIC_STELLAR_NETWORK } from '@/lib/stellar';

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
    if (connected && publicKey && !paymentMonitor.isMonitoring(publicKey)) {
      paymentMonitor.startMonitoring(publicKey, () => loadBalance(publicKey));
      setMonitoringActive(true);
    }
  }, [connected, publicKey]);

  // Detect network mismatch by attempting to load the account from the
  // expected Horizon URL. If it fails, flag a mismatch so the user can
  // switch Freighter to the correct network before creating or paying.
  useEffect(() => {
    if (connected && publicKey) {
      const expected = (NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET').trim().toUpperCase();
      const testnetHorizon = 'https://horizon-testnet.stellar.org';
      const publicHorizon = 'https://horizon-stellar.org';

      const checkNetwork = async () => {
        const horizon = expected === 'TESTNET' ? testnetHorizon : publicHorizon;
        try {
          const { Horizon } = require('stellar-sdk');
          const server = new Horizon.Server(horizon);
          await server.loadAccount(publicKey);
          setNetworkMismatch(false);
        } catch {
          setNetworkMismatch(true);
        }
      };

      checkNetwork();
    } else {
      setNetworkMismatch(false);
    }
  }, [connected, publicKey, NEXT_PUBLIC_STELLAR_NETWORK]);

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