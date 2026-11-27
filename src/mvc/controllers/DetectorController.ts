import {
  MODEL_CATALOG,
  fetchUrlContent,
  isValidPublicHttpUrl,
  runInference,
} from '../models/nlpEngine';
import { saveHistory } from '../models/storageModel';
import type {
  AppSettings,
  CandidateModelId,
  ComparisonResult,
  InferenceResult,
  ModelId,
  UrlExtractionResult,
} from '../models/types';

export interface AnalyzeNewsPayload {
  title: string;
  text: string;
  url?: string;
  modelId: ModelId;
  externalEvidenceConsulted?: boolean;
  externalEvidenceNote?: string;
}

export interface SampleNewsPreset {
  id: string;
  label: string;
  expectedNature: string;
  title: string;
  text: string;
}

export const SAMPLE_NEWS_PRESETS: SampleNewsPreset[] = [
  {
    id: 'sample-real',
    label: 'Noticia institucional',
    expectedNature: 'Estilo informativo con cifras y fuente oficial',
    title: 'Ministerio de Ciencia publica convocatoria anual de proyectos de investigación aplicada',
    text: 'Según el comunicado oficial emitido este jueves, la entidad financiará sesenta proyectos universitarios en áreas de energías renovables, biotecnología y procesamiento de lenguaje natural. Los informes técnicos señalan que el presupuesto asignado creció un 8,5 por ciento respecto al año anterior y las postulaciones cerrarán el próximo mes.',
  },
  {
    id: 'sample-falsa',
    label: 'Cadena alarmista',
    expectedNature: 'Urgencia extrema, fuente anónima y conspiración',
    title: '¡URGENTE! Filtran documento secreto que ordena congelar cuentas bancarias este viernes',
    text: '¡URGENTE! Comparte esto antes de que lo borren de internet. Una fuente anónima filtró un documento secreto donde los bancos ordenan congelar cuentas este viernes sin aviso oficial. Ningún medio tradicional te lo dirá porque censuran la verdad oculta. Reenvía ya mismo a todos tus contactos.',
  },
  {
    id: 'sample-satira',
    label: 'Crónica humorística',
    expectedNature: 'Exageración paródica y remate irónico',
    title: 'Estudiante de ingeniería adopta al compilador como tutor espiritual tras olvidar un punto y coma',
    text: 'Tras cuarenta y ocho horas mirando un error de sintaxis que resultó ser un punto y coma faltante, un estudiante de ingeniería anunció solemnemente que adoptará al compilador como tutor espiritual. El departamento de sistemas evalúa otorgar créditos académicos por paciencia heroica frente a la pantalla.',
  },
  {
    id: 'sample-english',
    label: 'Texto en inglés (fuera de dominio)',
    expectedNature: 'Idioma no español — abstención esperada',
    title: 'Central Bank announces quarterly monetary policy review',
    text: 'According to the official report published this Tuesday, the committee decided to maintain interest rates unchanged while monitoring inflation trends across regional markets during the next quarter.',
  },
];

export const DetectorController = {
  validateInput(payload: { text: string; url?: string }): { valid: boolean; error?: string } {
    if (!payload.text.trim()) {
      return {
        valid: false,
        error: 'Ingresa el cuerpo de la noticia antes de ejecutar el análisis.',
      };
    }

    if (payload.url && payload.url.trim().length > 0) {
      const urlCheck = isValidPublicHttpUrl(payload.url);
      if (!urlCheck.valid) {
        return { valid: false, error: urlCheck.reason };
      }
    }

    return { valid: true };
  },

  async extractFromUrl(rawUrl: string): Promise<UrlExtractionResult> {
    return fetchUrlContent(rawUrl);
  },

  analyzeNews(
    payload: AnalyzeNewsPayload,
    settings: AppSettings,
    currentHistory: InferenceResult[]
  ): { result?: InferenceResult; updatedHistory?: InferenceResult[]; error?: string } {
    const check = this.validateInput({ text: payload.text, url: payload.url });
    if (!check.valid) {
      return { error: check.error };
    }

    const result = runInference({
      title: payload.title,
      text: payload.text,
      url: payload.url?.trim() || undefined,
      modelId: payload.modelId,
      abstentionThreshold: settings.abstentionThreshold,
      minCharacters: settings.minCharacters,
      externalEvidenceConsulted: payload.externalEvidenceConsulted,
      externalEvidenceNote: payload.externalEvidenceNote,
    });

    if (settings.saveHistory) {
      const updatedHistory = [result, ...currentHistory].slice(0, 250);
      saveHistory(updatedHistory);
      return { result, updatedHistory };
    }

    return { result, updatedHistory: currentHistory };
  },

  compareModels(
    payload: Omit<AnalyzeNewsPayload, 'modelId'>,
    settings: AppSettings,
    selectedCandidates: CandidateModelId[] = ['logistic_regression', 'linear_svm']
  ): { comparison?: ComparisonResult; error?: string } {
    const check = this.validateInput({ text: payload.text, url: payload.url });
    if (!check.valid) {
      return { error: check.error };
    }

    const availableIds = new Set(
      MODEL_CATALOG.filter((m) => m.available).map((m) => m.id)
    );
    const runnableModels = selectedCandidates.filter(
      (id): id is ModelId => availableIds.has(id) && id !== 'beto'
    );

    if (runnableModels.length < 2) {
      return {
        error: 'Selecciona al menos dos modelos disponibles para ejecutar la comparativa.',
      };
    }

    const results = runnableModels.map((modelId) =>
      runInference({
        title: payload.title,
        text: payload.text,
        url: payload.url?.trim() || undefined,
        modelId,
        abstentionThreshold: settings.abstentionThreshold,
        minCharacters: settings.minCharacters,
        externalEvidenceConsulted: payload.externalEvidenceConsulted,
        externalEvidenceNote: payload.externalEvidenceNote,
      })
    );

    const uniqueClasses = new Set(results.map((r) => r.classification));
    const agreement = uniqueClasses.size === 1;
    const confidences = results.map((r) => r.confidence * 100);
    const confidenceSpread =
      confidences.length >= 2
        ? Number((Math.max(...confidences) - Math.min(...confidences)).toFixed(1))
        : 0;

    const summary = agreement
      ? `Los ${results.length} modelos coinciden en «${results[0].classification}» con una diferencia de confianza de ${confidenceSpread.toFixed(1)} puntos porcentuales.`
      : `Los modelos divergen en la clasificación (${results
          .map((r) => `${r.modelName.split(' ')[0]}: ${r.classification}`)
          .join(' vs. ')}).`;

    return {
      comparison: {
        timestamp: new Date().toISOString(),
        title: results[0].title,
        results,
        agreement,
        confidenceSpread,
        summary,
      },
    };
  },
};
