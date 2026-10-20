// Sound for the whole game (spec §11), synthesized with WebAudio: no audio files to download
// or license (DECISIONS D95). Silent until the first click or key press (browser autoplay
// rules), then follows the music / effects volume settings.
import { getSettings, onSettingsChanged } from '../core/Settings';
import { type MusicTrack, TRACKS } from './music';

export type Sfx = 'click' | 'build' | 'coin' | 'alert' | 'splash' | 'page';
export type Ambience = 'day' | 'night' | 'none';

/** Seconds of crossfade between music tracks / ambiences. */
const FADE_S = 3;
/** How far ahead the music scheduler queues notes, and how often it wakes. */
const LOOKAHEAD_S = 0.3;
const TICK_MS = 100;
/** Same sound again within this many ms is skipped (e.g. holding the pump). */
const SFX_GAP_MS = 90;
const MUSIC_LEVEL = 0.35;
const AMBIENCE_LEVEL = 0.5;

class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlayed = new Map<Sfx, number>();

  private wantedTrack: MusicTrack | null = null;
  private track: { id: MusicTrack; gain: GainNode; nextNote: number; step: number } | null = null;
  private ambience: { id: Ambience; gain: GainNode; stop: () => void } | null = null;
  private wantedAmbience: Ambience = 'none';

  constructor() {
    onSettingsChanged(() => this.applyVolumes());
  }

  /** Call once from a user gesture; afterwards sound can play (autoplay policy). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = globalThis.AudioContext;
    if (!Ctor) return; // no WebAudio: the game stays silent
    this.ctx = new Ctor();
    const master = this.ctx.createGain();
    master.connect(this.ctx.destination);
    this.sfxBus = this.bus(master);
    this.musicBus = this.bus(master);
    this.ambienceBus = this.bus(master);
    this.noise = this.makeNoise();
    this.applyVolumes();
    setInterval(() => this.schedule(), TICK_MS);
    this.setMusic(this.wantedTrack);
    this.setAmbience(this.wantedAmbience);
  }

  sfx(name: Sfx): void {
    const ctx = this.ctx;
    const out = this.sfxBus;
    if (!ctx || !out) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? 0) < SFX_GAP_MS) return;
    this.lastPlayed.set(name, now);
    const t = ctx.currentTime;
    switch (name) {
      case 'click':
        this.tone(out, 'sine', 880, t, 0.04, 0.12);
        break;
      case 'coin':
        this.tone(out, 'triangle', 988, t, 0.08, 0.15);
        this.tone(out, 'triangle', 1319, t + 0.08, 0.14, 0.15);
        break;
      case 'build':
        // Two hammer knocks: a low thump plus a short burst of filtered noise.
        for (const offset of [0, 0.16]) {
          this.tone(out, 'sine', 140, t + offset, 0.12, 0.35, 60);
          this.noiseBurst(out, t + offset, 0.06, 1800, 0.25);
        }
        break;
      case 'alert':
        this.tone(out, 'square', 660, t, 0.12, 0.06);
        this.tone(out, 'square', 520, t + 0.13, 0.16, 0.06);
        break;
      case 'splash':
        this.noiseBurst(out, t, 0.28, 2200, 0.3, 500);
        break;
      case 'page':
        this.noiseBurst(out, t, 0.12, 3500, 0.12, 1500);
        break;
    }
  }

  /** Crossfade to a music track (null = silence). Safe to call every frame. */
  setMusic(id: MusicTrack | null): void {
    this.wantedTrack = id;
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || this.track?.id === id) return;
    if (this.track) this.fadeOut(this.track.gain);
    if (!id) {
      this.track = null;
      return;
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_S);
    gain.connect(this.musicBus);
    this.track = { id, gain, nextNote: ctx.currentTime + 0.1, step: 0 };
  }

  /** Crossfade the background soundscape. Safe to call every frame. */
  setAmbience(id: Ambience): void {
    this.wantedAmbience = id;
    const ctx = this.ctx;
    if (!ctx || !this.ambienceBus || this.ambience?.id === id) return;
    if (this.ambience) {
      const old = this.ambience;
      this.fadeOut(old.gain);
      setTimeout(old.stop, FADE_S * 1000 + 100);
    }
    this.ambience = id === 'none' ? null : this.startAmbience(id);
  }

  private bus(to: AudioNode): GainNode {
    const g = (this.ctx as AudioContext).createGain();
    g.connect(to);
    return g;
  }

  private applyVolumes(): void {
    const s = getSettings();
    const ctx = this.ctx;
    if (!ctx) return;
    this.sfxBus?.gain.setTargetAtTime(s.sfxVolume, ctx.currentTime, 0.05);
    this.musicBus?.gain.setTargetAtTime(s.musicVolume * MUSIC_LEVEL, ctx.currentTime, 0.05);
    this.ambienceBus?.gain.setTargetAtTime(s.sfxVolume * AMBIENCE_LEVEL, ctx.currentTime, 0.05);
  }

  private fadeOut(gain: GainNode): void {
    const ctx = this.ctx as AudioContext;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_S);
    setTimeout(() => gain.disconnect(), FADE_S * 1000 + 200);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** A plain enveloped oscillator note; `slideTo` glides the pitch down (thumps). */
  private tone(
    out: AudioNode,
    type: OscillatorType,
    freq: number,
    at: number,
    length: number,
    level: number,
    slideTo?: number,
  ): void {
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + length);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(level, at + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  /** Filtered noise burst; `sweepTo` slides the filter (a splash falls from bright to dull). */
  private noiseBurst(
    out: AudioNode,
    at: number,
    length: number,
    freq: number,
    level: number,
    sweepTo?: number,
  ): void {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, at);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(level, at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(filter).connect(env).connect(out);
    src.start(at, Math.random());
    src.stop(at + length + 0.02);
  }

  /** Day: soft wind + occasional bird calls. Night: crickets. */
  private startAmbience(id: Exclude<Ambience, 'none'>): {
    id: Ambience;
    gain: GainNode;
    stop: () => void;
  } {
    const ctx = this.ctx as AudioContext;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE_S);
    gain.connect(this.ambienceBus as GainNode);

    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = id === 'day' ? 500 : 300;
    const windLevel = ctx.createGain();
    windLevel.gain.value = id === 'day' ? 0.12 : 0.05;
    // Slow swell, so the wind breathes instead of hissing.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.05;
    lfo.connect(lfoDepth).connect(windLevel.gain);
    wind.connect(windFilter).connect(windLevel).connect(gain);
    wind.start();
    lfo.start();

    const call = (): void => {
      const t = ctx.currentTime;
      if (id === 'day') {
        // A two- or three-note bird call.
        const base = 1800 + Math.random() * 900;
        const notes = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < notes; i++)
          this.tone(gain, 'sine', base * (1 + i * 0.12), t + i * 0.11, 0.09, 0.05);
      } else {
        // A cricket: a burst of fast high pulses.
        for (let i = 0; i < 6; i++) this.tone(gain, 'sine', 4300, t + i * 0.035, 0.02, 0.025);
      }
    };
    const interval = setInterval(call, id === 'day' ? 2600 : 700);
    return {
      id,
      gain,
      stop: () => {
        clearInterval(interval);
        wind.stop();
        lfo.stop();
      },
    };
  }

  /** Music scheduler: queues the next notes slightly ahead of time for smooth timing. */
  private schedule(): void {
    const ctx = this.ctx;
    const track = this.track;
    if (!ctx || !track) return;
    const def = TRACKS[track.id];
    const stepS = 60 / def.bpm / 2; // eighth notes
    while (track.nextNote < ctx.currentTime + LOOKAHEAD_S) {
      const i = track.step % def.melody.length;
      const note = def.melody[i];
      if (note !== null && note !== undefined)
        this.pluck(track.gain, midiToHz(note), track.nextNote);
      // A soft pad chord at the start of every bar of 8 steps.
      if (i % 8 === 0) {
        const chord = def.chords[Math.floor(i / 8) % def.chords.length] ?? [];
        for (const n of chord) this.pad(track.gain, midiToHz(n), track.nextNote, stepS * 8);
      }
      track.nextNote += stepS;
      track.step++;
    }
  }

  /** Kalimba-like pluck. */
  private pluck(out: AudioNode, freq: number, at: number): void {
    this.tone(out, 'triangle', freq, at, 1.1, 0.22);
    this.tone(out, 'sine', freq * 2, at, 0.4, 0.06);
  }

  private pad(out: AudioNode, freq: number, at: number, length: number): void {
    const ctx = this.ctx as AudioContext;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.05, at + length * 0.4);
    env.gain.linearRampToValueAtTime(0, at + length);
    filter.connect(env).connect(out);
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + length + 0.05);
    }
  }
}

function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** The one audio manager for the game. */
export const audio = new AudioManager();
