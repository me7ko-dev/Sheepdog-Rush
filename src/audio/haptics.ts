import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { settings } from '../storage/settings';

// Vibration, respecting the player's setting. Does nothing on the web.
const enabled = () => settings.get().haptics && Platform.OS !== 'web';

export const haptics = {
  tap() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  success() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
