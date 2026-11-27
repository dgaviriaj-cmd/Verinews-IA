import {
  AlertCircle,
  BarChart3,
  Columns2,
  Cpu,
  History,
  LayoutDashboard,
  Loader2,
  ScanSearch,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AppModuleId, EngineRuntimeStatus } from '../models/types';

export interface NavItemConfig {
  id: AppModuleId;
  label: string;
  icon: typeof LayoutDashboard;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
  { id: 'detector', label: 'Detector de noticias', icon: ScanSearch },
  { id: 'comparador', label: 'Comparador de modelos', icon: Columns2 },
  { id: 'metricas', label: 'Métricas de IA', icon: BarChart3 },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

interface SidebarViewProps {
  activeModule: AppModuleId;
  onSelectModule: (id: AppModuleId) => void;
  historyCount: number;
  engineStatus: {
    status: EngineRuntimeStatus;
    label: string;
    activeModels: number;
    totalCandidates: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarView({
  activeModule,
  onSelectModule,
  historyCount,
  engineStatus,
  mobileOpen,
  onCloseMobile,
}: SidebarViewProps) {
  const renderStatusIcon = () => {
    if (engineStatus.status === 'processing') {
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-400" aria-hidden="true" />;
    }
    if (engineStatus.status === 'unavailable') {
      return <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />;
    }
    return <Cpu className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />;
  };

  const navContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-700 text-white">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-white whitespace-nowrap">
            VeriNews AI
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Cerrar menú lateral"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectModule(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'historial' && (
                <span className="font-mono text-xs tabular-nums text-slate-300">
                  {historyCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div
        role="status"
        aria-live="polite"
        className="border-t border-slate-800 px-5 py-4 text-xs text-slate-300 space-y-1.5"
      >
        <div className="flex items-center gap-2 font-medium text-slate-100">
          {renderStatusIcon()}
          <span>{engineStatus.label}</span>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-slate-400">
          {engineStatus.activeModels} de {engineStatus.totalCandidates} modelos activos
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:sticky lg:top-0 lg:block lg:h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 shrink-0">{navContent}</aside>
        </div>
      )}
    </>
  );
}
