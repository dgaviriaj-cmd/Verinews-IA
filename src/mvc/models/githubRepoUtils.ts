import fs from 'node:fs';
import path from 'node:path';

export interface WorkspaceSourceFile {
  path: string;
  content: string;
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.aistudio',
  '.playwright-cli',
]);

const EXCLUDED_FILES = new Set([
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  '.DS_Store',
]);

export function sanitizeGithubRepoName(rawName: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const collapsed = rawName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/\.git$/i, '');

  if (!collapsed || collapsed === '.' || collapsed === '..') {
    return {
      valid: false,
      sanitized: '',
      error: 'Ingresa un nombre válido para el repositorio en GitHub.',
    };
  }
  if (collapsed.length > 100) {
    return {
      valid: false,
      sanitized: collapsed.slice(0, 100),
      error: 'El nombre del repositorio no debe superar los 100 caracteres.',
    };
  }
  return { valid: true, sanitized: collapsed };
}

export function validateGithubBranchName(rawBranch: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const clean = rawBranch.trim().replace(/^\/+|\/+$/g, '');
  if (!clean) {
    return {
      valid: false,
      sanitized: '',
      error: 'Ingresa el nombre de la rama (por ejemplo, main).',
    };
  }
  if (!/^[a-zA-Z0-9._/-]+$/.test(clean) || clean.includes('..')) {
    return {
      valid: false,
      sanitized: clean,
      error: 'El nombre de la rama contiene caracteres no permitidos.',
    };
  }
  return { valid: true, sanitized: clean };
}

export function shouldIncludeWorkspaceFile(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return false;
  if (normalized.startsWith('public/assets/aistudio/')) return false;

  const segments = normalized.split('/');
  for (let i = 0; i < segments.length - 1; i++) {
    if (EXCLUDED_DIRS.has(segments[i])) {
      return false;
    }
  }

  const baseName = segments[segments.length - 1];
  if (EXCLUDED_FILES.has(baseName)) return false;
  if (baseName.endsWith('.log')) return false;
  if (baseName.startsWith('.env') && baseName !== '.env.example') {
    return false;
  }

  return true;
}

export function collectWorkspaceFilesSync(
  rootDir: string
): WorkspaceSourceFile[] {
  const resolvedRoot = path.resolve(rootDir);
  const collected: WorkspaceSourceFile[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.resolve(currentDir, entry.name);
      if (!fullPath.startsWith(resolvedRoot + path.sep)) {
        continue;
      }

      const relPath = path.relative(resolvedRoot, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }

      if (!entry.isFile() || entry.isSymbolicLink()) {
        continue;
      }

      if (!shouldIncludeWorkspaceFile(relPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      collected.push({ path: relPath, content });
    }
  }

  walk(resolvedRoot);
  return collected.sort((a, b) => a.path.localeCompare(b.path));
}
