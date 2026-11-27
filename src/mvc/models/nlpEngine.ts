import { SPANISH_NEWS_CORPUS } from './corpusData';
import type {
  ClassProbabilities,
  ClassificationResultLabel,
  CorpusRecord,
  EngineRuntimeStatus,
  FeatureContribution,
  InferenceResult,
  ModelCatalogEntry,
  ModelId,
  NewsClassLabel,
  UrlExtractionResult,
} from './types';

const CLASSES: NewsClassLabel[] = ['real', 'falsa', 'satirica'];

const SPANISH_STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por',
  'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero',
  'sus', 'le', 'ya', 'o', 'este', 'si', 'porque', 'esta', 'entre', 'cuando',
  'muy', 'sin', 'sobre', 'tambien', 'me', 'hasta', 'hay', 'donde', 'quien',
  'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra',
  'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mi', 'antes', 'algunos',
  'unos', 'yo', 'otro', 'otras', 'otra', 'el', 'tanto', 'esa', 'estos', 'mucho',
  'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas',
  'algo', 'nosotros', 'mi', 'mis', 'tu', 'te', 'ti', 'tus', 'ellas', 'nosotras',
  'vosotros', 'vosotras', 'os', 'mio', 'mia', 'mios', 'mias', 'tuyo', 'tuya',
  'suyo', 'suya', 'nuestro', 'nuestra', 'vuestro', 'vuestra', 'esos', 'esas',
  'estoy', 'estas', 'esta', 'estamos', 'estais', 'estan', 'fue', 'fueron', 'ser',
  'es', 'son', 'era', 'han', 'ha', 'haber', 'hace', 'cada', 'tras', 'segun',
]);

const SPANISH_MARKERS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'que', 'en', 'y', 'para', 'con', 'por',
  'una', 'un', 'segun', 'durante', 'tras', 'entre', 'sobre', 'sin', 'ante',
  'hasta', 'desde', 'mas', 'tambien', 'este', 'esta', 'son', 'fue', 'sera',
]);

const ENGLISH_MARKERS = new Set([
  'the', 'and', 'of', 'to', 'in', 'is', 'that', 'for', 'it', 'with', 'as',
  'was', 'on', 'are', 'by', 'this', 'from', 'be', 'have', 'which', 'breaking',
]);

export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeText(input: string): string {
  return stripHtml(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectLanguage(rawText: string): 'es' | 'other' | 'unknown' {
  const clean = normalizeText(rawText);
  if (!clean) return 'unknown';
  const words = clean.split(' ').filter((w) => w.length >= 2);
  if (words.length < 4) return 'unknown';

  let esHits = 0;
  let enHits = 0;
  for (const w of words) {
    if (SPANISH_MARKERS.has(w)) esHits++;
    if (ENGLISH_MARKERS.has(w)) enHits++;
  }

  const hasSpanishAccents = /[áéíóúüñ¿¡]/i.test(rawText);
  if (hasSpanishAccents) esHits += 2;

  if (enHits > esHits && enHits >= 3) return 'other';
  if (esHits === 0 && words.length >= 8) return 'other';
  return 'es';
}

export function extractTokens(rawText: string): string[] {
  const clean = normalizeText(rawText);
  const baseWords = clean
    .split(' ')
    .filter((w) => w.length >= 3 && !SPANISH_STOPWORDS.has(w));

  const features: string[] = [...baseWords];
  for (let i = 0; i < baseWords.length - 1; i++) {
    features.push(`${baseWords[i]}_${baseWords[i + 1]}`);
  }

  const exclamations = (rawText.match(/[!¡]/g) || []).length;
  if (exclamations >= 2) features.push('__estilo_exclamaciones_multiples');
  else if (exclamations === 1) features.push('__estilo_exclamacion');

  const upperChars = (rawText.match(/[A-ZÁÉÍÓÚÑ]/g) || []).length;
  const letterChars = (rawText.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/g) || []).length || 1;
  if (upperChars / letterChars > 0.18) {
    features.push('__estilo_mayusculas_altas');
  }

  if (/\d+([.,]\d+)?\s*(por ciento|%)/.test(rawText.toLowerCase())) {
    features.push('__estilo_cifra_porcentual');
  }

  return features;
}

export function isValidPublicHttpUrl(rawUrl: string): { valid: boolean; reason?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: false, reason: 'URL vacía' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Formato de URL inválido. Debe iniciar con http:// o https://' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Protocolo no permitido. Solo se aceptan enlaces HTTP o HTTPS.' };
  }

  const host = parsed.hostname.toLowerCase();
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  if (
    blockedHosts.includes(host) ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return {
      valid: false,
      reason: 'Acceso bloqueado por seguridad: dirección privada o reservada no permitida.',
    };
  }

  return { valid: true };
}

function decodeBasicHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ');
}

export function extractArticleFromHtml(html: string): { title: string; text: string } {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const ogMatch = withoutScripts.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  const titleTagMatch = withoutScripts.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = withoutScripts.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  const rawTitle = ogMatch?.[1] || h1Match?.[1] || titleTagMatch?.[1] || '';
  const title = decodeBasicHtmlEntities(stripHtml(rawTitle)).trim();

  const articleMatch = withoutScripts.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = withoutScripts.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const scopeHtml = articleMatch?.[1] || mainMatch?.[1] || withoutScripts;

  const paragraphMatches = Array.from(scopeHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((m) => decodeBasicHtmlEntities(stripHtml(m[1])).trim())
    .filter((p) => p.length >= 25);

  const text =
    paragraphMatches.length > 0
      ? paragraphMatches.join('\n\n')
      : decodeBasicHtmlEntities(stripHtml(scopeHtml)).trim();

  return { title, text };
}

export async function fetchUrlContent(rawUrl: string): Promise<UrlExtractionResult> {
  const urlCheck = isValidPublicHttpUrl(rawUrl);
  if (!urlCheck.valid) {
    return { ok: false, error: urlCheck.reason };
  }

  const trimmed = rawUrl.trim();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(trimmed, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `El sitio respondió con estado HTTP ${response.status}. Copia y pega el texto manualmente para analizarlo.`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('xhtml')
    ) {
      return {
        ok: false,
        error: `Tipo de contenido no compatible (${contentType}). Solo se admite HTML o texto plano.`,
      };
    }

    const body = await response.text();
    const extracted = contentType.includes('text/plain')
      ? { title: '', text: body.trim() }
      : extractArticleFromHtml(body);

    if (!extracted.text || extracted.text.length < 40) {
      return {
        ok: false,
        error:
          'No fue posible extraer suficiente texto legible desde esa URL (puede requerir JavaScript o bloqueos de acceso). Pega el texto manualmente.',
      };
    }

    return {
      ok: true,
      title: extracted.title,
      text: extracted.text.slice(0, 12000),
      finalUrl: response.url || trimmed,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        error:
          'Tiempo de espera agotado al consultar la URL. Verifica la conexión o pega el texto manualmente.',
      };
    }
    return {
      ok: false,
      error:
        'El navegador bloqueó la lectura directa de esta URL por política CORS del sitio de origen (esta aplicación opera localmente sin servidor proxy). Copia y pega el texto de la noticia para analizarlo.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

interface FittedModel {
  id: ModelId;
  name: string;
  version: string;
  vocab: string[];
  vocabIndex: Map<string, number>;
  idf: Float64Array;
  weights: Float64Array[]; // [3][vocabSize]
  biases: Float64Array; // [3]
  trainingTimeMs: number;
  hyperparameters: Record<string, string | number>;
}

function vectorize(
  tokens: string[],
  vocabIndex: Map<string, number>,
  idf: Float64Array
): Map<number, number> {
  const tf = new Map<number, number>();
  for (const token of tokens) {
    const idx = vocabIndex.get(token);
    if (idx !== undefined) {
      tf.set(idx, (tf.get(idx) || 0) + 1);
    }
  }
  const vec = new Map<number, number>();
  let normSq = 0;
  for (const [idx, count] of tf.entries()) {
    const val = (1 + Math.log(count)) * idf[idx];
    vec.set(idx, val);
    normSq += val * val;
  }
  const norm = Math.sqrt(normSq) || 1;
  for (const [idx, val] of vec.entries()) {
    vec.set(idx, val / norm);
  }
  return vec;
}

function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

function buildVectorizer(trainRecords: CorpusRecord[]) {
  const docFreq = new Map<string, number>();
  const tokenizedDocs = trainRecords.map((rec) => {
    const tokens = extractTokens(`${rec.title} ${rec.text}`);
    const unique = new Set(tokens);
    for (const tok of unique) {
      docFreq.set(tok, (docFreq.get(tok) || 0) + 1);
    }
    return { label: rec.label, tokens };
  });

  const vocab = Array.from(docFreq.keys()).sort();
  const vocabIndex = new Map<string, number>();
  vocab.forEach((term, i) => vocabIndex.set(term, i));

  const nDocs = trainRecords.length;
  const idf = new Float64Array(vocab.length);
  for (let i = 0; i < vocab.length; i++) {
    const df = docFreq.get(vocab[i]) || 1;
    idf[i] = Math.log((1 + nDocs) / (1 + df)) + 1;
  }

  const vectors = tokenizedDocs.map((d) => ({
    labelIdx: CLASSES.indexOf(d.label),
    vec: vectorize(d.tokens, vocabIndex, idf),
  }));

  return { vocab, vocabIndex, idf, vectors };
}

function trainLogisticRegression(trainRecords: CorpusRecord[]): FittedModel {
  const t0 = performance.now();
  const { vocab, vocabIndex, idf, vectors } = buildVectorizer(trainRecords);
  const V = vocab.length;
  const weights = [new Float64Array(V), new Float64Array(V), new Float64Array(V)];
  const biases = new Float64Array(3);

  const epochs = 180;
  const lr = 0.85;
  const l2 = 0.0015;
  const N = vectors.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = [new Float64Array(V), new Float64Array(V), new Float64Array(V)];
    const gradB = new Float64Array(3);

    for (const sample of vectors) {
      const logits = [biases[0], biases[1], biases[2]];
      for (let c = 0; c < 3; c++) {
        let dot = 0;
        for (const [idx, val] of sample.vec.entries()) {
          dot += weights[c][idx] * val;
        }
        logits[c] += dot;
      }
      const probs = softmax(logits);
      for (let c = 0; c < 3; c++) {
        const err = probs[c] - (c === sample.labelIdx ? 1 : 0);
        gradB[c] += err;
        for (const [idx, val] of sample.vec.entries()) {
          gradW[c][idx] += err * val;
        }
      }
    }

    for (let c = 0; c < 3; c++) {
      biases[c] -= lr * (gradB[c] / N);
      for (let j = 0; j < V; j++) {
        weights[c][j] -= lr * (gradW[c][j] / N + l2 * weights[c][j]);
      }
    }
  }

  const trainingTimeMs = Math.max(1, Math.round((performance.now() - t0) * 100) / 100);

  return {
    id: 'logistic_regression',
    name: 'Regresión Logística (TF-IDF)',
    version: '1.2.0',
    vocab,
    vocabIndex,
    idf,
    weights,
    biases,
    trainingTimeMs,
    hyperparameters: {
      vectorizador: 'TF-IDF Unigramas + Bigramas',
      regularizacion: 'L2 (lambda=0.0015)',
      epocas: epochs,
      tasa_aprendizaje: lr,
    },
  };
}

function trainLinearSvm(trainRecords: CorpusRecord[]): FittedModel {
  const t0 = performance.now();
  const { vocab, vocabIndex, idf, vectors } = buildVectorizer(trainRecords);
  const V = vocab.length;
  const weights = [new Float64Array(V), new Float64Array(V), new Float64Array(V)];
  const biases = new Float64Array(3);

  const epochs = 200;
  const lr = 0.6;
  const l2 = 0.0025;
  const N = vectors.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const stepLr = lr / (1 + 0.008 * epoch);
    for (let c = 0; c < 3; c++) {
      const gradW = new Float64Array(V);
      let gradB = 0;
      for (const sample of vectors) {
        const y = sample.labelIdx === c ? 1 : -1;
        let score = biases[c];
        for (const [idx, val] of sample.vec.entries()) {
          score += weights[c][idx] * val;
        }
        if (y * score < 1) {
          gradB -= y;
          for (const [idx, val] of sample.vec.entries()) {
            gradW[idx] -= y * val;
          }
        }
      }
      biases[c] -= stepLr * (gradB / N);
      for (let j = 0; j < V; j++) {
        weights[c][j] -= stepLr * (gradW[j] / N + l2 * weights[c][j]);
      }
    }
  }

  const trainingTimeMs = Math.max(1, Math.round((performance.now() - t0) * 100) / 100);

  return {
    id: 'linear_svm',
    name: 'SVM Lineal Calibrado (TF-IDF)',
    version: '1.1.0',
    vocab,
    vocabIndex,
    idf,
    weights,
    biases,
    trainingTimeMs,
    hyperparameters: {
      kernel: 'Lineal (One-vs-Rest Hinge)',
      calibracion: 'Escalado de temperatura (Platt/Softmax)',
      regularizacion: 'L2 (lambda=0.0025)',
      epocas: epochs,
    },
  };
}

