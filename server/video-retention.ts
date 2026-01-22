import fs from 'fs';
import path from 'path';

const VIDEO_METADATA_FILE = 'uploads/video-metadata.json';
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.wmv'];

const RETENTION_DAYS_NO_DOWNLOAD = 7;
const RETENTION_DAYS_AFTER_DOWNLOAD = 3; // 72 hours

export interface VideoMetadata {
  filePath: string;
  fileName: string;
  uploadedAt: string;
  uploadedByUserId: string;
  uploadedByAdmin: boolean;
  documentId: number;
  organisationId: number | null;
  caseId: number | null;
  downloadedByRequiredParty: boolean;
  downloadedAt: string | null;
  requiredDownloaderType: 'admin' | 'user';
}

interface VideoMetadataStore {
  videos: Record<string, VideoMetadata>;
}

function loadVideoMetadata(): VideoMetadataStore {
  try {
    if (fs.existsSync(VIDEO_METADATA_FILE)) {
      const data = fs.readFileSync(VIDEO_METADATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[VideoRetention] Error loading metadata:', error);
  }
  return { videos: {} };
}

function saveVideoMetadata(store: VideoMetadataStore): void {
  try {
    const dir = path.dirname(VIDEO_METADATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VIDEO_METADATA_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error('[VideoRetention] Error saving metadata:', error);
  }
}

export function isVideoFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

export function trackVideoUpload(
  documentId: number,
  filePath: string,
  fileName: string,
  uploadedByUserId: string,
  uploadedByAdmin: boolean,
  organisationId: number | null,
  caseId: number | null
): void {
  const store = loadVideoMetadata();
  
  store.videos[documentId.toString()] = {
    filePath,
    fileName,
    uploadedAt: new Date().toISOString(),
    uploadedByUserId,
    uploadedByAdmin,
    documentId,
    organisationId,
    caseId,
    downloadedByRequiredParty: false,
    downloadedAt: null,
    requiredDownloaderType: uploadedByAdmin ? 'user' : 'admin'
  };
  
  saveVideoMetadata(store);
  console.log(`[VideoRetention] Tracked video upload: ${fileName} (doc ${documentId}), requires ${uploadedByAdmin ? 'user' : 'admin'} download`);
}

export function recordVideoDownload(
  documentId: number,
  downloadedByAdmin: boolean
): { wasRequiredDownload: boolean; retentionStarted: boolean } {
  const store = loadVideoMetadata();
  const docKey = documentId.toString();
  
  if (!store.videos[docKey]) {
    return { wasRequiredDownload: false, retentionStarted: false };
  }
  
  const video = store.videos[docKey];
  
  if (video.downloadedByRequiredParty) {
    return { wasRequiredDownload: false, retentionStarted: false };
  }
  
  const isRequiredParty = (video.requiredDownloaderType === 'admin' && downloadedByAdmin) ||
                          (video.requiredDownloaderType === 'user' && !downloadedByAdmin);
  
  if (isRequiredParty) {
    video.downloadedByRequiredParty = true;
    video.downloadedAt = new Date().toISOString();
    saveVideoMetadata(store);
    console.log(`[VideoRetention] Video ${documentId} downloaded by required party (${video.requiredDownloaderType}). Retention countdown started: ${RETENTION_DAYS_AFTER_DOWNLOAD} days.`);
    return { wasRequiredDownload: true, retentionStarted: true };
  }
  
  return { wasRequiredDownload: false, retentionStarted: false };
}

export function getVideoRetentionInfo(documentId: number): {
  isTracked: boolean;
  daysRemaining: number | null;
  status: 'awaiting_download' | 'retention_countdown' | 'not_tracked';
  requiredDownloaderType?: 'admin' | 'user';
} {
  const store = loadVideoMetadata();
  const docKey = documentId.toString();
  
  if (!store.videos[docKey]) {
    return { isTracked: false, daysRemaining: null, status: 'not_tracked' };
  }
  
  const video = store.videos[docKey];
  const now = new Date();
  
  if (video.downloadedByRequiredParty && video.downloadedAt) {
    const downloadDate = new Date(video.downloadedAt);
    const expiryDate = new Date(downloadDate.getTime() + RETENTION_DAYS_AFTER_DOWNLOAD * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return { 
      isTracked: true, 
      daysRemaining: Math.max(0, daysRemaining), 
      status: 'retention_countdown',
      requiredDownloaderType: video.requiredDownloaderType
    };
  } else {
    const uploadDate = new Date(video.uploadedAt);
    const expiryDate = new Date(uploadDate.getTime() + RETENTION_DAYS_NO_DOWNLOAD * 24 * 60 * 60 * 1000);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return { 
      isTracked: true, 
      daysRemaining: Math.max(0, daysRemaining), 
      status: 'awaiting_download',
      requiredDownloaderType: video.requiredDownloaderType
    };
  }
}

export function removeVideoTracking(documentId: number): void {
  const store = loadVideoMetadata();
  const docKey = documentId.toString();
  
  if (store.videos[docKey]) {
    delete store.videos[docKey];
    saveVideoMetadata(store);
    console.log(`[VideoRetention] Removed tracking for document ${documentId}`);
  }
}

export async function cleanupExpiredVideos(deleteDocumentCallback: (documentId: number) => Promise<void>): Promise<{
  deleted: number;
  errors: number;
}> {
  const store = loadVideoMetadata();
  const now = new Date();
  let deleted = 0;
  let errors = 0;
  
  const toDelete: string[] = [];
  
  for (const [docKey, video] of Object.entries(store.videos)) {
    let expiryDate: Date;
    
    if (video.downloadedByRequiredParty && video.downloadedAt) {
      const downloadDate = new Date(video.downloadedAt);
      expiryDate = new Date(downloadDate.getTime() + RETENTION_DAYS_AFTER_DOWNLOAD * 24 * 60 * 60 * 1000);
    } else {
      const uploadDate = new Date(video.uploadedAt);
      expiryDate = new Date(uploadDate.getTime() + RETENTION_DAYS_NO_DOWNLOAD * 24 * 60 * 60 * 1000);
    }
    
    if (now >= expiryDate) {
      toDelete.push(docKey);
    }
  }
  
  for (const docKey of toDelete) {
    const video = store.videos[docKey];
    try {
      if (fs.existsSync(video.filePath)) {
        fs.unlinkSync(video.filePath);
        console.log(`[VideoRetention] Deleted expired video file: ${video.fileName}`);
      }
      
      await deleteDocumentCallback(video.documentId);
      
      delete store.videos[docKey];
      deleted++;
    } catch (error) {
      console.error(`[VideoRetention] Error deleting video ${docKey}:`, error);
      errors++;
    }
  }
  
  if (deleted > 0) {
    saveVideoMetadata(store);
  }
  
  return { deleted, errors };
}

export function getAllTrackedVideos(): VideoMetadata[] {
  const store = loadVideoMetadata();
  return Object.values(store.videos);
}
