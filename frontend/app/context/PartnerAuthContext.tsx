"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface Partner {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: 'admin' | 'viewer' | 'analyst';
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}

interface PartnerAuthState {
  isAuthenticated: boolean;
  partner: Partner | null;
  isLoading: boolean;
  error: string | null;
}

interface PartnerAuthContextValue extends PartnerAuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const initialState: PartnerAuthState = {
  isAuthenticated: false,
  partner: null,
  isLoading: true,
  error: null,
};

// Mock partner database - In production, this would be server-side
const mockPartners = [
  {
    id: 'partner_001',
    email: 'partner@ecosystem.com',
    password: 'PartnerAccess2024!',
    name: 'Ecosystem Partner Alpha',
    organization: 'Alpha Ventures',
    role: 'admin' as const,
    permissions: ['view_metrics', 'export_data', 'manage_users', 'view_analytics'],
    createdAt: '2024-01-15T00:00:00Z',
    lastLogin: '2024-02-25T10:30:00Z',
  },
  {
    id: 'partner_002',
    email: 'analyst@beta.com',
    password: 'Analyst2024!',
    name: 'Beta Analyst',
    organization: 'Beta Capital',
    role: 'analyst' as const,
    permissions: ['view_metrics', 'view_analytics'],
    createdAt: '2024-02-01T00:00:00Z',
    lastLogin: '2024-02-24T15:45:00Z',
  },
];

const PartnerAuthContext = createContext<PartnerAuthContextValue | undefined>(
  undefined
);

export function PartnerAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PartnerAuthState>(initialState);

  const checkAuth = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Check for stored auth token/session
      const storedAuth = localStorage.getItem('partner_auth');
      if (storedAuth) {
        const { partnerId, timestamp } = JSON.parse(storedAuth);
        
        // Check if session is still valid (24 hours)
        const now = Date.now();
        const sessionAge = now - timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge < maxAge) {
          const partner = mockPartners.find(p => p.id === partnerId);
          if (partner) {
            const { password, ...partnerData } = partner;
            setState({
              isAuthenticated: true,
              partner: partnerData,
              isLoading: false,
              error: null,
            });
            return;
          }
        }
        
        // Session expired or invalid
        localStorage.removeItem('partner_auth');
      }

      setState({
        isAuthenticated: false,
        partner: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        isAuthenticated: false,
        partner: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Authentication check failed",
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const partner = mockPartners.find(p => p.email === email && p.password === password);
      
      if (partner) {
        const { password: _, ...partnerData } = partner;
        
        // Store auth session
        localStorage.setItem('partner_auth', JSON.stringify({
          partnerId: partner.id,
          timestamp: Date.now(),
        }));

        setState({
          isAuthenticated: true,
          partner: partnerData,
          isLoading: false,
          error: null,
        });

        return true;
      } else {
        setState({
          isAuthenticated: false,
          partner: null,
          isLoading: false,
          error: "Invalid email or password",
        });
        return false;
      }
    } catch (error) {
      setState({
        isAuthenticated: false,
        partner: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('partner_auth');
    setState({
      isAuthenticated: false,
      partner: null,
      isLoading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <PartnerAuthContext.Provider value={{ ...state, login, logout, checkAuth }}>
      {children}
    </PartnerAuthContext.Provider>
  );
}

export function usePartnerAuth(): PartnerAuthContextValue {
  const context = useContext(PartnerAuthContext);
  if (context === undefined) {
    throw new Error("usePartnerAuth must be used within a <PartnerAuthProvider>");
  }
  return context;
}

export function hasPermission(partner: Partner | null, permission: string): boolean {
  if (!partner) return false;
  return partner.permissions.includes(permission);
}
