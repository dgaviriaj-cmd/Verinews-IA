import {
  exportHistoryToCsv,
  exportHistoryToJson,
  saveHistory,
} from '../models/storageModel';
import type { ClassificationResultLabel, InferenceResult, ModelId } from '../models/types';

export type HistoryClassFilter = 'ALL' | ClassificationResultLabel;
export type HistoryModelFilter = 'ALL' | ModelId;

export const HistoryController = {
  filterEntries(
    entries: InferenceResult[],
    query: string,
    classFilter: HistoryClassFilter,
    modelFilter: HistoryModelFilter = 'ALL'
  ): InferenceResult[] {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (classFilter !== 'ALL' && entry.classification !== classFilter) {
        return false;
      }
      if (modelFilter !== 'ALL' && entry.modelId !== modelFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.fullText.toLowerCase().includes(q) ||
        entry.modelName.toLowerCase().includes(q) ||
        entry.classification.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q)
      );
    });
  },

  deleteEntry(entries: InferenceResult[], id: string): InferenceResult[] {
    const updated = entries.filter((e) => e.id !== id);
    saveHistory(updated);
    return updated;
  },

  clearAll(): InferenceResult[] {
    saveHistory([]);
    return [];
  },

  buildJsonExport(entries: InferenceResult[]): { filename: string; content: string; mimeType: string } {
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      filename: `verinews-historial-${stamp}.json`,
      content: exportHistoryToJson(entries),
      mimeType: 'application/json;charset=utf-8',
    };
  },

  buildCsvExport(entries: InferenceResult[]): { filename: string; content: string; mimeType: string } {
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      filename: `verinews-historial-${stamp}.csv`,
      content: exportHistoryToCsv(entries),
      mimeType: 'text/csv;charset=utf-8',
    };
  },
};
