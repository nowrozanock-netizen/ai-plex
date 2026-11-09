# AI PLEX rewarded ads

## Development
- Android uses Google's demo application ID and rewarded demo unit. Never click real ads for testing.
- Preview and localhost balances are test-only; the browser test reward is not a real advertisement.
- One completed ad grants 15 credits. New wallets start with 15; completed answers cost 1. Failed/stopped answers are refunded.
- `bunx cap update android` registers native plugins. Build/install the APK with Android Studio to test real ad display and consent. A browser cannot verify native ad delivery.

## Required before production
1. In AdMob, register the Android application with package ID `app.lovable.aiplex` and create a rewarded ad unit.
2. Replace the demo application ID in `android/app/src/main/AndroidManifest.xml` with the real AdMob app ID (contains `~`).
3. Save the full rewarded unit ID (contains `/`) as the server setting `ADMOB_REWARDED_AD_UNIT_ID`.
4. In that rewarded unit's server-side verification settings, set the callback URL to `https://ai-plex.lovable.app/api/public/admob-reward`. Publish the app before testing that endpoint from AdMob.
5. Point the Capacitor hosted URL to the published app for release. The current preview address intentionally uses test credits.
6. Configure AdMob privacy/consent messages and Play Store privacy disclosures for the intended audience. Do not distribute a production APK using Google's demo application ID.

## Security
The app passes a server-issued reward session UUID as SSV custom data. The callback verifies Google's ECDSA signature over the original query, checks the ad unit/session/environment, and awards credits atomically once per transaction. Live credits never rely on a client-side reward event. The configured AdMob reward amount does not change AI PLEX's fixed 15-credit grant.