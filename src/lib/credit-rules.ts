import { z } from 'zod';
export const creditIdentitySchema = z.object({ guestToken: z.string().regex(/^[a-f0-9]{64}$/) });
export const STARTER_CREDITS = 15;
export const ANSWER_COST = 1;
export const AD_REWARD = 15;
export const TEST_AD_UNIT = 'ca-app-pub-3940256099942544/5224354917';
export const TEST_WAIT_MS = 5000;
export function isCreditPreview(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('id-preview--');
}
export function chargeForAnswer(completed: boolean) { return completed ? ANSWER_COST : 0; }