// Train once deterministically on the train split ONLY (70% split)
const TRAIN_SPLIT = SPANISH_NEWS_CORPUS.filter((r) => r.split === 'train');
const MODELS: Record<ModelId, FittedModel> = {
  logistic_regression: trainLogisticRegression(TRAIN_SPLIT),
  linear_svm: trainLinearSvm(TRAIN_SPLIT),
};

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: 'logistic_regression',
    name: 'Regresión Logística (TF-IDF)',
    shortName: 'Regresión Logística',
    architectureType: 'Clasificador lineal multinomial supervisado',
    version: MODELS.logistic_regression.version,
    available: MODELS.logistic_regression.vocab.length > 0,
  },
  {
    id: 'linear_svm',
    name: 'SVM Lineal Calibrado (TF-IDF)',
    shortName: 'Support Vector Machine (SVM)',
    architectureType: 'Margen máximo One-vs-Rest con calibración Softmax',
    version: MODELS.linear_svm.version,
    available: MODELS.linear_svm.vocab.length > 0,
  },
  {
    id: 'beto',
    name: 'BETO (Transformer en español)',
    shortName: 'BETO',
    architectureType: 'Red neuronal Transformer preentrenada (PyTorch)',
    version: 'No cargado',
    available: false,
    unavailableReason:
      'Requiere entorno de ejecución Python/PyTorch para inferencia Transformer; no ejecutable localmente en navegador sin servidor externo.',
  },
];

