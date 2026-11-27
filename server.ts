import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import {
  collectWorkspaceFilesSync,
  sanitizeGithubRepoName,
  validateGithubBranchName,
} from './src/mvc/models/githubRepoUtils.ts';

interface GithubUserSummary {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
}

interface GithubSessionRecord {
  githubToken: string;
  user: GithubUserSummary;
  expiresAt: number;
}

interface OAuthStateRecord {
  expiresAt: number;
}

const PORT = Number(process.env.PORT) || 3000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const pendingOAuthStates = new Map<string, OAuthStateRecord>();
const githubSessions = new Map<string, GithubSessionRecord>();

function getPublicBaseUrl(): string {
  const raw = process.env.APP_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw) && !raw.includes('MY_APP_URL')) {
    return raw.replace(/\/+$/, '');
  }
  return `http://localhost:${PORT}`;
}

function getCallbackUrl(): string {
  return `${getPublicBaseUrl()}/auth/callback`;
}

function pruneExpiredMaps(): void {
  const now = Date.now();
  for (const [k, v] of pendingOAuthStates.entries()) {
    if (v.expiresAt <= now) pendingOAuthStates.delete(k);
  }
  for (const [k, v] of githubSessions.entries()) {
    if (v.expiresAt <= now) githubSessions.delete(k);
  }
}

function extractBearerSession(req: Request): GithubSessionRecord | null {
  pruneExpiredMaps();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  return githubSessions.get(token) ?? null;
}

