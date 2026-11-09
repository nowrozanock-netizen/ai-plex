import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Capacitor } from '@capacitor/core';
import { Play, LoaderCircle, RefreshCw, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCredits } from './CreditProvider';
import { finishTestReward, startReward } from '@/lib/credits.functions';
import { AD_REWARD, TEST_WAIT_MS } from '@/lib/credit-rules';
import { watchRewardedAd } from '@/lib/admob';

export function CreditsDialog() {
  const { data, loading, error, guestToken, refresh, open, setOpen } = useCredits();
  const start = useServerFn(startReward);
  const finish = useServerFn(finishTestReward);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [android, setAndroid] = useState(false);
  const lock = useRef(false);
  useEffect(() => { setAndroid(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'); }, []);
  useEffect(() => { if (open) void refresh(); }, [open, refresh]);
  const watch = async () => {
    if (lock.current || !data) return;
    lock.current = true; setBusy(true); setStatus('Preparing…');
    try {
      const reward = await start({ data: { guestToken } });
      const started = Date.now();
      if (android) {
        setStatus('Watching ad…');
        await watchRewardedAd(reward.adUnit, reward.sessionId, reward.testing);
      } else if (reward.testing) {
        setStatus('Test reward in progress…');
      } else throw new Error('Rewarded ads are available in the Android app.');
      if (reward.testing) {
        await new Promise(resolve => setTimeout(resolve, Math.max(0, TEST_WAIT_MS + 300 - (Date.now() - started))));
        const result = await finish({ data: { guestToken, sessionId: reward.sessionId } });
        await refresh();
        setStatus(`+${AD_REWARD} test credits added · Balance ${result.balance}`);
        toast.success(`${AD_REWARD} test credits added`);
      } else {
        setStatus('Confirming reward…');
        let confirmed = false;
        for (let attempt = 0; attempt < 15; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const result = await refresh();
          if (result?.history.some(event => event.kind === 'reward' && event.created_at >= new Date(started).toISOString())) { confirmed = true; break; }
        }
        setStatus(confirmed ? `+${AD_REWARD} credits added` : 'Reward verification is pending. Your balance updates when confirmed.');
      }
    } catch (e) { setStatus(e instanceof Error ? e.message : 'Could not complete the ad. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
    <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Coins className="size-5 text-primary" /> Credits</DialogTitle><DialogDescription>1 completed answer = 1 credit · 1 rewarded ad = 15 credits</DialogDescription></DialogHeader>
      <div className="py-3"><p className="text-4xl font-semibold tabular-nums">{loading ? '…' : data?.balance ?? '—'}</p><p className="mt-1 text-sm text-muted-foreground">Available credits{data?.testing ? ' · Test balance' : ''}</p></div>
      {error && <div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" size="sm" onClick={() => void refresh()}><RefreshCw /> Retry</Button></div>}
      <Button disabled={busy || loading || !data?.adsAvailable || (!data.testing && !android)} onClick={() => void watch()}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Play />} {busy ? 'Please wait…' : data?.testing && !android ? 'Test reward (+15 credits)' : 'Watch ad (+15 credits)'}
      </Button>
      {data && !data.adsAvailable && <p className="text-sm text-muted-foreground">Rewarded ads are not available yet.</p>}
      {data && !data.testing && !android && data.adsAvailable && <p className="text-sm text-muted-foreground">Rewarded ads are available in the Android app.</p>}
      {status && <p role="status" className="text-sm">{status}</p>}
      <section className="border-t border-border pt-4"><h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
        {data?.history.length ? <ul className="divide-y divide-border">{data.history.map(event => <li key={event.id} className="flex justify-between gap-3 py-3 text-sm"><div><p>{event.kind === 'reward' ? 'Rewarded ad' : event.kind === 'refund' ? 'Answer refund' : 'AI answer'}{event.status === 'pending' ? ' · Pending' : event.status === 'refunded' ? ' · Refunded' : ''}</p><p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p></div><span className="tabular-nums">{event.amount > 0 ? '+' : ''}{event.amount}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No activity yet.</p>}
      </section>
    </DialogContent>
  </Dialog>;
}