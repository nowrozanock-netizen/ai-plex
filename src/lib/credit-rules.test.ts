import { describe, expect, it } from 'vitest';
import { AD_REWARD, STARTER_CREDITS, TEST_AD_UNIT, chargeForAnswer, isCreditPreview } from './credit-rules';
describe('credit rules', () => {
  it('awards 15 credits for one completed rewarded ad', () => { expect(AD_REWARD).toBe(15); });
  it('starts with 15 credits', () => { expect(STARTER_CREDITS).toBe(15); });
  it('charges 1 credit for a completed answer', () => { expect(chargeForAnswer(true)).toBe(1); });
  it('does not charge an incomplete answer', () => { expect(chargeForAnswer(false)).toBe(0); });
  it('isolates test balances from production', () => {
    expect(isCreditPreview('localhost')).toBe(true);
    expect(isCreditPreview('id-preview--abc.lovable.app')).toBe(true);
    expect(isCreditPreview('ai-plex.lovable.app')).toBe(false);
  });
  it('uses the official Android rewarded demo unit', () => { expect(TEST_AD_UNIT).toBe('ca-app-pub-3940256099942544/5224354917'); });
});