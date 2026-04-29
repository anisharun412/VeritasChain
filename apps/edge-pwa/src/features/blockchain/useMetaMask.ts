import { useState, useCallback, useEffect } from 'react';
import { GANACHE_CHAIN_ID, GANACHE_RPC } from './contractABI';

export interface MetaMaskState {
  isInstalled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  chainId: number | null;
  isGanache: boolean;
  error: string | null;
}

const GANACHE_NETWORK_PARAMS = {
  chainId: '0x539', // 1337 in hex
  chainName: 'Ganache Local',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [GANACHE_RPC],
};

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isInstalled: typeof window !== 'undefined' && !!window.ethereum,
    isConnected: false,
    isConnecting: false,
    account: null,
    chainId: null,
    isGanache: false,
    error: null,
  });

  // ─── Helpers ──────────────────────────────────────────────────────

  const getChainId = async (): Promise<number> => {
    const hex = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(hex as string, 16);
  };

  const update = (patch: Partial<MetaMaskState>) =>
    setState((s) => ({ ...s, ...patch }));

  // ─── Restore existing connection on mount ─────────────────────────

  useEffect(() => {
    if (!window.ethereum) return;

    const restore = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
        if (accounts.length > 0) {
          const chainId = await getChainId();
          update({ isConnected: true, account: accounts[0], chainId, isGanache: chainId === GANACHE_CHAIN_ID });
        }
      } catch { /* ignore */ }
    };

    restore();

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        update({ isConnected: false, account: null });
      } else {
        update({ isConnected: true, account: accounts[0] });
      }
    };

    const onChainChanged = (hex: string) => {
      const chainId = parseInt(hex, 16);
      update({ chainId, isGanache: chainId === GANACHE_CHAIN_ID });
    };

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener('chainChanged', onChainChanged);
    };
  }, []);

  // ─── Connect ──────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      update({ error: 'MetaMask not installed. Please install it from metamask.io' });
      return;
    }

    update({ isConnecting: true, error: null });

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const chainId = await getChainId();

      // If not on Ganache, prompt to switch
      if (chainId !== GANACHE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x539' }],
          });
        } catch (switchErr: any) {
          // Chain not added yet — add it
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [GANACHE_NETWORK_PARAMS],
            });
          } else {
            throw switchErr;
          }
        }
      }

      const finalChainId = await getChainId();
      update({
        isConnected: true,
        isConnecting: false,
        account: accounts[0],
        chainId: finalChainId,
        isGanache: finalChainId === GANACHE_CHAIN_ID,
        error: null,
      });
    } catch (err: any) {
      update({ isConnecting: false, error: err.message || 'Connection failed' });
    }
  }, []);

  // ─── Disconnect (just clears local state) ─────────────────────────

  const disconnect = useCallback(() => {
    update({ isConnected: false, account: null, chainId: null, isGanache: false });
  }, []);

  const shortAddress = state.account
    ? `${state.account.slice(0, 6)}…${state.account.slice(-4)}`
    : null;

  return { ...state, shortAddress, connect, disconnect };
}
