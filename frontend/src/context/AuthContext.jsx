import { createContext, useContext, useState, useCallback } from 'react';
import { getStoredTokens, storeTokens, clearTokens } from '../api/client';

const OwnerAuthContext = createContext(null);
const MemberAuthContext = createContext(null);

export function OwnerAuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const tokens = getStoredTokens('owner');
    const userRaw = localStorage.getItem('qrgym_owner_user');
    return tokens ? { tokens, user: userRaw ? JSON.parse(userRaw) : null } : null;
  });

  const login = useCallback((tokens, user) => {
    storeTokens('owner', tokens);
    localStorage.setItem('qrgym_owner_user', JSON.stringify(user));
    setSession({ tokens, user });
  }, []);

  const logout = useCallback(() => {
    clearTokens('owner');
    localStorage.removeItem('qrgym_owner_user');
    setSession(null);
  }, []);

  return (
    <OwnerAuthContext.Provider value={{ session, login, logout }}>
      {children}
    </OwnerAuthContext.Provider>
  );
}

export function MemberAuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const tokens = getStoredTokens('member');
    const userRaw = localStorage.getItem('qrgym_member_user');
    return tokens ? { tokens, user: userRaw ? JSON.parse(userRaw) : null } : null;
  });

  const login = useCallback((tokens, user) => {
    storeTokens('member', tokens);
    localStorage.setItem('qrgym_member_user', JSON.stringify(user));
    setSession({ tokens, user });
  }, []);

  const logout = useCallback(() => {
    clearTokens('member');
    localStorage.removeItem('qrgym_member_user');
    setSession(null);
  }, []);

  return (
    <MemberAuthContext.Provider value={{ session, login, logout }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export const useOwnerAuth = () => useContext(OwnerAuthContext);
export const useMemberAuth = () => useContext(MemberAuthContext);
