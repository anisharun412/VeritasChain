import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { UserRole } from './roles';

// ─── Mock DID → Profile registry ─────────────────────
// In production this is resolved from an on-chain DID document.

export interface UserProfile {
  userId: string;
  displayName: string;
  role: UserRole;
  organization: string;
}

export const MOCK_USERS: UserProfile[] = [
  {
    userId: 'did:veritas:manufacturer-pfizer-001',
    displayName: 'Dr. Sarah Chen',
    role: UserRole.MANUFACTURER,
    organization: 'Pfizer Belgium',
  },
  {
    userId: 'did:veritas:carrier-dhl-001',
    displayName: 'Carlos Rivera',
    role: UserRole.CARRIER,
    organization: 'DHL Cold Chain',
  },
  {
    userId: 'did:veritas:warehouse-dubai-001',
    displayName: 'Ahmed Al-Rashid',
    role: UserRole.RECEIVER,
    organization: 'Dubai Cold Storage',
  },
  {
    userId: 'did:veritas:hospital-mombasa-001',
    displayName: 'Dr. Grace Wanjiku',
    role: UserRole.RECEIVER,
    organization: 'Mombasa General Hospital',
  },
  {
    userId: 'did:veritas:regulator-kenya-001',
    displayName: 'Inspector James Omondi',
    role: UserRole.REGULATOR,
    organization: 'Kenya Customs Authority',
  },
];

// ─── Auth State ───────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  userRole: UserRole | null;
  displayName: string | null;
  organization: string | null;
}

interface AuthContextType extends AuthState {
  login: (userId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** For demo/testing only — switch to any role instantly */
  switchRole: (role: UserRole) => void;
  clearError: () => void;
}

// ─── Context ──────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'veritaschain_session_v2';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    error: null,
    userId: null,
    userRole: null,
    displayName: null,
    organization: null,
  });

  // ─── Restore session on mount ─────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const { userId } = JSON.parse(stored) as { userId: string };
        const user = MOCK_USERS.find((u) => u.userId === userId);
        if (user) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            userId: user.userId,
            userRole: user.role,
            displayName: user.displayName,
            organization: user.organization,
          });
          return;
        }
      }
    } catch {
      // ignore
    }
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  // ─── Login ────────────────────────────────────────

  const login = useCallback(async (userId: string): Promise<boolean> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    const user = MOCK_USERS.find((u) => u.userId === userId);
    if (!user) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: `DID not found: ${userId}`,
      }));
      return false;
    }

    const next: AuthState = {
      isAuthenticated: true,
      isLoading: false,
      error: null,
      userId: user.userId,
      userRole: user.role,
      displayName: user.displayName,
      organization: user.organization,
    };

    setState(next);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.userId }));
    return true;
  }, []);

  // ─── Logout ───────────────────────────────────────

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userId: null,
      userRole: null,
      displayName: null,
      organization: null,
    });
  }, []);

  // ─── Switch Role (demo only) ──────────────────────

  const switchRole = useCallback(
    (role: UserRole) => {
      const user = MOCK_USERS.find((u) => u.role === role);
      if (user) login(user.userId);
    },
    [login],
  );

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, switchRole, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
