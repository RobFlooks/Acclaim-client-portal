export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
export const MAX_FILE_SIZE_MB = 25;

export const ACCEPTED_FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt',
  '.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif',
  '.xls', '.xlsx', '.csv',
  '.zip', '.rar',
  '.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.3gp', '.3gpp'
];

export const ACCEPTED_FILE_TYPES_STRING = ACCEPTED_FILE_EXTENSIONS.join(',');

export const ACCEPTED_FILE_TYPES_DISPLAY = 'PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF, HEIC, XLS, XLSX, CSV, ZIP, RAR, MP4, MOV, AVI, WEBM, MKV, M4V, 3GP';

export interface FileValidationResult {
  isValid: boolean;
  error: string | null;
}

export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    const extension = fileName.split('.').pop() || 'unknown';
    return {
      isValid: false,
      error: `File type ".${extension}" is not allowed. Supported formats: ${ACCEPTED_FILE_TYPES_DISPLAY}`
    };
  }

  return { isValid: true, error: null };
}

export function validateFiles(files: File[]): FileValidationResult {
  for (const file of files) {
    const result = validateFile(file);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true, error: null };
}
