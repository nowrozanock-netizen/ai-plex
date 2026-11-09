import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

export async function watchRewardedAd(adUnit: string, sessionId: string, testing: boolean) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') throw new Error('Rewarded ads are available in the Android app.');
  const { AdMob, AdmobConsentStatus, RewardAdPluginEvents } = await import('@capacitor-community/admob');
   await AdMob.initialize({ initializeForTesting: testing });
   let consent = await AdMob.requestConsentInfo();
  if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) consent = await AdMob.showConsentForm();
  if (!consent.canRequestAds) throw new Error('Ads are unavailable with your current privacy choice.');
  await AdMob.prepareRewardVideoAd({ adId: adUnit, isTesting: testing, ssv: { customData: sessionId } });
  const handles: PluginListenerHandle[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      let rewarded = false;
      const timer = setTimeout(() => reject(new Error('The ad timed out. Please try again.')), 180000);
      const finish = (error?: Error) => { clearTimeout(timer); error ? reject(error) : resolve(); };
      void (async () => {
        handles.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; }));
        handles.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => { setTimeout(() => finish(rewarded ? undefined : new Error('Ad closed before the reward was earned.')), 300); }));
        handles.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(new Error('Could not show the ad.'))));
        // The returned promise resolves on reward, not dismissal. Only the reward event qualifies.
        void AdMob.showRewardVideoAd().catch(() => finish(new Error('Could not show the ad.')));
      })().catch(() => finish(new Error('Could not start the ad.')));
    });
  } finally { await Promise.all(handles.map(handle => handle.remove())); }
}