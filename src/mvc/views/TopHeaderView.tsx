import { Menu, ScanSearch } from 'lucide-react';
import type { AppModuleId } from '../models/types';

const MODULE_TITLES: Record<AppModuleId, string> = {
  inicio: 'Inicio',
  detector: 'Detector de noticias',
  comparador: 'Comparador de modelos',
  metricas: 'Métricas de IA',
  historial: 'Historial',
  configuracion: 'Configuración',
};

interface TopHeaderViewProps {
  activeModule: AppModuleId;
  onOpenMobileMenu: () => void;
  onNavigateToDetector: () => void;
}

export function TopHeaderView({
  activeModule,
  onOpenMobileMenu,
  onNavigateToDetector,
}: TopHeaderViewProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú de navegación"
          className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline font-medium text-slate-500 whitespace-nowrap">
            VeriNews AI
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-slate-900 truncate">
            {MODULE_TITLES[activeModule]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {activeModule !== 'detector' && (
          <button
            type="button"
            onClick={onNavigateToDetector}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 whitespace-nowrap shrink-0"
          >
            <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Analizar noticia</span>
          </button>
        )}
      </div>
    </header>
  );
}
