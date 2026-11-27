import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  History,
  ScanSearch,
} from 'lucide-react';
import { MODEL_CATALOG } from '../models/nlpEngine';
import type {
  AppModuleId,
  AppSettings,
  InferenceResult,
} from '../models/types';
import { ClassificationIndicator } from './ClassificationBadge';

interface OverviewViewProps {
  history: InferenceResult[];
  settings: AppSettings;
  onNavigate: (module: AppModuleId) => void;
}

export function OverviewView({
  history,
  settings,
  onNavigate,
}: OverviewViewProps) {
  const activeModelsCount = MODEL_CATALOG.filter((m) => m.available).length;
  const recentEntries = history.slice(0, 5);
  const paddingClass = settings.compactMode ? 'p-4 sm:p-5' : 'p-6 sm:p-7';

  return (
    <div className="space-y-6">
      <section className={`rounded-lg border border-slate-200 bg-white ${paddingClass}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl text-balance">
              VeriNews AI
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Detector inteligente de noticias falsas y contenido satírico en español. Evalúa el
              lenguaje, la estructura estilística y las probabilidades calibradas mediante modelos
              de aprendizaje automático ejecutados localmente en tu navegador.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('detector')}
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 whitespace-nowrap"
            >
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              <span>Analizar noticia</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('historial')}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span>Ver historial</span>
            </button>
          </div>
        </div>
      </section>

      <section
        aria-label="Resumen de actividad y modelos"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Análisis realizados</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {history.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Registros almacenados localmente en esta sesión y navegador
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Modelos de IA disponibles</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {activeModelsCount} / {MODEL_CATALOG.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Clasificadores supervisados listos para inferencia
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Modelo predeterminado</p>
          <p className="mt-2 font-display text-lg font-semibold text-slate-900 truncate">
            {MODEL_CATALOG.find((m) => m.id === settings.defaultModel)?.shortName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {settings.saveHistory ? 'Guardado en historial activo' : 'Guardado en historial pausado'}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Estado de los modelos
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('comparador')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              <span>Comparar</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <ul className="divide-y divide-slate-100">
            {MODEL_CATALOG.map((model) => (
              <li key={model.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{model.name}</p>
                    <p className="text-xs text-slate-500">{model.architectureType}</p>
                    {!model.available && model.unavailableReason && (
                      <p className="mt-1 text-xs text-slate-500">{model.unavailableReason}</p>
                    )}
                  </div>
                  {model.available ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Disponible</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>No disponible</span>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Resultados recientes
            </h3>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('historial')}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                <span>Ver todo el historial</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {recentEntries.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <ScanSearch className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-800">
                No existen análisis recientes todavía
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Analiza una noticia para ver aquí su clasificación y puntuación de confianza.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('detector')}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800"
              >
                <span>Analizar primera noticia</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentEntries.map((entry) => (
                <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{entry.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
                        {entry.modelName} · {new Date(entry.timestamp).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ClassificationIndicator classification={entry.classification} size="sm" />
                      <span className="font-mono text-xs tabular-nums font-medium text-slate-700 w-12 text-right">
                        {entry.isConclusive ? `${(entry.confidence * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
