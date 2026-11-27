export function getArchiveModelRawSource(): string | null {
  try {
    const matched = import.meta.glob('/src/mvc/models/projectArchiveModel.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, unknown>;
    const raw = matched['/src/mvc/models/projectArchiveModel.ts'];
    return typeof raw === 'string' ? raw : null;
  } catch {
    return null;
  }
}
