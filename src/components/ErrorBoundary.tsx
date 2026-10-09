import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { theme } from '../theme';
import { Button } from './Button';

type Props = { children: ReactNode; onReset: () => void };
type State = { failed: boolean };

/** If something unexpected breaks, show a friendly screen instead of crashing the app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Unexpected error', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Oops
        onReset={() => {
          this.setState({ failed: false });
          this.props.onReset();
        }}
      />
    );
  }
}

function Oops({ onReset }: { onReset: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('oopsTitle')}</Text>
      <Text style={styles.text}>{t('oopsText')}</Text>
      <Button title={t('menu')} onPress={onReset} color="orange" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 30, backgroundColor: theme.grass },
  title: { fontSize: 34, fontWeight: '900', color: theme.white },
  text: { fontSize: 18, fontWeight: '700', color: theme.white, textAlign: 'center' },
});
