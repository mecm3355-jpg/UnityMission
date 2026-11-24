"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GAME_AUDIO_SETTINGS,
  GameAudioSettingsStore,
  type GameAudioSettings,
} from "./audio-settings";
import { GameAudioController, type AudioRegion, type GameSoundEffect } from "./audio";

export function useGameAudio() {
  const controllerRef = useRef<GameAudioController | null>(null);
  const storeRef = useRef<GameAudioSettingsStore | null>(null);
  const [settings, setSettings] = useState<GameAudioSettings>(DEFAULT_GAME_AUDIO_SETTINGS);

  useEffect(() => {
    let active = true;
    const store = new GameAudioSettingsStore(window.localStorage);
    const restored = store.load();
    const controller = new GameAudioController(restored);
    storeRef.current = store;
    controllerRef.current = controller;
    queueMicrotask(() => {
      if (active) setSettings(restored);
    });

    const unlock = () => { void controller.start(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      active = false;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      controller.dispose();
      controllerRef.current = null;
      storeRef.current = null;
    };
  }, []);

  const updateSettings = useCallback((next: GameAudioSettings) => {
    setSettings(next);
    controllerRef.current?.setSettings(next);
    storeRef.current?.save(next);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    updateSettings({ ...settings, muted });
  }, [settings, updateSettings]);

  const setVolume = useCallback((volume: number) => {
    const bounded = Math.max(0, Math.min(100, Math.round(volume)));
    updateSettings({ ...settings, volume: bounded, muted: bounded === 0 ? true : settings.muted });
  }, [settings, updateSettings]);

  const playEffect = useCallback((effect: GameSoundEffect) => {
    controllerRef.current?.playEffect(effect);
  }, []);

  const setRegion = useCallback((region: AudioRegion) => {
    controllerRef.current?.setRegion(region);
  }, []);

  return { playEffect, setMuted, setRegion, setVolume, settings };
}
