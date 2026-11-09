import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { TEST_WAIT_MS, creditIdentitySchema } from './credit-rules';

export const readCredits = createServerFn({ method: 'POST' }).inputValidator(creditIdentitySchema).handler(async ({ data }) => {
  const { snapshot } = await import('./credits.server');
  return snapshot(getRequest(), data.guestToken);
});
export const startReward = createServerFn({ method: 'POST' }).inputValidator(creditIdentitySchema).handler(async ({ data }) => {
  const { prepareReward } = await import('./credits.server');
  return prepareReward(getRequest(), data.guestToken);
});
export const finishTestReward = createServerFn({ method: 'POST' }).inputValidator(creditIdentitySchema.extend({ sessionId: z.string().uuid() })).handler(async ({ data }) => {
  const { resolveWallet, snapshot } = await import('./credits.server');
  const { db, wallet } = await resolveWallet(getRequest(), data.guestToken);
  if (wallet.environment !== 'test') throw new Error('Only verified ads can earn credits.');
  const { data: session } = await db.from('credit_reward_sessions').select('*').eq('id', data.sessionId).eq('wallet_id', wallet.id).single();
  if (!session || Date.now() - Date.parse(session.created_at) < TEST_WAIT_MS) throw new Error('The test reward is not ready.');
  const { data: granted, error } = await db.rpc('credit_reward', { p_session: session.id, p_transaction: `test:${session.id}`, p_test: true });
  if (error || !granted) throw new Error('Could not confirm the reward.');
  return snapshot(getRequest(), data.guestToken);
});