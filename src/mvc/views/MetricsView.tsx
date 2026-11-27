import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { MODEL_CATALOG } from '../models/nlpEngine';
import type { InferenceResult, ModelEvaluationReport, ModelId } from '../models/types';

interface MetricsViewProps {
  reports: ModelEvaluationReport[];
  history: InferenceResult[];
}

const MATRIX_LABELS = ['Auténtica', 'Falsa', 'Sátira'];

export function MetricsView({ reports, history }: MetricsViewProps) {
  const [activeModelId, setActiveModelId] = useState<ModelId>(
    reports[0]?.modelId || 'logistic_regression'
  );

  const activeReport = reports.find((r) => r.modelId === activeModelId) || reports[0];
  const betoEntry = MODEL_CATALOG.find((m) => m.id === 'beto');

  const classDistribution = [
    {
      label: 'Probablemente auténtica',
      count: history.filter((h) => h.classification === 'Probablemente auténtica').length,
    },
    {
      label: 'Probablemente falsa',
      count: history.filter((h) => h.classification === 'Probablemente falsa').length,
    },
    {
      label: 'Posible sátira',
      count: history.filter((h) => h.classification === 'Posible sátira').length,
    },
    {
      label: 'No concluyente',
      count: history.filter((h) => h.classification === 'No concluyente').length,
    },
  ];

  const avgUserLatency =
    history.length > 0
      ? history.reduce((sum, item) => sum + item.processingTimeMs, 0) / history.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Evaluación experimental en conjunto de prueba */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Evaluación experimental de modelos (conjunto de prueba)
            </h2>
            <p className="text-xs text-slate-500">
              Métricas calculadas ejecutando cada modelo entrenado sobre registros aislados no
              vistos durante el entrenamiento ni en la construcción del vocabulario.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            Entrenamiento: {activeReport.trainSamples} · Validación: {activeReport.valSamples} ·
            Prueba: {activeReport.testSamples}
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Modelo</th>
                <th className="py-2.5 px-3 text-right">Accuracy</th>
                <th className="py-2.5 px-3 text-right">Precision</th>
                <th className="py-2.5 px-3 text-right">Recall</th>
                <th className="py-2.5 px-3 text-right">F1-score</th>
                <th className="py-2.5 px-3 text-right">Entrenamiento</th>
                <th className="py-2.5 pl-3 text-right">Inferencia prom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((rep) => {
                const isSelected = rep.modelId === activeReport.modelId;
                return (
                  <tr
                    key={rep.modelId}
                    className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}
                  >
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => setActiveModelId(rep.modelId)}
                        className="text-left font-medium text-slate-900 hover:text-blue-700"
                      >
                        {rep.modelName}{' '}
                        <span className="font-mono text-xs text-slate-500">v{rep.version}</span>
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                      {(rep.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {(rep.macroPrecision * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {(rep.macroRecall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-blue-800">
                      {(rep.macroF1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {rep.trainingTimeMs.toFixed(2)} ms
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-600">
                      {rep.avgInferenceTimeMs.toFixed(2)} ms
                    </td>
                  </tr>
                );
              })}

              {betoEntry && (
                <tr className="bg-slate-50/70 text-slate-500">
                  <td className="py-3 pr-4 font-medium text-slate-700">{betoEntry.name}</td>
                  <td colSpan={6} className="py-3 px-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                      <AlertCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      <span>
                        Modelo pendiente de evaluación (no disponible en entorno web sin servidor
                        Python/PyTorch).
                      </span>
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Selector de detalle por modelo */}
      <div className="flex flex-wrap items-center gap-2">
        {reports.map((rep) => (
          <button
            key={rep.modelId}
            type="button"
            onClick={() => setActiveModelId(rep.modelId)}
            className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              activeReport.modelId === rep.modelId
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {rep.modelName}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Métricas por clase — {activeReport.modelName}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2 pr-4">Clase</th>
                  <th className="py-2 px-3 text-right">Precision</th>
                  <th className="py-2 px-3 text-right">Recall</th>
                  <th className="py-2 px-3 text-right">F1-score</th>
                  <th className="py-2 pl-3 pr-2 text-right">Soporte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeReport.perClass.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{row.displayName}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {(row.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {(row.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {(row.f1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-3 pr-2 text-right font-mono tabular-nums text-slate-500">
                      {row.support}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">
              Configuración del modelo evaluado
            </h4>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
              {Object.entries(activeReport.hyperparameters).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <dt className="text-slate-500 capitalize">{k.replaceAll('_', ' ')}</dt>
                  <dd className="font-mono font-medium text-slate-900 text-right">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Matriz de confusión (3x3)
            </h3>
            <p className="text-xs text-slate-500">
              Filas: etiqueta real · Columnas: predicción del modelo
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium text-slate-500">Real \ Pred</th>
                  {MATRIX_LABELS.map((lbl) => (
                    <th key={lbl} className="p-2 font-semibold text-slate-700">
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeReport.confusionMatrix.map((row, rIdx) => (
                  <tr key={MATRIX_LABELS[rIdx]} className="border-t border-slate-200">
                    <th className="p-2 text-left font-semibold text-slate-700">
                      {MATRIX_LABELS[rIdx]}
                    </th>
                    {row.map((cell, cIdx) => {
                      const isDiag = rIdx === cIdx;
                      return (
                        <td
                          key={`${rIdx}-${cIdx}`}
                          className={`p-3 font-mono text-sm tabular-nums ${
                            isDiag
                              ? 'bg-emerald-50 font-semibold text-emerald-900'
                              : cell > 0
                                ? 'bg-red-50 font-medium text-red-800'
                                : 'bg-white text-slate-400'
                          }`}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Estadísticas de uso reales separadas de métricas de entrenamiento */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Estadísticas de uso del aplicativo (datos locales reales)
            </h3>
            <p className="text-xs text-slate-500">
              Calculadas únicamente sobre los análisis ejecutados por ti y guardados en tu
              historial local; independientes de las métricas del conjunto de prueba.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            Total analizado: {history.length}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            Aún no hay análisis realizados en este navegador para calcular estadísticas de uso.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {classDistribution.map((item) => (
              <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                  {item.count}
                </p>
              </div>
            ))}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-xs text-slate-500">Latencia media real</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {avgUserLatency.toFixed(2)} ms
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
