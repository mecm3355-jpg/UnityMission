import type { GameAudioSettings } from "./audio-settings";
import type { ZoneId } from "./world";

export type AudioRegion = ZoneId | "path";
export type GameSoundEffect = "step" | "dialogue" | "correct" | "wrong" | "level-up" | "fragment" | "finale";

type AudioContextConstructor = new () => AudioContext;

const REGION_NOTES: Record<AudioRegion, readonly number[]> = {
  plaza: [261.63, 329.63, 392],
  history: [220, 261.63, 329.63],
  culture: [293.66, 349.23, 440],
  peace: [246.94, 329.63, 369.99],
  cooperation: [261.63, 392, 493.88],
  future: [329.63, 415.3, 523.25],
  path: [196, 246.94, 293.66],
};

const EFFECT_NOTES: Record<Exclude<GameSoundEffect, "step">, readonly number[]> = {
  dialogue: [440, 554.37],
  correct: [523.25, 659.25, 783.99],
  wrong: [293.66, 246.94],
  "level-up": [392, 523.25, 659.25, 783.99],
  fragment: [659.25, 880, 1046.5],
  finale: [523.25, 659.25, 783.99, 1046.5, 1318.51],
};

export class GameAudioController {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private region: AudioRegion = "plaza";
  private musicStep = 0;
  private settings: GameAudioSettings;

  constructor(settings: GameAudioSettings) {
    this.settings = settings;
  }

  async start(): Promise<void> {
    if (!this.context) {
      const AudioContextClass = (window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext);
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.applyVolume();
      this.restartMusic();
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  setSettings(settings: GameAudioSettings): void {
    this.settings = settings;
    this.applyVolume();
  }

  setRegion(region: AudioRegion): void {
    if (this.region === region) return;
    this.region = region;
    this.musicStep = 0;
  }

  playEffect(effect: GameSoundEffect): void {
    if (this.settings.muted || this.settings.volume === 0) return;
    void this.start().then(() => {
      if (effect === "step") {
        this.playTone(110, 0.035, "triangle", 0.035);
        return;
      }
      const notes = EFFECT_NOTES[effect];
      const finale = effect === "finale";
      notes.forEach((frequency, index) => {
        this.playTone(
          frequency,
          finale ? 0.18 : 0.11,
          finale ? "triangle" : "square",
          finale ? 0.12 : 0.09,
          index * (finale ? 0.095 : 0.075),
        );
      });
    });
  }

  dispose(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    void this.context?.close();
    this.context = null;
    this.masterGain = null;
  }

  private restartMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = setInterval(() => {
      if (this.settings.muted || this.settings.volume === 0) return;
      const notes = REGION_NOTES[this.region];
      const frequency = notes[this.musicStep % notes.length];
      this.musicStep += 1;
      this.playTone(frequency, 0.32, "sine", 0.055);
    }, 620);
  }

  private applyVolume(): void {
    if (!this.masterGain || !this.context) return;
    const volume = this.settings.muted ? 0 : this.settings.volume / 100;
    this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, gainValue: number, delay = 0): void {
    if (!this.context || !this.masterGain) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}
