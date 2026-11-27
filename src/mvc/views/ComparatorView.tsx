import { useState } from 'react';
import {
  AlertCircle,
  Columns2,
  Info,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { SAMPLE_NEWS_PRESETS } from '../controllers/DetectorController';
import { MODEL_CATALOG } from '../models/nlpEngine';
import type {
  AppSettings,
  CandidateModelId,
  ComparisonResult,
} from '../models/types';
import { ClassificationIndicator } from './ClassificationBadge';

interface ComparatorViewProps {
  settings: AppSettings;
  lastComparison: ComparisonResult | null;
  validationError: string | null;
  isProcessing: boolean;
  onCompare: (payload: {
    title: string;
    text: string;
    selectedModels: CandidateModelId[];
  }) => void;
  onClearError: () => void;
}

export function ComparatorView({
  settings,
  lastComparison,
  validationError,
  isProcessing,
  onCompare,
  onClearError,
}: ComparatorViewProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [selectedModels, setSelectedModels] = useState<CandidateModelId[]>([
    'logistic_regression',
    'linear_svm',
  ]);

  const toggleModel = (id: CandidateModelId, available: boolean) => {
    if (!available) return;
    onClearError();
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = SAMPLE_NEWS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onClearError();
    setTitle(preset.title);
    setText(preset.text);
  };

  const handleReset = () => {
    onClearError();
    setTitle('');
    setText('');
  };

  const cardPad = settings.compactMode ? 'p-5' : 'p-6';

  return (
    <div className="space-y-6">
      <section className={`rounded-lg border border-slate-200 bg-white ${cardPad} space-y-5`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Comparativa simultánea de modelos
            </h2>
            <p className="text-xs text-slate-500">
              Evalúa una misma noticia con los clasificadores disponibles para contrastar
              clasificación, confianza calibrada, tiempo de respuesta y patrones detectados.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-600">
            Cargar ejemplo para comparar:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_NEWS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset.id)}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onCompare({ title, text, selectedModels });
          }}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label
                  htmlFor="compare-title"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Titular (opcional)
                </label>
                <input
                  id="compare-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    onClearError();
                    setTitle(e.target.value);
                  }}
                  placeholder="Ej. Ministerio anuncia actualización de normativa..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="compare-body"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Cuerpo de la noticia (requerido, mínimo {settings.minCharacters} caracteres)
                </label>
                <textarea
                  id="compare-body"
                  rows={6}
                  value={text}
                  onChange={(e) => {
                    onClearError();
                    setText(e.target.value);
                  }}
                  placeholder="Ingresa el texto de la noticia que deseas contrastar entre modelos..."
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <span className="block text-xs font-medium text-slate-700">
                Modelos candidatos a evaluar
              </span>
              <div className="space-y-2.5">
                {MODEL_CATALOG.map((model) => {
                  const checked = model.available && selectedModels.includes(model.id);
                  return (
                    <label
                      key={model.id}
                      className={`flex items-start gap-3 rounded-md border p-3 text-xs transition-colors ${
                        model.available
                          ? checked
                            ? 'border-blue-300 bg-blue-50/40 cursor-pointer'
                            : 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
                          : 'border-slate-200 bg-slate-50 opacity-75 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!model.available}
                        checked={checked}
                        onChange={() => toggleModel(model.id, model.available)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 disabled:opacity-50"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">{model.shortName}</span>
                          <span
                            className={`text-[11px] font-medium whitespace-nowrap ${
                              model.available ? 'text-emerald-700' : 'text-slate-500'
                            }`}
                          >
                            {model.available ? 'Disponible' : 'No disponible'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-slate-600">{model.architectureType}</p>
                        {!model.available && model.unavailableReason && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {model.unavailableReason}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Comparando modelos...</span>
                </>
              ) : (
                <>
                  <Columns2 className="h-4 w-4" aria-hidden="true" />
                  <span>Comparar modelos</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {lastComparison ? (
        <section className={`rounded-lg border border-slate-200 bg-white ${cardPad} space-y-5`}>
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Resultados comparativos — {lastComparison.title}
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">{lastComparison.summary}</p>
            </div>
            <span className="font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap">
              Diferencia de confianza: {lastComparison.confidenceSpread.toFixed(1)} pp
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {lastComparison.results.map((item) => (
              <div
                key={item.modelId}
                className="rounded-md border border-slate-200 bg-slate-50 p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.modelName}</p>
                    <p className="text-xs text-slate-500 font-mono">v{item.modelVersion}</p>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-600">
                    {item.processingTimeMs.toFixed(2)} ms
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <ClassificationIndicator classification={item.classification} size="sm" />
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                    {item.isConclusive ? `${(item.confidence * 100).toFixed(1)}%` : 'Abstención'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 font-mono text-xs tabular-nums text-slate-700">
                  <span>Auténtica: {(item.probabilities.real * 100).toFixed(1)}%</span>
                  <span>Falsa: {(item.probabilities.falsa * 100).toFixed(1)}%</span>
                  <span>Sátira: {(item.probabilities.satirica * 100).toFixed(1)}%</span>
                </div>

                {item.topFeatures.length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs font-medium text-slate-600 mb-1.5">
                      Principales rasgos léxicos ponderados
                    </p>
                    <p className="text-xs text-slate-700">
                      {item.topFeatures
                        .slice(0, 4)
                        .map((f) => `${f.token} (+${f.weight.toFixed(2)})`)
                        .join(' · ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            <span>
              La clasificación de inteligencia artificial estima similitud lingüística con el corpus
              de entrenamiento y no reemplaza la verificación factual de los hechos.
            </span>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
          <Columns2 className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-800">
            Aún no hay una comparativa activa
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Ingresa o carga una noticia arriba y presiona «Comparar modelos» para ver las
            diferencias entre los clasificadores disponibles.
          </p>
        </section>
      )}
    </div>
  );
}
