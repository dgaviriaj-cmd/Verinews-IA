import {
  deleteDriveFile,
  findOrCreateDriveFolder,
  getCachedDriveToken,
  listDriveFolderFiles,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  uploadZipToDriveFolder,
  type DriveBackupFile,
  type DriveFolderRef,
  type DriveUserSummary,
} from '../models/googleDriveModel';
import {
  createProjectZipBundle,
  triggerZipDownload,
  type ProjectArchiveBundle,
} from '../models/projectArchiveModel';

export const DEFAULT_DRIVE_FOLDER_NAME = 'VeriNews AI';
export const DEFAULT_PROJECT_ZIP_NAME = 'verinews-ai-proyecto.zip';

export interface DriveSavePrepared {
  folder: DriveFolderRef;
  bundle: ProjectArchiveBundle;
  existingMatch: DriveBackupFile | null;
  filesInFolder: DriveBackupFile[];
}

export function validateDriveFolderName(rawName: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const trimmed = rawName.trim().replace(/[<>:"/\\|?*]+/g, '-');
  if (!trimmed) {
    return {
      valid: false,
      sanitized: '',
      error: 'Ingresa un nombre válido para la carpeta de Google Drive.',
    };
  }
  if (trimmed.length > 64) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'El nombre de la carpeta no debe superar los 64 caracteres.',
    };
  }
  return { valid: true, sanitized: trimmed };
}

export function buildTimestampedZipName(baseName = DEFAULT_PROJECT_ZIP_NAME): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return baseName.replace(/\.zip$/i, '') + `-${stamp}.zip`;
}

export const DriveExportController = {
  async signIn(): Promise<{ user: DriveUserSummary; accessToken: string }> {
    return signInWithGoogleDrive();
  },

  async signOut(): Promise<void> {
    return signOutGoogleDrive();
  },

  async downloadLocalZip(): Promise<ProjectArchiveBundle> {
    const bundle = await createProjectZipBundle(DEFAULT_PROJECT_ZIP_NAME);
    triggerZipDownload(bundle.blob, bundle.fileName);
    return bundle;
  },

  async prepareFolderAndZip(folderName: string): Promise<DriveSavePrepared> {
    const token = getCachedDriveToken();
    if (!token) {
      throw new Error('Debes iniciar sesión con Google antes de guardar en Drive.');
    }

    const validation = validateDriveFolderName(folderName);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const [folder, bundle] = await Promise.all([
      findOrCreateDriveFolder(token, validation.sanitized),
      createProjectZipBundle(DEFAULT_PROJECT_ZIP_NAME),
    ]);

    const filesInFolder = await listDriveFolderFiles(token, folder.id);
    const existingMatch =
      filesInFolder.find((file) => file.name === bundle.fileName) ?? null;

    return {
      folder,
      bundle,
      existingMatch,
      filesInFolder,
    };
  },

  async listFolderBackups(folderId: string): Promise<DriveBackupFile[]> {
    const token = getCachedDriveToken();
    if (!token) {
      throw new Error('Debes iniciar sesión con Google para consultar la carpeta.');
    }
    return listDriveFolderFiles(token, folderId);
  },

  async commitZipUpload(params: {
    folderId: string;
    bundle: ProjectArchiveBundle;
    fileName?: string;
    overwriteFileId?: string;
  }): Promise<{ uploaded: DriveBackupFile; filesInFolder: DriveBackupFile[] }> {
    const token = getCachedDriveToken();
    if (!token) {
      throw new Error('La sesión de Google Drive no está activa.');
    }

    const uploaded = await uploadZipToDriveFolder(token, {
      folderId: params.folderId,
      fileName: params.fileName ?? params.bundle.fileName,
      blob: params.bundle.blob,
      overwriteFileId: params.overwriteFileId,
    });

    const filesInFolder = await listDriveFolderFiles(token, params.folderId);
    return { uploaded, filesInFolder };
  },

  async removeBackupFile(
    folderId: string,
    fileId: string
  ): Promise<DriveBackupFile[]> {
    const token = getCachedDriveToken();
    if (!token) {
      throw new Error('La sesión de Google Drive no está activa.');
    }
    await deleteDriveFile(token, fileId);
    return listDriveFolderFiles(token, folderId);
  },
};
