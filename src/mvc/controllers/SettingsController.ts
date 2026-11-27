import { DEFAULT_SETTINGS, saveSettings } from '../models/storageModel';
import type { AppSettings } from '../models/types';

export const SettingsController = {
  updateSettings(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
    const clampedThreshold =
      patch.abstentionThreshold !== undefined
        ? Math.min(0.75, Math.max(0.35, Number(patch.abstentionThreshold)))
        : current.abstentionThreshold;

    const clampedMinChars =
      patch.minCharacters !== undefined
        ? Math.min(200, Math.max(20, Math.round(Number(patch.minCharacters))))
        : current.minCharacters;

    const updated: AppSettings = {
      ...current,
      ...patch,
      abstentionThreshold: Number(clampedThreshold.toFixed(2)),
      minCharacters: clampedMinChars,
    };

    saveSettings(updated);
    return updated;
  },

  resetSettings(): AppSettings {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },
};
