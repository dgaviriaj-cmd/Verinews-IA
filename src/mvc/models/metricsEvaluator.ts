import { SPANISH_NEWS_CORPUS } from './corpusData';
import { getFittedModelMeta, runInference } from './nlpEngine';
import type { ClassMetrics, ModelEvaluationReport, ModelId, NewsClassLabel } from './types';

const CLASSES: NewsClassLabel[] = ['real', 'falsa', 'satirica'];
const CLASS_DISPLAY: Record<NewsClassLabel, string> = {
  real: 'Auténtica',
  falsa: 'Falsa',
  satirica: 'Sátira',
};

export function evaluateModelOnTestSplit(modelId: ModelId): ModelEvaluationReport {
  const trainCount = SPANISH_NEWS_CORPUS.filter((r) => r.split === 'train').length;
  const valCount = SPANISH_NEWS_CORPUS.filter((r) => r.split === 'val').length;
  const testRecords = SPANISH_NEWS_CORPUS.filter((r) => r.split === 'test');
  const meta = getFittedModelMeta(modelId);

  const matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  let totalInferenceMs = 0;
  let correct = 0;

  for (const rec of testRecords) {
    // Evaluate with abstentionThreshold = 0 so forced classification measures raw test split accuracy
    const res = runInference({
      title: rec.title,
      text: rec.text,
      modelId,
      abstentionThreshold: 0,
      minCharacters: 10,
    });

    totalInferenceMs += res.processingTimeMs;

    const actualIdx = CLASSES.indexOf(rec.label);
    let predIdx = actualIdx;
    if (res.predictedClass) {
      predIdx = CLASSES.indexOf(res.predictedClass);
    } else {
      const probs = [res.probabilities.real, res.probabilities.falsa, res.probabilities.satirica];
      predIdx = probs.indexOf(Math.max(...probs));
    }

    matrix[actualIdx][predIdx] += 1;
    if (actualIdx === predIdx) correct += 1;
  }

  const perClass: ClassMetrics[] = CLASSES.map((label, cIdx) => {
    const tp = matrix[cIdx][cIdx];
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < 3; i++) {
      if (i !== cIdx) {
        fp += matrix[i][cIdx];
        fn += matrix[cIdx][i];
      }
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const support = matrix[cIdx].reduce((a, b) => a + b, 0);

    return {
      label,
      displayName: CLASS_DISPLAY[label],
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
      support,
    };
  });

  const accuracy = testRecords.length > 0 ? correct / testRecords.length : 0;
  const macroPrecision = perClass.reduce((s, c) => s + c.precision, 0) / 3;
  const macroRecall = perClass.reduce((s, c) => s + c.recall, 0) / 3;
  const macroF1 = perClass.reduce((s, c) => s + c.f1, 0) / 3;

  return {
    modelId,
    modelName: meta.name,
    version: meta.version,
    trainSamples: trainCount,
    valSamples: valCount,
    testSamples: testRecords.length,
    vocabularySize: meta.vocabSize,
    accuracy: Number(accuracy.toFixed(4)),
    macroPrecision: Number(macroPrecision.toFixed(4)),
    macroRecall: Number(macroRecall.toFixed(4)),
    macroF1: Number(macroF1.toFixed(4)),
    confusionMatrix: matrix,
    perClass,
    trainingTimeMs: meta.trainingTimeMs,
    avgInferenceTimeMs:
      testRecords.length > 0 ? Number((totalInferenceMs / testRecords.length).toFixed(2)) : 0,
    hyperparameters: meta.hyperparameters,
  };
}

let cachedReports: ModelEvaluationReport[] | null = null;

export function getAllEvaluationReports(): ModelEvaluationReport[] {
  if (!cachedReports) {
    cachedReports = [
      evaluateModelOnTestSplit('logistic_regression'),
      evaluateModelOnTestSplit('linear_svm'),
    ];
  }
  return cachedReports;
}
