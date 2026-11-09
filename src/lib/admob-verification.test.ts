import { generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRewardQuery } from './admob-verification.server';

const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const keys = [{ keyId: 123, pem: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString() }];
const payload = 'ad_unit=12345&custom_data=abc%2Bdef&reward_amount=1&reward_item=credit&timestamp=123&transaction_id=xyz';
const signature = sign('sha256', Buffer.from(payload), pair.privateKey).toString('base64url');
const query = `${payload}&signature=${signature}&key_id=123`;
describe('reward callback verification', () => {
  it('accepts a valid ECDSA signed original query', () => { expect(verifyRewardQuery(query, keys)).toBe(true); });
  it('rejects forged rewards', () => { expect(verifyRewardQuery(query.replace('reward_amount=1', 'reward_amount=15'), keys)).toBe(false); });
  it('rejects unsigned callbacks', () => { expect(verifyRewardQuery(payload, keys)).toBe(false); });
  it('rejects unknown signing keys', () => { expect(verifyRewardQuery(query.replace('key_id=123', 'key_id=999'), keys)).toBe(false); });
  it('rejects reencoded query content', () => { expect(verifyRewardQuery(query.replace('%2B', '+'), keys)).toBe(false); });
});