export interface GithubUserSummary {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
}

export interface GithubConfigStatus {
  configured: boolean;
  callbackUrl: string;
}

export interface GithubPushResult {
  ok: true;
  created: boolean;
  repoUrl: string;
  commitUrl: string;
  commitSha: string;
  branch: string;
  fileCount: number;
}

export interface GithubPushNeedsConfirmation {
  requiresConfirmation: true;
  repoUrl: string;
  fullName: string;
  branch: string;
}

// Strict in-memory session handle only (never persisted to localStorage/sessionStorage).
let cachedGithubSessionToken: string | null = null;

export function setGithubSessionToken(token: string | null): void {
  cachedGithubSessionToken = token;
}

export function getGithubSessionToken(): string | null {
  return cachedGithubSessionToken;
}

export function sanitizeRepoPreviewSlug(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\.git$/i, '');
}

export const GithubExportController = {
  async fetchStatus(): Promise<GithubConfigStatus> {
    const res = await fetch('/api/github/status');
    if (!res.ok) {
      throw new Error('No se pudo consultar el estado de integración con GitHub.');
    }
    return (await res.json()) as GithubConfigStatus;
  },

  async fetchAuthUrl(): Promise<string> {
    const res = await fetch('/api/github/auth/url');
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.url) {
      throw new Error(
        data.error || 'No se pudo generar la URL de conexión con GitHub.'
      );
    }
    return data.url;
  },

  async verifySession(): Promise<GithubUserSummary | null> {
    if (!cachedGithubSessionToken) return null;
    const res = await fetch('/api/github/session', {
      headers: { Authorization: `Bearer ${cachedGithubSessionToken}` },
    });
    if (!res.ok) {
      cachedGithubSessionToken = null;
      return null;
    }
    const data = (await res.json()) as {
      authenticated?: boolean;
      user?: GithubUserSummary;
    };
    return data.authenticated && data.user ? data.user : null;
  },

  async disconnect(): Promise<void> {
    const token = cachedGithubSessionToken;
    cachedGithubSessionToken = null;
    if (!token) return;
    await fetch('/api/github/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  },

  async pushProject(params: {
    repoName: string;
    branch: string;
    isPrivate: boolean;
    commitMessage: string;
    confirmOverwrite: boolean;
  }): Promise<GithubPushResult | GithubPushNeedsConfirmation> {
    if (!cachedGithubSessionToken) {
      throw new Error('Debes conectar tu cuenta de GitHub antes de subir el proyecto.');
    }

    const res = await fetch('/api/github/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedGithubSessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = (await res.json().catch(() => ({}))) as
      | (GithubPushResult & { error?: string })
      | (GithubPushNeedsConfirmation & { error?: string })
      | { error?: string };

    if (res.status === 409 && 'requiresConfirmation' in data && data.requiresConfirmation) {
      return data;
    }

    if (!res.ok) {
      if (res.status === 401) {
        cachedGithubSessionToken = null;
      }
      throw new Error(
        ('error' in data && data.error) ||
          `Error HTTP ${res.status} al subir el proyecto a GitHub.`
      );
    }

    return data as GithubPushResult;
  },
};
