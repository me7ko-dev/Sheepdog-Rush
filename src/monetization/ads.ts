// Ads - placeholder for later.
//
// Today every function does nothing, so the game works in Expo Go.
// To add AdMob later (needs a "development build", not Expo Go):
//   1. npx expo install react-native-google-mobile-ads
//   2. Write an AdMob version of `AdsService` below (same functions).
//   3. Change `ads` at the bottom to use it.
// The rest of the game already calls these functions at the right moments.

export interface AdsService {
  /** Called once when the app starts. */
  init(): Promise<void>;
  /** Called after each finished level (win or lose). Can show a full-screen ad. */
  onLevelEnd(info: { levelId: number; won: boolean }): Promise<void>;
  /** For "watch an ad to get a bonus". Resolves true if the player earned it. */
  showRewarded(placement: string): Promise<boolean>;
}

class NoAds implements AdsService {
  async init() {}
  async onLevelEnd() {}
  async showRewarded() {
    return false;
  }
}

export const ads: AdsService = new NoAds();
