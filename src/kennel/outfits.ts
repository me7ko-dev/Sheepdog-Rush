import type { StringKey } from '../i18n/en';

// Looks for the sheepdog. Each one unlocks when the player has collected enough stars in total.

export type Coat = { id: string; nameKey: StringKey; fur: string; light: string; stars: number };
export type Collar = { id: string; nameKey: StringKey; color: string; stars: number };
export type HatId = 'none' | 'straw' | 'cap' | 'flowers' | 'crown';
export type Hat = { id: HatId; nameKey: StringKey; stars: number };

export const COATS: Coat[] = [
  { id: 'classic', nameKey: 'coat_classic', fur: '#24232A', light: '#FFFFFF', stars: 0 },
  { id: 'chocolate', nameKey: 'coat_chocolate', fur: '#5B3A26', light: '#FFF6EA', stars: 6 },
  { id: 'merle', nameKey: 'coat_merle', fur: '#7C879A', light: '#FFFFFF', stars: 15 },
  { id: 'golden', nameKey: 'coat_golden', fur: '#D49A45', light: '#FFF3DC', stars: 27 },
  { id: 'snow', nameKey: 'coat_snow', fur: '#ECE7DE', light: '#FFFFFF', stars: 42 },
];

export const COLLARS: Collar[] = [
  { id: 'red', nameKey: 'collar_red', color: '#E53935', stars: 0 },
  { id: 'blue', nameKey: 'collar_blue', color: '#2F80ED', stars: 3 },
  { id: 'green', nameKey: 'collar_green', color: '#3BAA4B', stars: 10 },
  { id: 'purple', nameKey: 'collar_purple', color: '#8E44AD', stars: 20 },
  { id: 'gold', nameKey: 'collar_gold', color: '#F2C230', stars: 36 },
];

export const HATS: Hat[] = [
  { id: 'none', nameKey: 'hat_none', stars: 0 },
  { id: 'straw', nameKey: 'hat_straw', stars: 12 },
  { id: 'cap', nameKey: 'hat_cap', stars: 22 },
  { id: 'flowers', nameKey: 'hat_flowers', stars: 32 },
  { id: 'crown', nameKey: 'hat_crown', stars: 50 },
];

export type Outfit = { coat: string; collar: string; hat: HatId };
export const DEFAULT_OUTFIT: Outfit = { coat: 'classic', collar: 'red', hat: 'none' };

/** Star thresholds of every item, to tell the player when something new unlocks. */
export const UNLOCK_STARS = [...COATS, ...COLLARS, ...HATS].map((i) => i.stars).filter((s) => s > 0);

export function newUnlocks(starsBefore: number, starsAfter: number): number {
  return UNLOCK_STARS.filter((s) => s > starsBefore && s <= starsAfter).length;
}

export function resolveOutfit(o: Outfit) {
  return {
    coat: COATS.find((c) => c.id === o.coat) ?? COATS[0],
    collar: COLLARS.find((c) => c.id === o.collar) ?? COLLARS[0],
    hat: HATS.find((h) => h.id === o.hat) ?? HATS[0],
  };
}