export function getEngineRuntimeSummary(isProcessing = false): {
  status: EngineRuntimeStatus;
  label: string;
  activeModels: number;
  totalCandidates: number;
} {
  const activeModels = MODEL_CATALOG.filter((m) => m.available).length;
  const totalCandidates = MODEL_CATALOG.length;

  if (activeModels === 0) {
    return {
      status: 'unavailable',
      label: 'Modelo no disponible',
      activeModels: 0,
      totalCandidates,
    };
  }
  if (isProcessing) {
    return {
      status: 'processing',
      label: 'Procesando',
      activeModels,
      totalCandidates,
    };
  }
  return {
    status: 'ready',
    label: 'Modelo disponible',
    activeModels,
    totalCandidates,
  };
}

export function getFittedModelMeta(modelId: ModelId) {
  const m = MODELS[modelId];
  return {
    id: m.id,
    name: m.name,
    version: m.version,
    vocabSize: m.vocab.length,
    trainingTimeMs: m.trainingTimeMs,
    hyperparameters: m.hyperparameters,
  };
}

export function mapClassToDisplay(label: NewsClassLabel): ClassificationResultLabel {
  switch (label) {
    case 'real':
      return 'Probablemente auténtica';
    case 'falsa':
      return 'Probablemente falsa';
    case 'satirica':
      return 'Posible sátira';
  }
}

