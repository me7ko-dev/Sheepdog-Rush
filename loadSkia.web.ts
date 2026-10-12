import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// On the web, Skia's drawing engine (CanvasKit) must be loaded before the app starts.
// EXPO_BASE_URL is the sub-folder from app.json (experiments.baseUrl, /Sheepdog-Rush on GitHub Pages).
const base = process.env.EXPO_BASE_URL ?? '';
export const loadSkia = (): Promise<void> => LoadSkiaWeb({ locateFile: (file: string) => `${base}/${file}` });
