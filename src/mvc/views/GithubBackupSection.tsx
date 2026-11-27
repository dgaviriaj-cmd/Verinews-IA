import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  LogOut,
  UploadCloud,
} from 'lucide-react';
import {
  GithubExportController,
  sanitizeRepoPreviewSlug,
  setGithubSessionToken,
  type GithubConfigStatus,
  type GithubPushNeedsConfirmation,
  type GithubPushResult,
  type GithubUserSummary,
} from '../controllers/GithubExportController';

export function GithubBackupSection() {
  const [configStatus, setConfigStatus] = useState<GithubConfigStatus | null>(null);
  const [githubUser, setGithubUser] = useState<GithubUserSummary | null>(null);
  const [repoName, setRepoName] = useState('Verinews AI');
  const [branch, setBranch] = useState('main');
  const [isPrivate, setIsPrivate] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Subir proyecto VeriNews AI');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<GithubPushResult | null>(null);
  const [pendingConfirm, setPendingConfirm] =
    useState<GithubPushNeedsConfirmation | null>(null);

  useEffect(() => {
    let mounted = true;
    GithubExportController.fetchStatus()
      .then((status) => {
        if (mounted) setConfigStatus(status);
      })
      .catch(() => {
        if (mounted) {
          setConfigStatus({
            configured: false,
            callbackUrl: `${window.location.origin}/auth/callback`,
          });
        }
      });

    GithubExportController.verifySession()
      .then((user) => {
        if (mounted && user) setGithubUser(user);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        origin !== window.location.origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost')
      ) {
        return;
      }

      const payload = event.data as
        | {
            type?: string;
            sessionToken?: string;
            user?: GithubUserSummary;
            error?: string;
          }
        | undefined;

      if (payload?.type === 'GITHUB_OAUTH_SUCCESS' && payload.sessionToken && payload.user) {
        setGithubSessionToken(payload.sessionToken);
        setGithubUser(payload.user);
        setErrorMsg(null);
        setIsConnecting(false);
      } else if (payload?.type === 'GITHUB_OAUTH_ERROR') {
        setErrorMsg(
          payload.error || 'No se pudo completar la conexión con GitHub.'
        );
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGithub = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    setPushResult(null);
    try {
      const authUrl = await GithubExportController.fetchAuthUrl();
      const popup = window.open(
        authUrl,
        'github_oauth_popup',
        'width=620,height=720'
      );
      if (!popup) {
        setErrorMsg(
          'El navegador bloqueó la ventana emergente de GitHub. Habilita las ventanas emergentes para continuar.'
        );
        setIsConnecting(false);
        return;
      }

      const pollTimer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(pollTimer);
          setIsConnecting(false);
        }
      }, 600);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la conexión con GitHub.'
      );
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await GithubExportController.disconnect();
    setGithubUser(null);
    setPendingConfirm(null);
    setPushResult(null);
    setErrorMsg(null);
  };

  const executePush = async (confirmOverwrite: boolean) => {
    setIsPushing(true);
    setErrorMsg(null);
    setPushResult(null);
    try {
      const outcome = await GithubExportController.pushProject({
        repoName,
        branch,
        isPrivate,
        commitMessage,
        confirmOverwrite,
      });

      if ('requiresConfirmation' in outcome) {
        setPendingConfirm(outcome);
        return;
      }

      setPendingConfirm(null);
      setPushResult(outcome);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al subir el proyecto a GitHub.';
      setErrorMsg(message);
      if (message.toLowerCase().includes('sesión')) {
        setGithubUser(null);
      }
    } finally {
      setIsPushing(false);
    }
  };

  const previewSlug = sanitizeRepoPreviewSlug(repoName) || 'Verinews-AI';

  return (
    <section
      aria-labelledby="github-backup-heading"
      className="lg:col-span-12 rounded-lg border border-slate-200 bg-white p-6 space-y-5"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-slate-900">
          <GitBranch className="h-5 w-5 text-slate-800" aria-hidden="true" />
          <h2
            id="github-backup-heading"
            className="font-display text-lg font-semibold"
          >
            Publicar proyecto en GitHub
          </h2>
        </div>
        <p className="text-xs text-slate-500 max-w-2xl">
          Crea o actualiza el repositorio{' '}
          <code className="font-mono text-slate-700">{previewSlug}</code> en tu cuenta
          de GitHub con el código limpio de VeriNews AI.
        </p>
      </div>

      {configStatus && !configStatus.configured && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900">
            Configuración pendiente de GitHub OAuth en el servidor
          </p>
          <p>
            Para habilitar la conexión directa con GitHub desde esta aplicación, agrega
            las variables <code className="font-mono">GITHUB_CLIENT_ID</code> y{' '}
            <code className="font-mono">GITHUB_CLIENT_SECRET</code> en el panel de{' '}
            <strong>Secrets</strong> usando esta URL de retorno (Callback URL):
          </p>
          <p className="rounded border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-800 break-all">
            {configStatus.callbackUrl}
          </p>
        </div>
      )}

      {!githubUser ? (
        <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">
              Conecta tu cuenta de GitHub para subir el repositorio
            </p>
            <p className="text-xs text-slate-500">
              Se solicitará acceso al repositorio destino ({previewSlug}) para crear el
              commit inicial o actualizar los archivos del proyecto.
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnectGithub}
            disabled={isConnecting || (configStatus !== null && !configStatus.configured)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 shrink-0"
          >
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            <span>{isConnecting ? 'Conectando...' : 'Conectar con GitHub'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-xs">
              <CheckCircle2
                className="h-4 w-4 text-emerald-700 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-slate-900">
                  Conectado a GitHub como @{githubUser.login}
                </p>
                {githubUser.name && (
                  <p className="text-slate-600">{githubUser.name}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isPushing}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 self-start sm:self-auto"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Desconectar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <label
                htmlFor="github-repo-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Nombre del repositorio en GitHub
              </label>
              <input
                id="github-repo-name"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="Verinews AI"
                maxLength={100}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Slug destino: <span className="font-mono">{previewSlug}</span>
              </p>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="github-branch-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Rama destino
              </label>
              <input
                id="github-branch-name"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="github-visibility"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Visibilidad (si es nuevo)
              </label>
              <select
                id="github-visibility"
                value={isPrivate ? 'private' : 'public'}
                onChange={(e) => setIsPrivate(e.target.value === 'private')}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="public">Repositorio público</option>
                <option value="private">Repositorio privado</option>
              </select>
            </div>

            <div className="sm:col-span-8">
              <label
                htmlFor="github-commit-msg"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Mensaje del commit
              </label>
              <input
                id="github-commit-msg"
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                maxLength={200}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="sm:col-span-4 flex items-end">
              <button
                type="button"
                onClick={() => executePush(false)}
                disabled={isPushing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                <span>
                  {isPushing ? 'Subiendo a GitHub...' : 'Subir proyecto a GitHub'}
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

      {pendingConfirm && (
        <div
          role="alertdialog"
          aria-label="Confirmar actualización de repositorio existente en GitHub"
          className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2 text-xs text-amber-950">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <span>
              El repositorio <strong>{pendingConfirm.fullName}</strong> ya existe en
              GitHub. ¿Confirmas crear un nuevo commit en la rama{' '}
              <code className="font-mono">{pendingConfirm.branch}</code> con los archivos
              actuales de VeriNews AI?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPendingConfirm(null)}
              disabled={isPushing}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => executePush(true)}
              disabled={isPushing}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
            >
              Confirmar subida
            </button>
          </div>
        </div>
      )}

      {pushResult && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2
              className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700"
              aria-hidden="true"
            />
            <span>
              {pushResult.created
                ? 'Repositorio creado y proyecto subido'
                : 'Proyecto actualizado en GitHub'}{' '}
              ({pushResult.fileCount} archivos en rama{' '}
              <code className="font-mono">{pushResult.branch}</code>).
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={pushResult.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-800 underline hover:text-emerald-950"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ver repositorio</span>
            </a>
            <a
              href={pushResult.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-800 underline hover:text-emerald-950"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ver commit</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
