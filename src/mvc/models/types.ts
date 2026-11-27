export type NewsClassLabel = 'real' | 'falsa' | 'satirica';

export type ClassificationResultLabel =
  | 'Probablemente auténtica'
  | 'Probablemente falsa'
  | 'Posible sátira'
  | 'No concluyente';

export type ModelId = 'logistic_regression' | 'linear_svm';

export type CandidateModelId = ModelId | 'beto';

export type AppModuleId =
  | 'inicio'
  | 'detector'
  | 'comparador'
  | 'metricas'
  | 'historial'
  | 'configuracion';

export type EngineRuntimeStatus = 'ready' | 'processing' | 'unavailable';

export interface ModelCatalogEntry {
  id: CandidateModelId;
  name: string;
  shortName: string;
  architectureType: string;
  version: string;
  available: boolean;
  unavailableReason?: string;
}

export interface CorpusRecord {
  id: string;
  title: string;
  text: string;
  label: NewsClassLabel;
  sourceType: string;
  split: 'train' | 'val' | 'test';
}

export interface FeatureContribution {
  token: string;
  weight: number;
  targetClass: NewsClassLabel;
}

export interface ClassProbabilities {
  real: number;
  falsa: number;
  satirica: number;
}

export interface InferenceResult {
  id: string;
  timestamp: string;
  title: string;
  contentPreview: string;
  fullText: string;
  url?: string;
  language: 'es' | 'other' | 'unknown';
  modelId: ModelId;
  modelName: string;
  modelVersion: string;
  classification: ClassificationResultLabel;
  predictedClass: NewsClassLabel | null;
  confidence: number; // 0..1 calibrated
  probabilities: ClassProbabilities;
  explanation: string;
  topFeatures: FeatureContribution[];
  processingTimeMs: number;
  isConclusive: boolean;
  abstentionReason?: string;
  externalEvidenceConsulted: boolean;
  externalEvidenceNote?: string;
}

export interface ComparisonResult {
  timestamp: string;
  title: string;
  results: InferenceResult[];
  agreement: boolean;
  confidenceSpread: number;
  summary: string;
}

export interface ClassMetrics {
  label: NewsClassLabel;
  displayName: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelEvaluationReport {
  modelId: ModelId;
  modelName: string;
  version: string;
  trainSamples: number;
  valSamples: number;
  testSamples: number;
  vocabularySize: number;
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  confusionMatrix: number[][]; // rows: actual [real, falsa, satirica], cols: predicted [real, falsa, satirica]
  perClass: ClassMetrics[];
  trainingTimeMs: number;
  avgInferenceTimeMs: number;
  hyperparameters: Record<string, string | number>;
}

export interface UrlExtractionResult {
  ok: boolean;
  title?: string;
  text?: string;
  finalUrl?: string;
  error?: string;
}

export interface AppSettings {
  defaultModel: ModelId;
  saveHistory: boolean;
  abstentionThreshold: number; // e.g. 0.45
  minCharacters: number; // e.g. 40
  compactMode: boolean;
  showDetailedProbabilities: boolean;
  schemaVersion: string;
}

export interface StoragePayload<T> {
  schemaVersion: string;
  updatedAt: string;
  data: T;
}
