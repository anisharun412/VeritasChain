/**
 * Authentication context for global auth state
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserIdentity, AuthState } from '@veritaschain/types';
import { useWebAuthn } from './useWebAuthn';

interface AuthContextType {
  authState: AuthState;
  login: (identity: UserIdentity) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateWithBiometric } = useWebAuthn();

  const login = useCallback((identity: UserIdentity) => {
    setAuthState({
      isAuthenticated: true,
      user: identity,
      jwt: 'mock-jwt-token-' + Date.now(),
    });
  }, []);

  const logout = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
    });
    localStorage.removeItem('veritaschain_private_key_encrypted');
  }, []);

  const value: AuthContextType = {
    authState,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
