import { createServerOnlyFn } from '@tanstack/react-start';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { isCreditPreview, TEST_AD_UNIT } from './credit-rules';

export const creditIdentitySchema = z.object({ guestToken: z.string().regex(/^[a-f0-9]{64}$/) });
export const resolveWallet = createServerOnlyFn(async (request: Request, guestToken: string) => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const auth = request.headers.get('Authorization');
  let owner: string | null = null;
  if (auth) {
    if (!auth.startsWith('Bearer ')) throw new Error('Please log in again.');
    const { data, error } = await db.auth.getUser(auth.slice(7));
    if (error || !data.user) throw new Error('Please log in again.');
    owner = data.user.id;
  }
  const environment = isCreditPreview(new URL(request.url).hostname) ? 'test' : 'live';
  const hash = createHash('sha256').update(guestToken).digest('hex');
  const values = owner ? { owner_id: owner, environment } : { guest_hash: hash, environment };
  const { error: insertError } = await db.from('credit_wallets').upsert(values, { onConflict: owner ? 'owner_id,environment' : 'guest_hash,environment', ignoreDuplicates: true });
  if (insertError) throw new Error('Could not open your credits.');
  let query = db.from('credit_wallets').select('*').eq('environment', environment);
  query = owner ? query.eq('owner_id', owner) : query.eq('guest_hash', hash);
  const { data: wallet, error } = await query.single();
  if (error || !wallet) throw new Error('Could not open your credits.');
  return { db, wallet };
});

export const snapshot = createServerOnlyFn(async (request: Request, guestToken: string) => {
  const { db, wallet } = await resolveWallet(request, guestToken);
  const { data, error } = await db.from('credit_events').select('id,amount,kind,status,created_at').eq('wallet_id', wallet.id).order('created_at', { ascending: false }).limit(30);
  if (error) throw new Error('Could not load credit history.');
  return { balance: wallet.balance, history: data ?? [], testing: wallet.environment === 'test', adsAvailable: wallet.environment === 'test' || Boolean(process.env['ADMOB_REWARDED_AD_UNIT_ID']) };
});

export const prepareReward = createServerOnlyFn(async (request: Request, guestToken: string) => {
  const { db, wallet } = await resolveWallet(request, guestToken);
  const adUnit = wallet.environment === 'test' ? TEST_AD_UNIT : process.env['ADMOB_REWARDED_AD_UNIT_ID'];
  if (!adUnit) throw new Error('Rewarded ads are not available yet.');
  const { data, error } = await db.from('credit_reward_sessions').insert({ wallet_id: wallet.id, ad_unit: adUnit }).select('id').single();
  if (error || !data) throw new Error('Could not prepare your reward.');
  return { sessionId: data.id, adUnit, testing: wallet.environment === 'test' };
});