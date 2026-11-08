import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useAccount } from './AuthProvider';
import { readCredits } from '@/lib/credits.functions';

type CreditData = Awaited<ReturnType<typeof readCredits>>;
type CreditContextValue = { data: CreditData | null; loading: boolean; error: string; guestToken: string; refresh: () => Promise<CreditData | null>; open: boolean; setOpen: (open: boolean) => void };
const CreditContext = createContext<CreditContextValue | null>(null);
export function CreditProvider({ children }: { children: ReactNode }) {
  const { user, loading: accountLoading } = useAccount();
  const read = useServerFn(readCredits);
  const [guestToken, setGuestToken] = useState('');
  const [data, setData] = useState<CreditData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const version = useRef(0);
  useEffect(() => {
    try {
      let token = localStorage.getItem('aiplex-credit-guest');
      if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('aiplex-credit-guest', token);
      }
      setGuestToken(token);
    } catch { setError('Device storage is unavailable.'); setLoading(false); }
  }, []);
  const refresh = useCallback(async () => {
    if (!guestToken || accountLoading) return null;
    const current = ++version.current;
    try {
      const result = await read({ data: { guestToken } });
      if (current === version.current) { setData(result); setError(''); setLoading(false); }
      return result;
    } catch { if (current === version.current) { setError('Could not load credits. Check your connection and retry.'); setLoading(false); } return null; }
  }, [guestToken, accountLoading, read]);
  useEffect(() => { version.current++; setData(null); setLoading(true); void refresh(); }, [user?.id, refresh]);
  useEffect(() => {
    const update = () => void refresh();
    window.addEventListener('focus', update); window.addEventListener('online', update);
    return () => { window.removeEventListener('focus', update); window.removeEventListener('online', update); };
  }, [refresh]);
  return <CreditContext.Provider value={{ data, loading, error, guestToken, refresh, open, setOpen }}>{children}</CreditContext.Provider>;
}
export function useCredits() { const context = useContext(CreditContext); if (!context) throw new Error('CreditProvider is missing'); return context; }