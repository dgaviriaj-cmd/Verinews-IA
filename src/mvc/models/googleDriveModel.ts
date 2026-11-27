import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
] as const;

export interface DriveUserSummary {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export interface DriveFolderRef {
  id: string;
  name: string;
  webViewLink?: string;
  created: boolean;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of GOOGLE_DRIVE_SCOPES) {
  provider.addScope(scope);
}

// Strict in-memory caching only (never persisted to localStorage/sessionStorage).
let isSigningIn = false;
let cachedAccessToken: string | null = null;

function toUserSummary(user: User): DriveUserSummary {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
  };
}

export function initDriveAuth(
  onAuthSuccess?: (user: DriveUserSummary, token: string) => void,
  onAuthCleared?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(toUserSummary(user), cachedAccessToken);
      return;
    }
    if (!isSigningIn) {
      cachedAccessToken = null;
      onAuthCleared?.();
    }
  });
}

export async function signInWithGoogleDrive(): Promise<{
  user: DriveUserSummary;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'No se recibió un token de acceso válido para Google Drive. Inténtalo de nuevo.'
      );
    }
    cachedAccessToken = credential.accessToken;
    return {
      user: toUserSummary(result.user),
      accessToken: cachedAccessToken,
    };
  } finally {
    isSigningIn = false;
  }
}

export function getCachedDriveToken(): string | null {
  return cachedAccessToken;
}

export async function signOutGoogleDrive(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function parseDriveError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as {
      error?: { message?: string; code?: number };
    };
    if (res.status === 401) {
      cachedAccessToken = null;
      return 'La sesión de Google Drive expiró. Inicia sesión nuevamente.';
    }
    return data.error?.message || `Error HTTP ${res.status} en Google Drive.`;
  } catch {
    if (res.status === 401) {
      cachedAccessToken = null;
      return 'La sesión de Google Drive expiró. Inicia sesión nuevamente.';
    }
    return `Error HTTP ${res.status} al comunicarse con Google Drive.`;
  }
}

export async function findOrCreateDriveFolder(
  accessToken: string,
  folderName: string
): Promise<DriveFolderRef> {
  const cleanName = folderName.trim();
  const query = [
    `mimeType = 'application/vnd.google-apps.folder'`,
    `name = '${escapeDriveQueryValue(cleanName)}'`,
    `trashed = false`,
  ].join(' and ');

  const searchUrl = new URL('https://www.googleapis.com/drive/v3/files');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('fields', 'files(id, name, webViewLink)');
  searchUrl.searchParams.set('pageSize', '5');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    throw new Error(await parseDriveError(searchRes));
  }

  const searchData = (await searchRes.json()) as {
    files?: Array<{ id: string; name: string; webViewLink?: string }>;
  };

  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    return {
      id: existing.id,
      name: existing.name,
      webViewLink: existing.webViewLink,
      created: false,
    };
  }

  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: cleanName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  );

  if (!createRes.ok) {
    throw new Error(await parseDriveError(createRes));
  }

  const created = (await createRes.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };

  return {
    id: created.id,
    name: created.name,
    webViewLink: created.webViewLink,
    created: true,
  };
}

export async function listDriveFolderFiles(
  accessToken: string,
  folderId: string
): Promise<DriveBackupFile[]> {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set(
    'q',
    `'${escapeDriveQueryValue(folderId)}' in parents and trashed = false`
  );
  url.searchParams.set(
    'fields',
    'files(id, name, size, modifiedTime, webViewLink)'
  );
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('pageSize', '20');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(await parseDriveError(res));
  }

  const data = (await res.json()) as { files?: DriveBackupFile[] };
  return data.files ?? [];
}

export async function uploadZipToDriveFolder(
  accessToken: string,
  params: {
    folderId: string;
    fileName: string;
    blob: Blob;
    overwriteFileId?: string;
  }
): Promise<DriveBackupFile> {
  const metadata = params.overwriteFileId
    ? {
        name: params.fileName,
        mimeType: 'application/zip',
      }
    : {
        name: params.fileName,
        mimeType: 'application/zip',
        parents: [params.folderId],
      };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', params.blob, params.fileName);

  const endpoint = params.overwriteFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
        params.overwriteFileId
      )}?uploadType=multipart&fields=id,name,size,modifiedTime,webViewLink`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,modifiedTime,webViewLink';

  const res = await fetch(endpoint, {
    method: params.overwriteFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(await parseDriveError(res));
  }

  return (await res.json()) as DriveBackupFile;
}

export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(await parseDriveError(res));
  }
}
