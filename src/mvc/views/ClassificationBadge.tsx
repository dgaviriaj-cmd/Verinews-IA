import { AlertTriangle, CheckCircle2, HelpCircle, Smile } from 'lucide-react';
import type { ClassificationResultLabel } from '../models/types';

interface ClassificationIndicatorProps {
  classification: ClassificationResultLabel;
  size?: 'sm' | 'md';
}

export function ClassificationIndicator({
  classification,
  size = 'md',
}: ClassificationIndicatorProps) {
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  if (classification === 'Probablemente auténtica') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 font-medium text-emerald-800 whitespace-nowrap ${padding}`}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
        <span>{classification}</span>
      </span>
    );
  }

  if (classification === 'Probablemente falsa') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 font-medium text-red-800 whitespace-nowrap ${padding}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
        <span>{classification}</span>
      </span>
    );
  }

  if (classification === 'Posible sátira') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 font-medium text-amber-800 whitespace-nowrap ${padding}`}
      >
        <Smile className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <span>{classification}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 font-medium text-slate-700 whitespace-nowrap ${padding}`}
    >
      <HelpCircle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
      <span>{classification}</span>
    </span>
  );
}
