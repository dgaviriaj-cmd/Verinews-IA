import JSZip from 'jszip';
import { getArchiveModelRawSource } from './projectArchiveSelfSource';

export interface ProjectArchiveEntry {
  path: string;
  content: string;
}

export interface ProjectArchiveBundle {
  fileName: string;
  folderInZip: string;
  fileCount: number;
  sizeBytes: number;
  blob: Blob;
  bytes: Uint8Array;
}

function collectRawProjectFiles(): Record<string, string> {
  try {
    // Vite statically expands import.meta.glob at build/dev time; Node test runner hits catch safely.
    const rawModules = import.meta.glob(
      [
        '/index.html',
        '/package.json',
        '/tsconfig.json',
        '/vite.config.ts',
        '/server.ts',
        '/metadata.json',
        '/firebase-applet-config.json',
        '/.env.example',
        '/.gitignore',
        '/src/**/*.ts',
        '/src/**/*.tsx',
        '/src/**/*.css',
      ],
      { query: '?raw', import: 'default', eager: true }
    ) as Record<string, unknown>;

    const result: Record<string, string> = {};
    for (const [rawPath, value] of Object.entries(rawModules)) {
      if (typeof value === 'string') {
        const cleanPath = rawPath.replace(/^\/+/, '');
        if (cleanPath && !cleanPath.endsWith('.test.ts')) {
          result[cleanPath] = value;
        }
      }
    }

    const selfSource = getArchiveModelRawSource();
    if (selfSource) {
      result['src/mvc/models/projectArchiveModel.ts'] = selfSource;
    }

    return result;
  } catch {
    return {};
  }
}

export function normalizeArchiveEntries(
  filesMap: Record<string, string>,
  rootFolder = 'verinews-ai'
): ProjectArchiveEntry[] {
  const safeRoot = rootFolder.replace(/^\/+|\/+$/g, '') || 'verinews-ai';
  return Object.entries(filesMap)
    .filter(([path, content]) => path.trim().length > 0 && typeof content === 'string')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({
      path: `${safeRoot}/${path.replace(/^\/+/, '')}`,
      content,
    }));
}

export async function buildProjectZipFromMap(
  filesMap: Record<string, string>,
  options?: { fileName?: string; rootFolder?: string }
): Promise<ProjectArchiveBundle> {
  const fileName = options?.fileName ?? 'verinews-ai-proyecto.zip';
  const folderInZip = options?.rootFolder ?? 'verinews-ai';
  const entries = normalizeArchiveEntries(filesMap, folderInZip);

  if (entries.length === 0) {
    throw new Error('No se encontraron archivos fuente del proyecto para comprimir.');
  }

  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.path, entry.content);
  }

  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const blobBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBuffer).set(bytes);
  const blob = new Blob([blobBuffer], { type: 'application/zip' });

  return {
    fileName,
    folderInZip,
    fileCount: entries.length,
    sizeBytes: bytes.byteLength,
    blob,
    bytes,
  };
}

export async function createProjectZipBundle(
  fileName = 'verinews-ai-proyecto.zip'
): Promise<ProjectArchiveBundle> {
  const filesMap = collectRawProjectFiles();
  return buildProjectZipFromMap(filesMap, {
    fileName,
    rootFolder: 'verinews-ai',
  });
}

export function triggerZipDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
