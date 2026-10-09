import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';

import { settings } from '../storage/settings';

// All sounds are made by tools/make-sounds.py (our own, no recordings).
const SOURCES = {
  click: require('../../assets/sounds/click.wav'),
  baa1: require('../../assets/sounds/baa1.wav'),
  baa2: require('../../assets/sounds/baa2.wav'),
  baa3: require('../../assets/sounds/baa3.wav'),
  bark: require('../../assets/sounds/bark.wav'),
  howl: require('../../assets/sounds/howl.wav'),
  pen: require('../../assets/sounds/pen.wav'),
  star: require('../../assets/sounds/star.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
};
const MUSIC = require('../../assets/sounds/music.wav');

export type SoundName = keyof typeof SOURCES;

const VOLUME: Partial<Record<SoundName, number>> = {
  click: 0.5,
  baa1: 0.55,
  baa2: 0.55,
  baa3: 0.55,
  bark: 0.6,
  howl: 0.7,
  pen: 0.6,
  star: 0.7,
};
const MUSIC_VOLUME = 0.32;
/** Two copies of each sound, so the same sound can overlap itself. */
const COPIES = 2;

class SoundSystem {
  private players = new Map<SoundName, { list: AudioPlayer[]; next: number }>();
  private music: AudioPlayer | null = null;
  private lastPlayed = new Map<string, number>();
  private appActive = true;
  private started = false;

  /** Call once when the app starts. */
  start() {
    if (this.started) return;
    this.started = true;
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    settings.subscribe(() => this.updateMusic());
    AppState.addEventListener('change', (s) => {
      this.appActive = s === 'active';
      this.updateMusic();
    });
    this.updateMusic();
  }

  play(name: SoundName, volume = 1) {
    // Browsers only allow audio after a tap, so the music may need a second try.
    if (settings.get().music && this.appActive && !this.music?.playing) this.updateMusic();
    if (!settings.get().sound) return;
    try {
      let entry = this.players.get(name);
      if (!entry) {
        entry = { list: [], next: 0 };
        for (let i = 0; i < COPIES; i++) entry.list.push(createAudioPlayer(SOURCES[name]));
        this.players.set(name, entry);
      }
      const p = entry.list[entry.next];
      entry.next = (entry.next + 1) % COPIES;
      p.volume = (VOLUME[name] ?? 0.8) * volume;
      p.seekTo(0).catch(() => {});
      p.play();
    } catch {
      // Sound is a nice extra: never let it crash the game.
    }
  }

  /** Plays a sound at most once every `gapMs` milliseconds. */
  playLimited(key: string, name: SoundName, gapMs: number, volume = 1) {
    const now = Date.now();
    if (now - (this.lastPlayed.get(key) ?? 0) < gapMs) return;
    this.lastPlayed.set(key, now);
    this.play(name, volume);
  }

  /** A random sheep "baa". Black sheep have a deeper voice. */
  baa(black = false, volume = 1) {
    const name: SoundName = black ? 'baa3' : Math.random() < 0.5 ? 'baa1' : 'baa2';
    this.playLimited('baa', name, 700, volume);
  }

  /** The dog sometimes barks happily when you send it off. */
  dogSentOff() {
    if (Math.random() < 0.3) this.playLimited('bark', 'bark', 4000, 0.8);
  }

  private updateMusic() {
    const want = settings.get().music && this.appActive;
    try {
      if (want) {
        if (!this.music) {
          this.music = createAudioPlayer(MUSIC);
          this.music.loop = true;
        }
        this.music.volume = MUSIC_VOLUME;
        this.music.play();
      } else {
        this.music?.pause();
      }
    } catch {
      // Ignore audio problems.
    }
  }
}

export const sound = new SoundSystem();
