import { useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  Search,
  Trash2,
} from 'lucide-react';
import {
  HistoryController,
  type HistoryClassFilter,
  type HistoryModelFilter,
} from '../controllers/HistoryController';
import { MODEL_CATALOG } from '../models/nlpEngine';
import type { InferenceResult } from '../models/types';
import { ClassificationIndicator } from './ClassificationBadge';

interface HistoryViewProps {
  entries: InferenceResult[];
  recoveredFromCorruption: boolean;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
  onNavigateToDetector: () => void;
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function HistoryView({
  entries,
  recoveredFromCorruption,
  onDeleteEntry,
  onClearAll,
  onNavigateToDetector,
}: HistoryViewProps) {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<HistoryClassFilter>('ALL');
  const [modelFilter, setModelFilter] = useState<HistoryModelFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const filtered = HistoryController.filterEntries(
    entries,
    query,
    classFilter,
    modelFilter
  );
  const selectedEntry =
    filtered.find((e) => e.id === selectedId) || filtered[0] || null;

  const handleExportJson = () => {
    const file = HistoryController.buildJsonExport(filtered);
    triggerDownload(file.filename, file.content, file.mimeType);
  };

  const handleExportCsv = () => {
    const file = HistoryController.buildCsvExport(filtered);
    triggerDownload(file.filename, file.content, file.mimeType);
  };

  return (
    <div className="space-y-6">
      {recoveredFromCorruption && (
        <div
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
        >
          Se detectaron datos locales dañados y se restableció un historial limpio automáticamente.
        </div>
      )}

      {/* Búsqueda, filtros y exportación */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Buscar en historial"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por titular, texto o modelo..."
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <label htmlFor="history-class-filter" className="sr-only">
                Filtrar por clasificación
              </label>
              <select
                id="history-class-filter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value as HistoryClassFilter)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">Todas las clasificaciones</option>
                <option value="Probablemente auténtica">Probablemente auténtica</option>
                <option value="Probablemente falsa">Probablemente falsa</option>
                <option value="Posible sátira">Posible sátira</option>
                <option value="No concluyente">No concluyente</option>
              </select>

              <label htmlFor="history-model-filter" className="sr-only">
                Filtrar por modelo
              </label>
              <select
                id="history-model-filter"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value as HistoryModelFilter)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">Todos los modelos</option>
                {MODEL_CATALOG.filter((m) => m.available).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.shortName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap"
            >
              <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Exportar JSON</span>
            </button>
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>
            {entries.length > 0 && !confirmClearOpen && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Limpiar historial</span>
              </button>
            )}
          </div>
        </div>

        {confirmClearOpen && (
          <div
            role="alertdialog"
            aria-label="Confirmar limpieza de historial"
            className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2.5 text-xs text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <span>
                ¿Confirmas eliminar los <strong>{entries.length}</strong> análisis guardados en el
                almacenamiento local del navegador? Esta acción no se puede deshacer.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmClearOpen(false);
                }}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
              >
                Confirmar limpieza
              </button>
            </div>
          </div>
        )}
      </section>

      {entries.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <Download className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
            No hay análisis en el historial local
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Analiza una noticia en el detector para guardar sus resultados localmente y exportarlos
            en formato CSV o JSON cuando lo necesites.
          </p>
          <button
            type="button"
            onClick={onNavigateToDetector}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            <span>Analizar noticia</span>
          </button>
        </section>
      ) : filtered.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-800">
            No se encontraron análisis que coincidan con los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setClassFilter('ALL');
              setModelFilter('ALL');
            }}
            className="mt-3 text-xs font-medium text-blue-700 hover:text-blue-800"
          >
            Restablecer filtros
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-7 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 pl-4 pr-3">Noticia y fecha</th>
                    <th className="py-3 px-3">Clasificación</th>
                    <th className="py-3 px-3 text-right">Confianza</th>
                    <th className="py-3 pl-3 pr-4 text-right">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((entry) => {
                    const isSelected = selectedEntry?.id === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}
                      >
                        <td className="py-3 pl-4 pr-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(entry.id)}
                            className="text-left"
                          >
                            <p className="font-medium text-slate-900 line-clamp-1">{entry.title}</p>
                            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
                              {new Date(entry.timestamp).toLocaleString('es-ES')} · {entry.modelName}
                            </p>
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <ClassificationIndicator
                            classification={entry.classification}
                            size="sm"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs tabular-nums text-slate-700">
                          {entry.isConclusive ? `${(entry.confidence * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(entry.id)}
                            aria-label={`Eliminar análisis ${entry.title}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {selectedEntry && (
            <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <ClassificationIndicator classification={selectedEntry.classification} size="sm" />
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {selectedEntry.processingTimeMs.toFixed(2)} ms
                </span>
              </div>

              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {selectedEntry.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedEntry.modelName} · v{selectedEntry.modelVersion}
                </p>
                {selectedEntry.url && (
                  <p className="mt-1 text-xs text-blue-700 break-all">{selectedEntry.url}</p>
                )}
              </div>

              <p className="text-xs leading-relaxed text-slate-700 bg-slate-50 rounded border border-slate-200 p-3 max-h-48 overflow-y-auto">
                {selectedEntry.fullText}
              </p>

              <p className="text-xs leading-relaxed text-slate-600">{selectedEntry.explanation}</p>

              <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 font-mono text-xs tabular-nums text-slate-700">
                <span>Auténtica: {(selectedEntry.probabilities.real * 100).toFixed(1)}%</span>
                <span>Falsa: {(selectedEntry.probabilities.falsa * 100).toFixed(1)}%</span>
                <span>Sátira: {(selectedEntry.probabilities.satirica * 100).toFixed(1)}%</span>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
