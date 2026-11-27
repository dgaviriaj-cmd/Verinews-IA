import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderArchive,
  FolderOpen,
  LogOut,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  buildTimestampedZipName,
  DEFAULT_DRIVE_FOLDER_NAME,
  DEFAULT_PROJECT_ZIP_NAME,
  DriveExportController,
  type DriveSavePrepared,
} from '../controllers/DriveExportController';
import type {
  DriveBackupFile,
  DriveFolderRef,
  DriveUserSummary,
} from '../models/googleDriveModel';

interface DriveBackupSectionProps {
  driveUser: DriveUserSummary | null;
  needsAuth: boolean;
  onAuthSignedIn: (user: DriveUserSummary) => void;
  onAuthSignedOut: () => void;
}

function formatBytes(rawBytes?: string | number): string {
  const num = typeof rawBytes === 'string' ? Number(rawBytes) : rawBytes ?? 0;
  if (!Number.isFinite(num) || num <= 0) return '—';
  if (num < 1024) return `${num} B`;
  return `${(num / 1024).toFixed(1)} KB`;
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function DriveBackupSection({
  driveUser,
  needsAuth,
  onAuthSignedIn,
  onAuthSignedOut,
}: DriveBackupSectionProps) {
  const [folderName, setFolderName] = useState(DEFAULT_DRIVE_FOLDER_NAME);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [activeFolder, setActiveFolder] = useState<DriveFolderRef | null>(null);
  const [folderFiles, setFolderFiles] = useState<DriveBackupFile[]>([]);
  const [lastUploaded, setLastUploaded] = useState<DriveBackupFile | null>(null);

  const [pendingOverwrite, setPendingOverwrite] = useState<DriveSavePrepared | null>(
    null
  );
  const [pendingDeleteFile, setPendingDeleteFile] = useState<DriveBackupFile | null>(
    null
  );

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const { user } = await DriveExportController.signIn();
      onAuthSignedIn(user);
      setStatusMsg(
        `Sesión conectada con Google Drive como ${user.email ?? user.displayName ?? 'usuario'}.`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo completar el inicio de sesión con Google.';
      setErrorMsg(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setPendingOverwrite(null);
    setPendingDeleteFile(null);
    await DriveExportController.signOut();
    setActiveFolder(null);
    setFolderFiles([]);
    setLastUploaded(null);
    onAuthSignedOut();
  };

  const handleDownloadLocalZip = async () => {
    setIsWorking(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const bundle = await DriveExportController.downloadLocalZip();
      setStatusMsg(
        `Archivo ${bundle.fileName} descargado localmente (${bundle.fileCount} archivos, ${formatBytes(bundle.sizeBytes)}).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo generar el archivo ZIP local.'
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveToDrive = async () => {
    setIsWorking(true);
    setErrorMsg(null);
    setStatusMsg(null);
    setPendingOverwrite(null);
    try {
      const prepared = await DriveExportController.prepareFolderAndZip(folderName);
      setActiveFolder(prepared.folder);
      setFolderFiles(prepared.filesInFolder);

      if (prepared.existingMatch) {
        setPendingOverwrite(prepared);
        return;
      }

      const { uploaded, filesInFolder } = await DriveExportController.commitZipUpload({
        folderId: prepared.folder.id,
        bundle: prepared.bundle,
      });

      setLastUploaded(uploaded);
      setFolderFiles(filesInFolder);
      setStatusMsg(
        `Proyecto guardado en Google Drive dentro de la carpeta «${prepared.folder.name}» como ${uploaded.name} (${prepared.bundle.fileCount} archivos, ${formatBytes(prepared.bundle.sizeBytes)}).`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el ZIP en Google Drive.';
      setErrorMsg(msg);
      if (msg.toLowerCase().includes('sesión') && msg.toLowerCase().includes('expir')) {
        onAuthSignedOut();
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleConfirmOverwrite = async (mode: 'overwrite' | 'new_copy') => {
    if (!pendingOverwrite) return;
    setIsWorking(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const targetName =
        mode === 'overwrite'
          ? pendingOverwrite.bundle.fileName
          : buildTimestampedZipName(pendingOverwrite.bundle.fileName);

      const { uploaded, filesInFolder } = await DriveExportController.commitZipUpload({
        folderId: pendingOverwrite.folder.id,
        bundle: pendingOverwrite.bundle,
        fileName: targetName,
        overwriteFileId:
          mode === 'overwrite' ? pendingOverwrite.existingMatch?.id : undefined,
      });

      setLastUploaded(uploaded);
      setFolderFiles(filesInFolder);
      setStatusMsg(
        mode === 'overwrite'
          ? `Respaldo actualizado en «${pendingOverwrite.folder.name}» (${uploaded.name}).`
          : `Nueva copia guardada en «${pendingOverwrite.folder.name}» (${uploaded.name}).`
      );
      setPendingOverwrite(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo subir el respaldo a Drive.'
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleRefreshFolder = async () => {
    if (!activeFolder) return;
    setIsWorking(true);
    setErrorMsg(null);
    try {
      const files = await DriveExportController.listFolderBackups(activeFolder.id);
      setFolderFiles(files);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la lista de archivos en Drive.'
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleConfirmDeleteFile = async () => {
    if (!activeFolder || !pendingDeleteFile) return;
    setIsWorking(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const updated = await DriveExportController.removeBackupFile(
        activeFolder.id,
        pendingDeleteFile.id
      );
      setFolderFiles(updated);
      if (lastUploaded?.id === pendingDeleteFile.id) {
        setLastUploaded(null);
      }
      setStatusMsg(`Archivo «${pendingDeleteFile.name}» eliminado de Google Drive.`);
      setPendingDeleteFile(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el archivo de Google Drive.'
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <section
      aria-labelledby="drive-backup-heading"
      className="lg:col-span-12 rounded-lg border border-slate-200 bg-white p-6 space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-900">
            <FolderArchive className="h-5 w-5 text-blue-700" aria-hidden="true" />
            <h2
              id="drive-backup-heading"
              className="font-display text-lg font-semibold"
            >
              Respaldo del proyecto en Google Drive (.zip)
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Empaqueta el código fuente limpio de VeriNews AI dentro de una carpeta{' '}
            <code className="font-mono text-slate-700">verinews-ai/</code> en formato{' '}
            <code className="font-mono text-slate-700">{DEFAULT_PROJECT_ZIP_NAME}</code>{' '}
            y guárdalo dentro de una carpeta en tu Google Drive.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadLocalZip}
          disabled={isWorking}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Descargar ZIP local</span>
        </button>
      </div>

      {needsAuth || !driveUser ? (
        <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">
              Conecta tu cuenta de Google para guardar en Google Drive
            </p>
            <p className="text-xs text-slate-500">
              Solo se solicitará acceso para crear la carpeta de respaldo y subir el
              archivo ZIP de este proyecto.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="gsi-material-button shrink-0"
            aria-label="Sign in with Google"
          >
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isSigningIn ? 'Conectando...' : 'Sign in with Google'}
              </span>
              <span style={{ display: 'none' }}>Sign in with Google</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 text-xs">
              <CheckCircle2
                className="h-4 w-4 text-emerald-700 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-slate-900">
                  Conectado como {driveUser.displayName ?? 'Cuenta Google'}
                </p>
                {driveUser.email && (
                  <p className="text-slate-600">{driveUser.email}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 self-start sm:self-auto"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-6">
              <label
                htmlFor="drive-folder-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nombre de la carpeta en Google Drive
              </label>
              <input
                id="drive-folder-name"
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="VeriNews AI"
                maxLength={64}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-6 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveToDrive}
                disabled={isWorking}
                className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isWorking
                    ? 'Guardando en Google Drive...'
                    : 'Guardar carpeta ZIP en Google Drive'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2
              className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700"
              aria-hidden="true"
            />
            <span>{statusMsg}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {activeFolder?.webViewLink && (
              <a
                href={activeFolder.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-800 underline hover:text-emerald-950"
              >
                <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Abrir carpeta</span>
              </a>
            )}
            {lastUploaded?.webViewLink && (
              <a
                href={lastUploaded.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-800 underline hover:text-emerald-950"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Abrir ZIP</span>
              </a>
            )}
          </div>
        </div>
      )}

      {pendingOverwrite && (
        <div
          role="alertdialog"
          aria-label="Confirmar sobrescritura de respaldo en Google Drive"
          className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4"
        >
          <div className="flex items-start gap-2 text-xs text-amber-950">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="font-semibold">
                Ya existe «{pendingOverwrite.bundle.fileName}» en la carpeta «
                {pendingOverwrite.folder.name}»
              </p>
              <p>
                Confirma si deseas sobrescribir el archivo existente en Google Drive o
                guardar una nueva copia con fecha y hora.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPendingOverwrite(null)}
              disabled={isWorking}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleConfirmOverwrite('new_copy')}
              disabled={isWorking}
              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
            >
              Guardar copia nueva
            </button>
            <button
              type="button"
              onClick={() => handleConfirmOverwrite('overwrite')}
              disabled={isWorking}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
            >
              Confirmar sobrescritura
            </button>
          </div>
        </div>
      )}

      {pendingDeleteFile && (
        <div
          role="alertdialog"
          aria-label="Confirmar eliminación de archivo en Google Drive"
          className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2 text-xs text-red-900">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-700"
              aria-hidden="true"
            />
            <span>
              ¿Eliminar permanentemente «{pendingDeleteFile.name}» de tu carpeta en
              Google Drive?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPendingDeleteFile(null)}
              disabled={isWorking}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteFile}
              disabled={isWorking}
              className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
            >
              Confirmar eliminación
            </button>
          </div>
        </div>
      )}

      {activeFolder && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-slate-800">
              Archivos en carpeta «{activeFolder.name}» ({folderFiles.length})
            </h3>
            <button
              type="button"
              onClick={handleRefreshFolder}
              disabled={isWorking}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              <span>Actualizar</span>
            </button>
          </div>

          {folderFiles.length === 0 ? (
            <p className="text-xs text-slate-500">
              No hay archivos ZIP almacenados aún en esta carpeta.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {folderFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-col gap-2 px-3.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono font-medium text-slate-900">
                      {file.name}
                    </p>
                    <p className="text-slate-500">
                      {formatBytes(file.size)} · Actualizado{' '}
                      {formatTimestamp(file.modifiedTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        <span>Abrir</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingDeleteFile(file)}
                      aria-label={`Eliminar ${file.name} de Google Drive`}
                      className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 font-medium text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
