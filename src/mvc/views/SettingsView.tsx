import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { MODEL_CATALOG } from '../models/nlpEngine';
import { APP_VERSION } from '../models/storageModel';
import type { DriveUserSummary } from '../models/googleDriveModel';
import type { AppSettings, ModelId } from '../models/types';
import { DriveBackupSection } from './DriveBackupSection';
import { GithubBackupSection } from './GithubBackupSection';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onResetAllData: () => void;
  driveUser: DriveUserSummary | null;
  needsDriveAuth: boolean;
  onDriveSignedIn: (user: DriveUserSummary) => void;
  onDriveSignedOut: () => void;
}

export function SettingsView({
  settings,
  onUpdateSettings,
  onResetSettings,
  onResetAllData,
  driveUser,
  needsDriveAuth,
  onDriveSignedIn,
  onDriveSignedOut,
}: SettingsViewProps) {
  const [confirmWipe, setConfirmWipe] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-6 space-y-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Preferencias del detector
          </h2>
          <p className="text-xs text-slate-500">
            Ajusta el modelo predeterminado, la presentación visual y el guardado local en este
            navegador.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="setting-default-model"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Modelo predeterminado
            </label>
            <select
              id="setting-default-model"
              value={settings.defaultModel}
              onChange={(e) =>
                onUpdateSettings({ defaultModel: e.target.value as ModelId })
              }
              className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {MODEL_CATALOG.map((model) => (
                <option key={model.id} value={model.id} disabled={!model.available}>
                  {model.available ? model.name : `${model.name} — No disponible`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between max-w-md mb-1.5">
              <label
                htmlFor="setting-threshold"
                className="text-xs font-medium text-slate-700"
              >
                Umbral mínimo de confianza
              </label>
              <span className="font-mono text-xs font-semibold tabular-nums text-blue-700">
                {(settings.abstentionThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="setting-threshold"
              type="range"
              min={0.35}
              max={0.75}
              step={0.05}
              value={settings.abstentionThreshold}
              onChange={(e) =>
                onUpdateSettings({ abstentionThreshold: Number(e.target.value) })
              }
              className="w-full max-w-md accent-blue-700"
            />
            <p className="mt-1 text-xs text-slate-500">
              Si la confianza máxima es inferior a este valor, el detector responde «No concluyente».
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-800">Preferencias visuales</h3>

            <div className="flex items-start gap-3">
              <input
                id="setting-compact-mode"
                type="checkbox"
                checked={settings.compactMode}
                onChange={(e) => onUpdateSettings({ compactMode: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <label htmlFor="setting-compact-mode" className="text-sm text-slate-700">
                Usar diseño compacto en paneles de análisis
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="setting-show-probs"
                type="checkbox"
                checked={settings.showDetailedProbabilities}
                onChange={(e) =>
                  onUpdateSettings({ showDetailedProbabilities: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <label htmlFor="setting-show-probs" className="text-sm text-slate-700">
                Mostrar distribución de probabilidades por clase en los resultados
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-800">Historial local</h3>

            <div className="flex items-start gap-3">
              <input
                id="setting-save-history"
                type="checkbox"
                checked={settings.saveHistory}
                onChange={(e) => onUpdateSettings({ saveHistory: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <label htmlFor="setting-save-history" className="text-sm text-slate-700">
                Guardar automáticamente cada análisis en el historial del navegador
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onResetSettings}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Restablecer preferencias</span>
          </button>

          {!confirmWipe && (
            <button
              type="button"
              onClick={() => setConfirmWipe(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <span>Limpiar datos locales</span>
            </button>
          )}
        </div>

        {confirmWipe && (
          <div
            role="alertdialog"
            aria-label="Confirmar borrado de datos locales"
            className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-2 text-xs text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <span>Se eliminará el historial completo y se restablecerán las preferencias.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setConfirmWipe(false);
                }}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
              >
                Confirmar borrado
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 text-slate-900">
          <ShieldCheck className="h-4.5 w-4.5 text-blue-700" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold">Información y estado</h2>
        </div>

        <dl className="divide-y divide-slate-100 text-xs">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-slate-500">Aplicación</dt>
            <dd className="font-medium text-slate-900">VeriNews AI</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-slate-500">Versión</dt>
            <dd className="font-mono font-medium text-slate-900">v{APP_VERSION}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-slate-500">Almacenamiento</dt>
            <dd className="font-medium text-slate-900">Local en navegador (JSON/CSV)</dd>
          </div>
        </dl>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-800">Estado de los modelos</h3>
          <ul className="space-y-2.5 text-xs">
            {MODEL_CATALOG.map((model) => (
              <li
                key={model.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{model.shortName}</span>
                  {model.available ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Disponible (v{model.version})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-500">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>No disponible</span>
                    </span>
                  )}
                </div>
                {!model.available && model.unavailableReason && (
                  <p className="text-slate-500">{model.unavailableReason}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <DriveBackupSection
        driveUser={driveUser}
        needsAuth={needsDriveAuth}
        onAuthSignedIn={onDriveSignedIn}
        onAuthSignedOut={onDriveSignedOut}
      />

      <GithubBackupSection />
    </div>
  );
}