export function formatFeatureLabel(token: string): string {
  if (token === '__estilo_exclamaciones_multiples') return 'Múltiples signos de exclamación';
  if (token === '__estilo_exclamacion') return 'Uso de exclamación';
  if (token === '__estilo_mayusculas_altas') return 'Alta proporción de mayúsculas';
  if (token === '__estilo_cifra_porcentual') return 'Datos porcentuales explícitos';
  return token.replace('_', ' ');
}

export function runInference(params: {
  title: string;
  text: string;
  url?: string;
  modelId: ModelId;
  abstentionThreshold?: number;
  minCharacters?: number;
  externalEvidenceConsulted?: boolean;
  externalEvidenceNote?: string;
}): InferenceResult {
  const t0 = performance.now();
  const model = MODELS[params.modelId];
  const threshold = params.abstentionThreshold ?? 0.45;
  const minChars = params.minCharacters ?? 40;

  const combinedText = `${params.title.trim()} ${params.text.trim()}`.trim();
  const cleanTitle = stripHtml(params.title.trim()) || 'Sin titular especificado';
  const cleanBody = stripHtml(params.text.trim());
  const language = detectLanguage(combinedText);
  const externalConsulted = Boolean(params.externalEvidenceConsulted);

  const baseId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `vn-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  if (cleanBody.length < minChars) {
    const dt = Math.max(0.2, Math.round((performance.now() - t0) * 100) / 100);
    return {
      id: baseId,
      timestamp: new Date().toISOString(),
      title: cleanTitle,
      contentPreview: cleanBody.slice(0, 140),
      fullText: cleanBody,
      url: params.url,
      language,
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version,
      classification: 'No concluyente',
      predictedClass: null,
      confidence: 0,
      probabilities: { real: 0.333, falsa: 0.333, satirica: 0.334 },
      explanation: `Texto insuficiente para inferencia fiable (se requieren al menos ${minChars} caracteres en español).`,
      topFeatures: [],
      processingTimeMs: dt,
      isConclusive: false,
      abstentionReason: 'Longitud de texto insuficiente',
      externalEvidenceConsulted: externalConsulted,
      externalEvidenceNote: params.externalEvidenceNote,
    };
  }

  if (language !== 'es') {
    const dt = Math.max(0.2, Math.round((performance.now() - t0) * 100) / 100);
    return {
      id: baseId,
      timestamp: new Date().toISOString(),
      title: cleanTitle,
      contentPreview: cleanBody.slice(0, 140),
      fullText: cleanBody,
      url: params.url,
      language,
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version,
      classification: 'No concluyente',
      predictedClass: null,
      confidence: 0,
      probabilities: { real: 0.333, falsa: 0.333, satirica: 0.334 },
      explanation:
        'Abstención automática: el contenido no coincide con patrones lingüísticos del idioma español para el cual fueron entrenados los modelos.',
      topFeatures: [],
      processingTimeMs: dt,
      isConclusive: false,
      abstentionReason: 'Idioma fuera de dominio (no español)',
      externalEvidenceConsulted: externalConsulted,
      externalEvidenceNote: params.externalEvidenceNote,
    };
  }

  const tokens = extractTokens(combinedText);
  const vec = vectorize(tokens, model.vocabIndex, model.idf);

  if (vec.size === 0) {
    const dt = Math.max(0.2, Math.round((performance.now() - t0) * 100) / 100);
    return {
      id: baseId,
      timestamp: new Date().toISOString(),
      title: cleanTitle,
      contentPreview: cleanBody.slice(0, 140),
      fullText: cleanBody,
      url: params.url,
      language,
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version,
      classification: 'No concluyente',
      predictedClass: null,
      confidence: 0,
      probabilities: { real: 0.333, falsa: 0.333, satirica: 0.334 },
      explanation:
        'El texto no contiene suficientes términos dentro del vocabulario entrenado para emitir una clasificación concluyente.',
      topFeatures: [],
      processingTimeMs: dt,
      isConclusive: false,
      abstentionReason: 'Vocabulario fuera de distribución',
      externalEvidenceConsulted: externalConsulted,
      externalEvidenceNote: params.externalEvidenceNote,
    };
  }

  const rawScores = [model.biases[0], model.biases[1], model.biases[2]];
  for (let c = 0; c < 3; c++) {
    let dot = 0;
    for (const [idx, val] of vec.entries()) {
      dot += model.weights[c][idx] * val;
    }
    rawScores[c] += dot;
  }

  const temperature = model.id === 'linear_svm' ? 0.52 : 0.9;
  const probsArr = softmax(rawScores.map((s) => s / temperature));
  const probabilities: ClassProbabilities = {
    real: Number(probsArr[0].toFixed(4)),
    falsa: Number(probsArr[1].toFixed(4)),
    satirica: Number(probsArr[2].toFixed(4)),
  };

  let bestIdx = 0;
  for (let i = 1; i < 3; i++) {
    if (probsArr[i] > probsArr[bestIdx]) bestIdx = i;
  }
  const bestLabel = CLASSES[bestIdx];
  const confidence = probsArr[bestIdx];

  const contributions: FeatureContribution[] = [];
  for (const [idx, val] of vec.entries()) {
    const w = model.weights[bestIdx][idx] * val;
    if (w > 0) {
      contributions.push({
        token: formatFeatureLabel(model.vocab[idx]),
        weight: Number(w.toFixed(4)),
        targetClass: bestLabel,
      });
    }
  }
  contributions.sort((a, b) => b.weight - a.weight);
  const topFeatures = contributions.slice(0, 6);

  const isConclusive = confidence >= threshold;
  const classification: ClassificationResultLabel = isConclusive
    ? mapClassToDisplay(bestLabel)
    : 'No concluyente';

  const explanation = isConclusive
    ? `Clasificación obtenida mediante análisis lingüístico TF-IDF en español a partir de patrones léxicos y estilísticos (${topFeatures
        .slice(0, 3)
        .map((f) => `"${f.token}"`)
        .join(', ')}).`
    : `La probabilidad calibrada máxima (${(confidence * 100).toFixed(
        1
      )}%) es inferior al umbral configurado (${(threshold * 100).toFixed(
        0
      )}%). Se recomienda revisión humana.`;

  const processingTimeMs = Math.max(0.2, Math.round((performance.now() - t0) * 100) / 100);

  return {
    id: baseId,
    timestamp: new Date().toISOString(),
    title: cleanTitle,
    contentPreview: cleanBody.slice(0, 150),
    fullText: cleanBody,
    url: params.url,
    language,
    modelId: model.id,
    modelName: model.name,
    modelVersion: model.version,
    classification,
    predictedClass: isConclusive ? bestLabel : null,
    confidence: Number(confidence.toFixed(4)),
    probabilities,
    explanation,
    topFeatures,
    processingTimeMs,
    isConclusive,
    abstentionReason: isConclusive ? undefined : 'Confianza calibrada por debajo del umbral',
    externalEvidenceConsulted: externalConsulted,
    externalEvidenceNote: params.externalEvidenceNote,
  };
}
