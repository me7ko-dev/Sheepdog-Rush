// In-app purchases - placeholder for later.
//
// Today nothing can be bought. To add real purchases later (needs a "development build"):
//   1. Install a purchases library (for example react-native-purchases / RevenueCat).
//   2. Write a real version of `PurchasesService` below (same functions).
//   3. Change `purchases` at the bottom to use it.

export type ProductId = 'remove_ads' | 'level_pack_1';

export interface PurchasesService {
  init(): Promise<void>;
  /** True if the player has bought this product. */
  owns(product: ProductId): boolean;
  /** Starts the store purchase. Resolves true on success. */
  buy(product: ProductId): Promise<boolean>;
  restore(): Promise<void>;
}

class NoPurchases implements PurchasesService {
  async init() {}
  owns() {
    return false;
  }
  async buy() {
    return false;
  }
  async restore() {}
}

export const purchases: PurchasesService = new NoPurchases();
