/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { DetectorController } from './mvc/controllers/DetectorController';
import { HistoryController } from './mvc/controllers/HistoryController';
import { SettingsController } from './mvc/controllers/SettingsController';
import {
  initDriveAuth,
  type DriveUserSummary,
} from './mvc/models/googleDriveModel';
import { getAllEvaluationReports } from './mvc/models/metricsEvaluator';
import { getEngineRuntimeSummary } from './mvc/models/nlpEngine';
import {
  DEFAULT_SETTINGS,
  loadHistory,
  loadSettings,
  resetAllLocalData,
} from './mvc/models/storageModel';
import type {
  AppModuleId,
  AppSettings,
  CandidateModelId,
  ComparisonResult,
  InferenceResult,
  ModelId,
} from './mvc/models/types';
import { ComparatorView } from './mvc/views/ComparatorView';
import { DetectorView } from './mvc/views/DetectorView';
import { HistoryView } from './mvc/views/HistoryView';
import { MetricsView } from './mvc/views/MetricsView';
import { OverviewView } from './mvc/views/OverviewView';
import { SettingsView } from './mvc/views/SettingsView';
import { SidebarView } from './mvc/views/SidebarView';
import { TopHeaderView } from './mvc/views/TopHeaderView';

export default function App() {
  const initialHistoryState = useMemo(() => loadHistory(), []);
  const evaluationReports = useMemo(() => getAllEvaluationReports(), []);

  const [activeModule, setActiveModule] = useState<AppModuleId>('inicio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [history, setHistory] = useState<InferenceResult[]>(initialHistoryState.entries);
  const [recoveredHistory] = useState<boolean>(initialHistoryState.recovered);

  const [lastResult, setLastResult] = useState<InferenceResult | null>(null);
  const [lastComparison, setLastComparison] = useState<ComparisonResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [driveUser, setDriveUser] = useState<DriveUserSummary | null>(null);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user) => {
        setDriveUser(user);
        setNeedsDriveAuth(false);
      },
      () => {
        setDriveUser(null);
        setNeedsDriveAuth(true);
      }
    );
    return unsubscribe;
  }, []);

  const engineStatus = useMemo(
    () => getEngineRuntimeSummary(isProcessing),
    [isProcessing]
  );

  const handleSelectModule = (next: AppModuleId) => {
    setValidationError(null);
    setActiveModule(next);
  };

  const handleAnalyzeNews = (payload: {
    title: string;
    text: string;
    url?: string;
    modelId: ModelId;
    externalEvidenceConsulted?: boolean;
    externalEvidenceNote?: string;
  }) => {
    setIsProcessing(true);
    try {
      const out = DetectorController.analyzeNews(payload, settings, history);
      if (out.error) {
        setValidationError(out.error);
        return;
      }
      setValidationError(null);
      if (out.result) setLastResult(out.result);
      if (out.updatedHistory) setHistory(out.updatedHistory);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractUrl = async (url: string) => {
    setIsProcessing(true);
    try {
      return await DetectorController.extractFromUrl(url);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompareModels = (payload: {
    title: string;
    text: string;
    selectedModels: CandidateModelId[];
  }) => {
    setIsProcessing(true);
    try {
      const out = DetectorController.compareModels(
        { title: payload.title, text: payload.text },
        settings,
        payload.selectedModels
      );
      if (out.error) {
        setValidationError(out.error);
        return;
      }
      setValidationError(null);
      if (out.comparison) {
        setLastComparison(out.comparison);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteHistoryEntry = (id: string) => {
    setHistory((prev) => HistoryController.deleteEntry(prev, id));
  };

  const handleClearHistory = () => {
    setHistory(HistoryController.clearAll());
  };

  const handleUpdateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => SettingsController.updateSettings(prev, patch));
  };

  const handleResetSettings = () => {
    setSettings(SettingsController.resetSettings());
  };

  const handleResetAllData = () => {
    resetAllLocalData();
    setHistory([]);
    setSettings(DEFAULT_SETTINGS);
    setLastResult(null);
    setLastComparison(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <SidebarView
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        historyCount={history.length}
        engineStatus={engineStatus}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeaderView
          activeModule={activeModule}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigateToDetector={() => handleSelectModule('detector')}
        />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activeModule === 'inicio' && (
            <OverviewView
              history={history}
              settings={settings}
              onNavigate={handleSelectModule}
            />
          )}

          {activeModule === 'detector' && (
            <DetectorView
              settings={settings}
              lastResult={lastResult}
              validationError={validationError}
              isProcessing={isProcessing}
              onAnalyze={handleAnalyzeNews}
              onExtractUrl={handleExtractUrl}
              onClearError={() => setValidationError(null)}
            />
          )}

          {activeModule === 'comparador' && (
            <ComparatorView
              settings={settings}
              lastComparison={lastComparison}
              validationError={validationError}
              isProcessing={isProcessing}
              onCompare={handleCompareModels}
              onClearError={() => setValidationError(null)}
            />
          )}

          {activeModule === 'metricas' && (
            <MetricsView reports={evaluationReports} history={history} />
          )}

          {activeModule === 'historial' && (
            <HistoryView
              entries={history}
              recoveredFromCorruption={recoveredHistory}
              onDeleteEntry={handleDeleteHistoryEntry}
              onClearAll={handleClearHistory}
              onNavigateToDetector={() => handleSelectModule('detector')}
            />
          )}

          {activeModule === 'configuracion' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetSettings={handleResetSettings}
              onResetAllData={handleResetAllData}
              driveUser={driveUser}
              needsDriveAuth={needsDriveAuth}
              onDriveSignedIn={(user) => {
                setDriveUser(user);
                setNeedsDriveAuth(false);
              }}
              onDriveSignedOut={() => {
                setDriveUser(null);
                setNeedsDriveAuth(true);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