async function githubApiFetch(
  githubToken: string,
  endpoint: string,
  init?: RequestInit
): Promise<globalThis.Response> {
  return fetch(`https://api.github.com${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'VeriNews-AI-App',
      ...(init?.headers ?? {}),
    },
  });
}

function renderCallbackHtml(payload: Record<string, unknown>): string {
  const serializedPayload = JSON.stringify(payload);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>GitHub OAuth — VeriNews AI</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; background: #f8fafc; }
      .card { max-width: 420px; margin: 40px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
    </style>
  </head>
  <body>
    <div class="card">
      <p id="msg">Completando conexión con GitHub...</p>
    </div>
    <script>
      (function() {
        var data = ${serializedPayload};
        var msgEl = document.getElementById('msg');
        if (data.type === 'GITHUB_OAUTH_ERROR') {
          msgEl.textContent = data.error || 'No se pudo completar la autenticación.';
        } else {
          msgEl.textContent = 'Conexión completada. Puedes cerrar esta ventana.';
        }
        if (window.opener) {
          window.opener.postMessage(data, '*');
          window.close();
        }
      })();
    </script>
  </body>
</html>`;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/github/status', (_req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim() ?? '';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() ?? '';
    const baseUrl = getPublicBaseUrl();
    res.json({
      configured: Boolean(clientId && clientSecret),
      callbackUrl: `${baseUrl}/auth/callback`,
    });
  });

  app.get('/api/github/auth/url', (_req: Request, res: Response) => {
    pruneExpiredMaps();
    const clientId = process.env.GITHUB_CLIENT_ID?.trim() ?? '';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() ?? '';

    if (!clientId || !clientSecret) {
      res.status(503).json({
        error:
          'Faltan GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET en la configuración del servidor (Secrets).',
      });
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    pendingOAuthStates.set(state, { expiresAt: Date.now() + STATE_TTL_MS });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getCallbackUrl(),
      scope: 'repo',
      state,
    });

    res.json({
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    });
  });

  const handleOAuthCallback = async (req: Request, res: Response) => {
    pruneExpiredMaps();
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError =
      typeof req.query.error_description === 'string'
        ? req.query.error_description
        : typeof req.query.error === 'string'
          ? req.query.error
          : '';

    if (oauthError) {
      res
        .status(400)
        .type('html')
        .send(
          renderCallbackHtml({
            type: 'GITHUB_OAUTH_ERROR',
            error: `GitHub rechazó la autorización: ${oauthError}`,
          })
        );
      return;
    }

    if (!code || !state || !pendingOAuthStates.has(state)) {
      res
        .status(400)
        .type('html')
        .send(
          renderCallbackHtml({
            type: 'GITHUB_OAUTH_ERROR',
            error: 'Estado de autorización inválido o expirado. Intenta nuevamente.',
          })
        );
      return;
    }

    pendingOAuthStates.delete(state);

    const clientId = process.env.GITHUB_CLIENT_ID?.trim() ?? '';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() ?? '';

    if (!clientId || !clientSecret) {
      res
        .status(503)
        .type('html')
        .send(
          renderCallbackHtml({
            type: 'GITHUB_OAUTH_ERROR',
            error: 'El servidor no tiene configuradas las credenciales de GitHub OAuth.',
          })
        );
      return;
    }

    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: getCallbackUrl(),
        }),
      });

      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        error_description?: string;
        error?: string;
      };

      if (!tokenRes.ok || !tokenJson.access_token) {
        res
          .status(400)
          .type('html')
          .send(
            renderCallbackHtml({
              type: 'GITHUB_OAUTH_ERROR',
              error:
                tokenJson.error_description ||
                tokenJson.error ||
                'No se pudo obtener el token de acceso de GitHub.',
            })
          );
        return;
      }

      const userRes = await githubApiFetch(tokenJson.access_token, '/user');
      if (!userRes.ok) {
        res
          .status(502)
          .type('html')
          .send(
            renderCallbackHtml({
              type: 'GITHUB_OAUTH_ERROR',
              error: 'No se pudo obtener el perfil de usuario en GitHub.',
            })
          );
        return;
      }

      const userJson = (await userRes.json()) as {
        login: string;
        name: string | null;
        avatar_url: string;
        html_url: string;
      };

      const user: GithubUserSummary = {
        login: userJson.login,
        name: userJson.name,
        avatarUrl: userJson.avatar_url,
        htmlUrl: userJson.html_url,
      };

      const sessionToken = crypto.randomBytes(32).toString('hex');
      githubSessions.set(sessionToken, {
        githubToken: tokenJson.access_token,
        user,
        expiresAt: Date.now() + SESSION_TTL_MS,
      });

      res.type('html').send(
        renderCallbackHtml({
          type: 'GITHUB_OAUTH_SUCCESS',
          sessionToken,
          user,
        })
      );
    } catch {
      res
        .status(500)
        .type('html')
        .send(
          renderCallbackHtml({
            type: 'GITHUB_OAUTH_ERROR',
            error: 'Error de red al conectar con GitHub.',
          })
        );
    }
  };

  app.get(['/auth/callback', '/auth/callback/'], handleOAuthCallback);

  app.get('/api/github/session', (req: Request, res: Response) => {
    const session = extractBearerSession(req);
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, user: session.user });
  });

  app.post('/api/github/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      githubSessions.delete(token);
    }
    res.json({ ok: true });
  });

  app.post('/api/github/push', async (req: Request, res: Response) => {
    const session = extractBearerSession(req);
    if (!session) {
      res.status(401).json({
        error: 'Sesión de GitHub no activa o expirada. Conecta tu cuenta nuevamente.',
      });
      return;
    }

    const body = (req.body ?? {}) as {
      repoName?: string;
      branch?: string;
      isPrivate?: boolean;
      commitMessage?: string;
      confirmOverwrite?: boolean;
    };

    const repoCheck = sanitizeGithubRepoName(body.repoName ?? 'Verinews AI');
    if (!repoCheck.valid) {
      res.status(400).json({ error: repoCheck.error });
      return;
    }

    const branchCheck = validateGithubBranchName(body.branch ?? 'main');
    if (!branchCheck.valid) {
      res.status(400).json({ error: branchCheck.error });
      return;
    }

    const repoName = repoCheck.sanitized;
    const branch = branchCheck.sanitized;
    const owner = session.user.login;
    const commitMessage =
      (body.commitMessage ?? '').trim().slice(0, 200) ||
      'Subir proyecto VeriNews AI';
    const isPrivate = Boolean(body.isPrivate);
    const confirmOverwrite = Boolean(body.confirmOverwrite);

    try {
      let repoCreated = false;
      let repoHtmlUrl = `https://github.com/${owner}/${repoName}`;
      let targetBranch = branch;

      const repoCheckRes = await githubApiFetch(
        session.githubToken,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`
      );

      if (repoCheckRes.status === 404) {
        const createRes = await githubApiFetch(
          session.githubToken,
          '/user/repos',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: repoName,
              private: isPrivate,
              description:
                'VeriNews AI — Detector inteligente de noticias falsas en español',
              auto_init: true,
            }),
          }
        );

        if (!createRes.ok) {
          const errData = (await createRes.json().catch(() => ({}))) as {
            message?: string;
          };
          res.status(createRes.status).json({
            error:
              errData.message ||
              'No se pudo crear el repositorio en GitHub. Verifica permisos.',
          });
          return;
        }

        const createdData = (await createRes.json()) as {
          html_url: string;
          default_branch?: string;
        };
        repoCreated = true;
        repoHtmlUrl = createdData.html_url;
        targetBranch = createdData.default_branch || branch;
      } else if (repoCheckRes.ok) {
        const existingData = (await repoCheckRes.json()) as {
          html_url: string;
          full_name: string;
          default_branch?: string;
        };
        repoHtmlUrl = existingData.html_url;
        if (!confirmOverwrite) {
          res.status(409).json({
            requiresConfirmation: true,
            repoUrl: existingData.html_url,
            fullName: existingData.full_name,
            branch: targetBranch,
          });
          return;
        }
      } else {
        res.status(repoCheckRes.status).json({
          error: 'No se pudo verificar el estado del repositorio en GitHub.',
        });
        return;
      }

      // Resolve head commit SHA (retry briefly after auto_init creation)
      let headCommitSha: string | null = null;
      let baseTreeSha: string | null = null;
      let refExists = false;

      for (let attempt = 0; attempt < (repoCreated ? 4 : 1); attempt++) {
        const refRes = await githubApiFetch(
          session.githubToken,
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repoName
          )}/git/ref/heads/${encodeURIComponent(targetBranch)}`
        );

        if (refRes.ok) {
          const refJson = (await refRes.json()) as {
            object?: { sha?: string };
          };
          headCommitSha = refJson.object?.sha ?? null;
          refExists = Boolean(headCommitSha);
          break;
        }

        if (repoCreated && attempt < 3) {
          await new Promise((r) => setTimeout(r, 450));
        }
      }

      // If target branch does not exist on an existing empty repo, bootstrap via Contents API
      if (!headCommitSha) {
        const initRes = await githubApiFetch(
          session.githubToken,
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repoName
          )}/contents/README.md`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'Inicializar repositorio VeriNews AI',
              content: Buffer.from(
                '# VeriNews AI\n\nDetector inteligente de noticias falsas en español.\n',
                'utf8'
              ).toString('base64'),
              branch: targetBranch,
            }),
          }
        );

        if (initRes.ok) {
          const initData = (await initRes.json()) as {
            commit?: { sha?: string; tree?: { sha?: string } };
          };
          headCommitSha = initData.commit?.sha ?? null;
          baseTreeSha = initData.commit?.tree?.sha ?? null;
          refExists = Boolean(headCommitSha);
        }
      }

      if (headCommitSha && !baseTreeSha) {
        const commitRes = await githubApiFetch(
          session.githubToken,
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
            repoName
          )}/git/commits/${headCommitSha}`
        );
        if (commitRes.ok) {
          const commitJson = (await commitRes.json()) as {
            tree?: { sha?: string };
          };
          baseTreeSha = commitJson.tree?.sha ?? null;
        }
      }

      if (!headCommitSha || !baseTreeSha) {
        res.status(502).json({
          error:
            'No se pudo preparar la rama destino en GitHub para subir los archivos.',
        });
        return;
      }

      const files = collectWorkspaceFilesSync(process.cwd());
      if (files.length === 0) {
        res.status(500).json({
          error: 'No se encontraron archivos fuente en el espacio de trabajo.',
        });
        return;
      }

      const treeEntries: Array<{
        path: string;
        mode: '100644';
        type: 'blob';
        sha: string;
      }> = [];

      const BATCH_SIZE = 8;
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const createdBlobs = await Promise.all(
          batch.map(async (file) => {
            const blobRes = await githubApiFetch(
              session.githubToken,
              `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
                repoName
              )}/git/blobs`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: file.content,
                  encoding: 'utf-8',
                }),
              }
            );
            if (!blobRes.ok) {
              throw new Error(`Error subiendo ${file.path} (${blobRes.status})`);
            }
            const blobJson = (await blobRes.json()) as { sha: string };
            return {
              path: file.path,
              mode: '100644' as const,
              type: 'blob' as const,
              sha: blobJson.sha,
            };
          })
        );
        treeEntries.push(...createdBlobs);
      }

      const treeRes = await githubApiFetch(
        session.githubToken,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repoName
        )}/git/trees`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: treeEntries,
          }),
        }
      );

      if (!treeRes.ok) {
        res.status(treeRes.status).json({
          error: 'No se pudo construir el árbol de archivos en GitHub.',
        });
        return;
      }

      const treeJson = (await treeRes.json()) as { sha: string };

      const newCommitRes = await githubApiFetch(
        session.githubToken,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
          repoName
        )}/git/commits`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: commitMessage,
            tree: treeJson.sha,
            parents: [headCommitSha],
          }),
        }
      );

      if (!newCommitRes.ok) {
        res.status(newCommitRes.status).json({
          error: 'No se pudo registrar el commit en GitHub.',
        });
        return;
      }

      const newCommitJson = (await newCommitRes.json()) as {
        sha: string;
        html_url?: string;
      };

      const updateRefRes = await githubApiFetch(
        session.githubToken,
        refExists
          ? `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repoName
            )}/git/refs/heads/${encodeURIComponent(targetBranch)}`
          : `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repoName
            )}/git/refs`,
        {
          method: refExists ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            refExists
              ? { sha: newCommitJson.sha, force: false }
              : { ref: `refs/heads/${targetBranch}`, sha: newCommitJson.sha }
          ),
        }
      );

      if (!updateRefRes.ok) {
        res.status(updateRefRes.status).json({
          error:
            'No se pudo actualizar la rama en GitHub. Verifica si la rama está protegida.',
        });
        return;
      }

      res.json({
        ok: true,
        created: repoCreated,
        repoUrl: repoHtmlUrl,
        commitUrl:
          newCommitJson.html_url ||
          `${repoHtmlUrl}/commit/${newCommitJson.sha}`,
        commitSha: newCommitJson.sha,
        branch: targetBranch,
        fileCount: files.length,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Error inesperado al subir el proyecto a GitHub.';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VeriNews AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
