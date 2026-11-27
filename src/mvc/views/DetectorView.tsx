import { useState } from 'react';
import {
  AlertCircle,
  Globe,
  Info,
  Link2,
  Loader2,
  RotateCcw,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_NEWS_PRESETS } from '../controllers/DetectorController';
import { MODEL_CATALOG } from '../models/nlpEngine';
import type { AppSettings, InferenceResult, ModelId } from '../models/types';
import { ClassificationIndicator } from './ClassificationBadge';

interface DetectorViewProps {
  settings: AppSettings;
  lastResult: InferenceResult | null;
  validationError: string | null;
  isProcessing: boolean;
  onAnalyze: (payload: {
    title: string;
    text: string;
    url?: string;
    modelId: ModelId;
    externalEvidenceConsulted?: boolean;
    externalEvidenceNote?: string;
  }) => void;
  onExtractUrl: (
    url: string
  ) => Promise<{ ok: boolean; title?: string; text?: string; finalUrl?: string; error?: string }>;
  onClearError: () => void;
}

export function DetectorView({
  settings,
  lastResult,
  validationError,
  isProcessing,
  onAnalyze,
  onExtractUrl,
  onClearError,
}: DetectorViewProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelId>(settings.defaultModel);
  const [extractingUrl, setExtractingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [extractedSourceUrl, setExtractedSourceUrl] = useState<string | null>(null);

  const handleLoadPreset = (presetId: string) => {
    const preset = SAMPLE_NEWS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onClearError();
    setUrlError(null);
    setExtractedSourceUrl(null);
    setTitle(preset.title);
    setText(preset.text);
    setUrl('');
  };

  const handleReset = () => {
    onClearError();
    setUrlError(null);
    setExtractedSourceUrl(null);
    setTitle('');
    setText('');
    setUrl('');
  };

  const handleFetchUrl = async () => {
    onClearError();
    setUrlError(null);
    if (!url.trim()) {
      setUrlError('Ingresa una URL pública (http:// o https://) para intentar extraer el texto.');
      return;
    }
    setExtractingUrl(true);
    try {
      const res = await onExtractUrl(url);
      if (!res.ok) {
        setExtractedSourceUrl(null);
        setUrlError(res.error || 'No se pudo extraer contenido de esa URL.');
      } else {
        if (res.title) setTitle(res.title);
        if (res.text) setText(res.text);
        setExtractedSourceUrl(res.finalUrl || url.trim());
      }
    } finally {
      setExtractingUrl(false);
    }
  };

  const cardPad = settings.compactMode ? 'p-5' : 'p-6';

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Formulario de entrada */}
      <section className={`xl:col-span-7 rounded-lg border border-slate-200 bg-white ${cardPad} space-y-5`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Análisis de noticia
            </h2>
            <p className="text-xs text-slate-500">
              Ingresa el texto manualmente o intenta extraer el contenido desde un enlace público.
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
            Ejemplos de prueba rápida:
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
            onAnalyze({
              title,
              text,
              url,
              modelId: selectedModel,
              externalEvidenceConsulted: Boolean(extractedSourceUrl),
              externalEvidenceNote: extractedSourceUrl
                ? `Texto obtenido directamente de ${extractedSourceUrl}.`
                : undefined,
            });
          }}
        >
          <div>
            <label
              htmlFor="news-url"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              URL de la noticia (opcional — extracción directa sujeta a permisos CORS)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Link2
                  className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="news-url"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    onClearError();
                    setUrlError(null);
                    setExtractedSourceUrl(null);
                    setUrl(e.target.value);
                  }}
                  placeholder="https://medio-ejemplo.org/articulo"
                  className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <button
                type="button"
                disabled={extractingUrl || !url.trim()}
                onClick={() => void handleFetchUrl()}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {extractingUrl ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Extrayendo...</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Extraer texto</span>
                  </>
                )}
              </button>
            </div>
            {urlError && (
              <div
                role="alert"
                className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                <span>{urlError}</span>
              </div>
            )}
            {extractedSourceUrl && !urlError && (
              <p className="mt-1.5 text-xs text-emerald-700">
                Contenido extraído de {extractedSourceUrl}. Revisa el texto antes de analizar.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="news-title"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Titular de la noticia (opcional)
            </label>
            <input
              id="news-title"
              type="text"
              value={title}
              onChange={(e) => {
                onClearError();
                setTitle(e.target.value);
              }}
              placeholder="Ej. Ministerio publica informe técnico anual..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="news-body"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Texto completo de la noticia (requerido, mínimo {settings.minCharacters} caracteres)
            </label>
            <textarea
              id="news-body"
              rows={7}
              value={text}
              onChange={(e) => {
                onClearError();
                setText(e.target.value);
              }}
              placeholder="Pega aquí el contenido completo de la noticia en español..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <div className="mt-1.5 flex items-center justify-between gap-4 text-xs text-slate-500">
              <span>Análisis lingüístico en español ejecutado localmente.</span>
              <span className="font-mono tabular-nums whitespace-nowrap shrink-0">
                {text.trim().length} caracteres
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="news-model"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Modelo de inteligencia artificial
            </label>
            <select
              id="news-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelId)}
              className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {MODEL_CATALOG.map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                  disabled={!model.available}
                >
                  {model.available ? model.name : `${model.name} — No disponible`}
                </option>
              ))}
            </select>
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

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  <span>Analizar con IA</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Panel de resultado */}
      <section className={`xl:col-span-5 rounded-lg border border-slate-200 bg-white ${cardPad}`}>
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Resultado del análisis
        </h2>

        {!lastResult ? (
          <div className="mt-6 rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Listo para analizar una noticia
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Ingresa una noticia o selecciona uno de los ejemplos rápidos y presiona «Analizar con
              IA» para ver la clasificación y sus patrones identificados.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <ClassificationIndicator classification={lastResult.classification} />
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {lastResult.processingTimeMs.toFixed(2)} ms · Idioma:{' '}
                {lastResult.language === 'es' ? 'Español' : lastResult.language === 'other' ? 'Otro' : 'Indeterminado'}
              </span>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">
                {lastResult.modelName} · v{lastResult.modelVersion}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{lastResult.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {lastResult.explanation}
              </p>
            </div>

            {lastResult.isConclusive ? (
              <>
                <div className="space-y-2.5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      Confianza calibrada del modelo
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {(lastResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  {settings.showDetailedProbabilities &&
                    [
                      { key: 'real', label: 'Auténtica', val: lastResult.probabilities.real, bar: 'bg-emerald-600' },
                      { key: 'falsa', label: 'Falsa', val: lastResult.probabilities.falsa, bar: 'bg-red-600' },
                      { key: 'satirica', label: 'Sátira', val: lastResult.probabilities.satirica, bar: 'bg-amber-600' },
                    ].map((row) => (
                      <div key={row.key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">{row.label}</span>
                          <span className="font-mono tabular-nums font-medium text-slate-900">
                            {(row.val * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${row.bar} transition-all`}
                            style={{ width: `${Math.round(row.val * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>

                {lastResult.topFeatures.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-700 mb-2">
                      Patrones identificados por el modelo
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {lastResult.topFeatures.map((feat) => (
                        <div
                          key={feat.token}
                          className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                        >
                          <span className="truncate font-medium text-slate-800">
                            {feat.token}
                          </span>
                          <span className="font-mono tabular-nums text-slate-500 ml-2">
                            +{feat.weight.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Motivo de abstención:{' '}
                <strong className="text-slate-800">{lastResult.abstentionReason}</strong>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-600">
              {lastResult.externalEvidenceConsulted && lastResult.externalEvidenceNote ? (
                <p>
                  <strong className="text-slate-800">Fuente externa consultada:</strong>{' '}
                  {lastResult.externalEvidenceNote}
                </p>
              ) : (
                <p>
                  <strong className="text-slate-800">Evidencias externas:</strong> No se
                  consultaron bases de verificación externas; resultado generado exclusivamente por
                  análisis lingüístico del texto.
                </p>
              )}

              <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden="true" />
                <span>
                  La clasificación de inteligencia artificial no constituye una verificación
                  definitiva de los hechos. Contrasta siempre con fuentes primarias.
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
