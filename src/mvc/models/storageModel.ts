import type { AppSettings, InferenceResult, StoragePayload } from './types';

export const APP_VERSION = '1.0.0';
const SCHEMA_VERSION = '1.1.0';

const KEYS = {
  HISTORY: 'verinews_history_v1',
  SETTINGS: 'verinews_settings_v1',
  LEGACY_WATERFALL: 'verinews_waterfall_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultModel: 'logistic_regression',
  saveHistory: true,
  abstentionThreshold: 0.45,
  minCharacters: 40,
  compactMode: false,
  showDetailedProbabilities: true,
  schemaVersion: SCHEMA_VERSION,
};

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function safeReadPayload<T>(key: string, fallback: T): { value: T; recoveredFromCorruption: boolean } {
  const storage = getStorage();
  if (!storage) return { value: fallback, recoveredFromCorruption: false };

  const raw = storage.getItem(key);
  if (!raw) return { value: fallback, recoveredFromCorruption: false };

  try {
    const parsed = JSON.parse(raw) as StoragePayload<T>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
      throw new Error('Formato de almacenamiento local inválido');
    }
    return { value: parsed.data, recoveredFromCorruption: false };
  } catch {
    storage.removeItem(key);
    return { value: fallback, recoveredFromCorruption: true };
  }
}

function safeWritePayload<T>(key: string, data: T): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const payload: StoragePayload<T> = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      data,
    };
    storage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadHistory(): { entries: InferenceResult[]; recovered: boolean } {
  const res = safeReadPayload<InferenceResult[]>(KEYS.HISTORY, []);
  const valid = Array.isArray(res.value)
    ? res.value
        .filter((item) => item && typeof item.id === 'string' && typeof item.classification === 'string')
        .map((item) => ({
          ...item,
          externalEvidenceConsulted: Boolean(item.externalEvidenceConsulted),
        }))
    : [];
  return { entries: valid, recovered: res.recoveredFromCorruption };
}

export function saveHistory(entries: InferenceResult[]): boolean {
  return safeWritePayload(KEYS.HISTORY, entries);
}

export function loadSettings(): AppSettings {
  const res = safeReadPayload<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...res.value,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function saveSettings(settings: AppSettings): boolean {
  return safeWritePayload(KEYS.SETTINGS, settings);
}

export function resetAllLocalData(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(KEYS.HISTORY);
  storage.removeItem(KEYS.SETTINGS);
  storage.removeItem(KEYS.LEGACY_WATERFALL);
}

export function exportHistoryToJson(entries: InferenceResult[]): string {
  const payload: StoragePayload<InferenceResult[]> = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: entries,
  };
  return JSON.stringify(payload, null, 2);
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportHistoryToCsv(entries: InferenceResult[]): string {
  const headers = [
    'id',
    'timestamp',
    'title',
    'url',
    'language',
    'modelId',
    'modelName',
    'modelVersion',
    'classification',
    'confidence',
    'prob_real',
    'prob_falsa',
    'prob_satirica',
    'processingTimeMs',
    'externalEvidenceConsulted',
    'explanation',
  ];

  const rows = entries.map((e) =>
    [
      e.id,
      e.timestamp,
      e.title,
      e.url || '',
      e.language,
      e.modelId,
      e.modelName,
      e.modelVersion,
      e.classification,
      e.confidence,
      e.probabilities.real,
      e.probabilities.falsa,
      e.probabilities.satirica,
      e.processingTimeMs,
      e.externalEvidenceConsulted,
      e.explanation,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
