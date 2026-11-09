import { createPublicKey, verify } from 'node:crypto';
import { z } from 'zod';

const keySchema = z.object({ keys: z.array(z.object({ keyId: z.number(), pem: z.string() })) });
export function verifyRewardQuery(query: string, keys: { keyId: number; pem: string }[]) {
  const match = /^(.*)&signature=([^&]+)&key_id=(\d+)$/.exec(query);
  if (!match?.[1] || !match[2] || !match[3]) return false;
  const key = keys.find(entry => entry.keyId === Number(match[3]));
  if (!key) return false;
  try {
    return verify('sha256', Buffer.from(match[1], 'utf8'), createPublicKey(key.pem), Buffer.from(decodeURIComponent(match[2]), 'base64url'));
  } catch { return false; }
}

export async function handleAdmobReward(request: Request) {
  const url = new URL(request.url);
  const query = url.search.slice(1);
  if (!query || query.length > 12000) return new Response('Invalid callback', { status: 400 });
  let keys;
  try {
    const response = await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Keys unavailable');
    keys = keySchema.parse(await response.json()).keys;
  } catch { return new Response('Verification unavailable', { status: 503 }); }
  if (!verifyRewardQuery(query, keys)) return new Response('Invalid signature', { status: 401 });
  const parsed = z.object({ custom_data: z.string().uuid(), transaction_id: z.string().min(1).max(200), ad_unit: z.string().min(1), timestamp: z.coerce.number().int().positive(), reward_amount: z.coerce.number().positive(), reward_item: z.string().min(1) }).safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success || url.searchParams.size !== new Set(url.searchParams.keys()).size) return new Response('Invalid reward', { status: 400 });
  const value = parsed.data;
  if (Math.abs(Date.now() - value.timestamp) > 86400000) return new Response('Expired callback', { status: 400 });
  const adUnit = process.env['ADMOB_REWARDED_AD_UNIT_ID'];
  if (!adUnit || value.ad_unit !== adUnit.split('/').at(-1)) return new Response('Unexpected ad unit', { status: 400 });
  // Only verified Google callbacks may enter this privileged mutation path.
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { data: session, error } = await db.from('credit_reward_sessions').select('id,ad_unit,wallet_id,created_at').eq('id', value.custom_data).single();
  if (error || !session || session.ad_unit !== adUnit || value.timestamp < Date.parse(session.created_at) - 60000) return new Response('Invalid session', { status: 400 });
  const { data: wallet } = await db.from('credit_wallets').select('environment').eq('id', session.wallet_id).single();
  if (wallet?.environment !== 'live') return new Response('Invalid environment', { status: 400 });
  const { data: granted, error: grantError } = await db.rpc('credit_reward', { p_session: session.id, p_transaction: value.transaction_id, p_test: false });
  if (grantError) return new Response('Reward processing unavailable', { status: 503 });
  return new Response(granted ? 'ok' : 'Invalid reward session', { status: granted ? 200 : 400, headers: { 'Cache-Control': 'no-store' } });
}