"""
Makes all sound effects and the music for Sheepdog Rush from scratch (pure math, no recordings),
so every sound is our own. Run:  python3 tools/make-sounds.py
Needs: numpy, scipy (pip install numpy scipy).
Writes into assets/sounds/.
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)


def t_axis(seconds):
    return np.arange(int(seconds * SR)) / SR


def phase(freq):
    """Phase (in cycles) for a frequency that may change over time."""
    return np.cumsum(freq) / SR


def saw(freq):
    p = phase(freq)
    return 2 * (p % 1) - 1


def sine(freq):
    return np.sin(2 * np.pi * phase(freq))


def adsr(n, a=0.01, d=0.05, s=0.7, r=0.1):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sus = max(0, n - a - d - r)
    env = np.concatenate([
        np.linspace(0, 1, a, endpoint=False),
        np.linspace(1, s, d, endpoint=False),
        np.full(sus, s),
        np.linspace(s, 0, r),
    ])
    return np.pad(env, (0, max(0, n - len(env))))[:n]


def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lowpass(x, cutoff, order=2):
    sos = signal.butter(order, cutoff, btype='low', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def highpass(x, cutoff, order=2):
    sos = signal.butter(order, cutoff, btype='high', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def vowel(src, formants):
    return sum(g * bandpass(src, f * 0.82, f * 1.18) for f, g in formants)


def normalize(x, peak=0.89):
    x = np.tanh(x / (np.max(np.abs(x)) + 1e-9) * 1.2)
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def save(name, x, peak=0.89):
    x = normalize(x, peak)
    fade = min(len(x), int(0.008 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print('wrote', name, f'{len(x) / SR:.2f}s')


def note_hz(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


# ---------------------------------------------------------------- animals

def bleat(base, length=0.8, wobble=21):
    t = t_axis(length)
    f0 = base * (1 + 0.12 * np.sin(np.pi * np.minimum(t / length, 1)) - 0.08 * t / length)
    f0 = f0 * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    src = saw(f0) + 0.3 * rng.normal(0, 0.15, len(t))
    voice = vowel(src, [(780, 1.0), (1250, 0.7), (2550, 0.35)])
    tremolo = 1 - 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * wobble * t)) * np.clip(t / 0.15, 0, 1)
    env = adsr(len(t), a=0.04, d=0.1, s=0.8, r=0.25)
    return voice * tremolo * env


def bark():
    out = np.zeros(int(0.62 * SR))
    for start, pitch in [(0.0, 1.0), (0.3, 0.92)]:
        t = t_axis(0.2)
        f0 = pitch * (560 - 1300 * t)
        src = saw(np.maximum(f0, 180)) * 0.8 + rng.normal(0, 0.35, len(t))
        voice = vowel(src, [(650, 1.0), (1150, 0.8), (2400, 0.3)])
        env = np.exp(-t * 16) * np.clip(t / 0.008, 0, 1)
        i = int(start * SR)
        out[i:i + len(t)] += voice * env
    return out


def howl():
    t = t_axis(2.4)
    f0 = np.interp(t, [0, 0.5, 1.6, 2.4], [330, 620, 600, 430])
    f0 = f0 * (1 + 0.02 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.5) / 0.4, 0, 1))
    src = sine(f0) + 0.35 * sine(f0 * 2) + 0.12 * sine(f0 * 3) + rng.normal(0, 0.03, len(t))
    voice = lowpass(src, 1600)
    env = adsr(len(t), a=0.35, d=0.2, s=0.85, r=0.7)
    return voice * env


# ---------------------------------------------------------------- jingles

def bell(freq, length=0.7, bright=0.25):
    t = t_axis(length)
    x = sine(np.full(len(t), freq)) + bright * sine(np.full(len(t), freq * 2.76)) * np.exp(-t * 9)
    x += 0.3 * sine(np.full(len(t), freq * 2)) * np.exp(-t * 5)
    return x * np.exp(-t * 5) * np.clip(t / 0.003, 0, 1)


def pluck(freq, length=0.9, damp=3.0):
    t = t_axis(length)
    x = np.zeros(len(t))
    for n in range(1, 9):
        x += (1 / n) * np.sin(2 * np.pi * freq * n * t + n) * np.exp(-t * damp * (1 + 0.55 * n))
    return x * np.clip(t / 0.003, 0, 1)


def place(out, sound, at, gain=1.0):
    i = int(at * SR)
    end = min(len(out), i + len(sound))
    out[i:end] += sound[:end - i] * gain


def pen_chime():
    out = np.zeros(int(0.8 * SR))
    for k, n in enumerate(['E6', 'G6', 'C7']):
        place(out, bell(note_hz(n), 0.6), k * 0.07, 0.8)
    return out


def star_ding():
    out = np.zeros(int(0.7 * SR))
    place(out, bell(note_hz('G6'), 0.7, 0.4), 0)
    place(out, bell(note_hz('D7'), 0.5, 0.2), 0.03, 0.4)
    return out


def click():
    t = t_axis(0.06)
    f = 950 - 5000 * t
    return sine(f) * np.exp(-t * 70) + 0.05 * rng.normal(0, 1, len(t)) * np.exp(-t * 200)


def win_jingle():
    out = np.zeros(int(2.0 * SR))
    for k, n in enumerate(['C5', 'E5', 'G5', 'C6', 'E6']):
        place(out, pluck(note_hz(n), 0.6), k * 0.09, 0.8)
    for n in ['C5', 'E5', 'G5', 'C6']:
        place(out, pluck(note_hz(n), 1.4, 2.0), 0.55, 0.55)
        place(out, bell(note_hz(n) * 2, 1.2, 0.15), 0.55, 0.25)
    return out


def lose_sound():
    out = np.zeros(int(2.3 * SR))
    for k, (n, dur) in enumerate([('G4', 0.32), ('F#4', 0.32), ('F4', 0.32), ('E4', 1.1)]):
        t = t_axis(dur)
        f = note_hz(n) * (1 + (0.025 * np.sin(2 * np.pi * 6 * t) if dur > 1 else 0))
        freq = np.full(len(t), 1.0) * f
        src = 0.6 * saw(freq) + 0.4 * sine(freq)
        w = 0.5 - 0.5 * np.cos(2 * np.pi * t / dur)
        voice = lowpass(src, 450) * (1 - w) + lowpass(src, 1500) * w
        place(out, voice * adsr(len(t), a=0.02, d=0.05, s=0.8, r=0.08), k * 0.36, 0.8)
    return out


# ---------------------------------------------------------------- music

BPM = 112
BEAT = 60 / BPM
CHORDS = ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C']
CHORD_NOTES = {
    'C': ['C4', 'E4', 'G4', 'C5'],
    'F': ['C4', 'F4', 'A4', 'C5'],
    'G': ['B3', 'D4', 'G4', 'B4'],
    'Am': ['C4', 'E4', 'A4', 'C5'],
}
BASS = {'C': 'C3', 'F': 'F2', 'G': 'G2', 'Am': 'A2'}
MELODY = [
    [('G4', .5), ('C5', .5), ('E5', 1), ('D5', .5), ('C5', .5), ('E5', 1)],
    [('F5', 1.5), ('E5', .5), ('D5', 1), ('C5', 1)],
    [('D5', .5), ('E5', .5), ('F5', 1), ('E5', .5), ('D5', .5), ('B4', 1)],
    [('C5', 1.5), ('E5', .5), ('G5', 2)],
    [('A5', 1), ('G5', .5), ('E5', .5), ('C5', 1), ('E5', 1)],
    [('F5', 1), ('A5', 1), ('G5', .5), ('F5', .5), ('E5', 1)],
    [('D5', 1), ('G5', 1), ('F5', .5), ('E5', .5), ('D5', 1)],
    [('C5', 2), (None, 1), ('G4', 1)],
]


def whistle(freq, length):
    t = t_axis(length + 0.08)
    vib = 1 + 0.008 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1)
    f = np.full(len(t), freq) * vib
    x = sine(f) + 0.18 * sine(f * 2) + 0.06 * sine(f * 3)
    return x * adsr(len(t), a=0.03, d=0.08, s=0.75, r=0.08)


def music():
    bars = 16
    total = bars * 4 * BEAT
    out = np.zeros(int(total * SR) + SR * 2)
    for bar in range(bars):
        chord = CHORDS[bar % 8]
        t0 = bar * 4 * BEAT
        # Ukulele-like strums
        for beat, (strength, down) in enumerate([(1.0, True), (0.6, False), (0.85, True), (0.6, False)]):
            notes = CHORD_NOTES[chord] if down else CHORD_NOTES[chord][::-1]
            for k, n in enumerate(notes):
                place(out, pluck(note_hz(n), 0.9, 3.5), t0 + beat * BEAT + k * 0.012, 0.16 * strength)
            place(out, pluck(note_hz(CHORD_NOTES[chord][2]), 0.4, 6), t0 + (beat + 0.5) * BEAT, 0.07)
        # Bass
        for beat in (0, 2):
            place(out, pluck(note_hz(BASS[chord]), 0.8, 2.5), t0 + beat * BEAT, 0.32)
        # Soft kick and shaker
        for beat in range(4):
            tk = t_axis(0.18)
            kick = sine(110 * np.exp(-tk * 18) + 45) * np.exp(-tk * 22)
            if beat in (0, 2):
                place(out, kick, t0 + beat * BEAT, 0.35)
            shaker = highpass(rng.normal(0, 1, int(0.06 * SR)), 6000) * np.exp(-t_axis(0.06) * 60)
            place(out, shaker, t0 + (beat + 0.5) * BEAT, 0.07)
        # Melody: whistle for the first 8 bars, glockenspiel an octave up for the next 8
        at = t0
        for n, dur in MELODY[bar % 8]:
            if n:
                if bar < 8:
                    place(out, whistle(note_hz(n), dur * BEAT), at, 0.24)
                else:
                    place(out, bell(note_hz(n) * 2, 0.8, 0.3), at, 0.2)
            at += dur * BEAT
    # Wrap the tail around so the loop is seamless
    n = int(total * SR)
    loop = out[:n].copy()
    tail = out[n:]
    loop[:len(tail)] += tail
    return loop


def main():
    os.makedirs(OUT, exist_ok=True)
    save('baa1.wav', bleat(430))
    save('baa2.wav', bleat(500, 0.65, 24))
    save('baa3.wav', bleat(340, 0.9, 18))
    save('bark.wav', bark())
    save('howl.wav', howl(), 0.65)
    save('pen.wav', pen_chime(), 0.7)
    save('star.wav', star_ding(), 0.7)
    save('click.wav', click(), 0.6)
    save('win.wav', win_jingle(), 0.8)
    save('lose.wav', lose_sound(), 0.6)
    save('music.wav', music(), 0.7)
    # Music stays a WAV file: it loops without any gap on every phone and in browsers.


if __name__ == '__main__':
    main()
