import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// On the web, Skia's drawing engine (CanvasKit) must be loaded before the app starts.
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    registerRootComponent(require('./App').default);
  });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  registerRootComponent(require('./App').default);
}
