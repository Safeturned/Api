interface AnalysisResult {
    id: string;
    createdAt: string;
    [key: string]: unknown;
}

interface StoredFile {
    fileData: ArrayBuffer;
    fileName: string;
    mimeType: string;
    fileSize: number; // Size in bytes
    storedAt: number; // UTC timestamp (milliseconds since epoch)
}

declare global {
    var __analysisResults: Map<string, AnalysisResult> | undefined;
    var __fileStorage: Map<string, StoredFile> | undefined;
    var __cleanupInterval: ReturnType<typeof setInterval> | undefined;
}

if (!global.__analysisResults) {
    global.__analysisResults = new Map<string, AnalysisResult>();
}
if (!global.__fileStorage) {
    global.__fileStorage = new Map<string, StoredFile>();
}

export const analysisResults = global.__analysisResults;
export const fileStorage = global.__fileStorage;

const FILE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_STORAGE_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10GB

function cleanupExpiredFiles() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [id, file] of fileStorage.entries()) {
        if (now - file.storedAt > FILE_TTL_MS) {
            fileStorage.delete(id);
            deletedCount++;
        }
    }

    if (deletedCount > 0) {
        console.log(`[Storage Cleanup] Deleted ${deletedCount} expired file(s) from memory`);
    }
}

function getTotalStorageSize(): number {
    let totalSize = 0;
    for (const file of fileStorage.values()) {
        totalSize += file.fileSize;
    }
    return totalSize;
}

function cleanupOldestFilesIfNeeded() {
    let totalSize = getTotalStorageSize();

    if (totalSize <= MAX_STORAGE_SIZE_BYTES) {
        return;
    }

    const sortedFiles = Array.from(fileStorage.entries()).sort(
        (a, b) => a[1].storedAt - b[1].storedAt
    );

    let deletedCount = 0;
    let freedBytes = 0;

    for (const [id, file] of sortedFiles) {
        if (totalSize <= MAX_STORAGE_SIZE_BYTES) {
            break;
        }

        fileStorage.delete(id);
        totalSize -= file.fileSize;
        freedBytes += file.fileSize;
        deletedCount++;
    }

    if (deletedCount > 0) {
        const freedMB = (freedBytes / (1024 * 1024)).toFixed(2);
        const currentGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2);
        console.log(
            `[Storage Protection] Memory limit exceeded (${MAX_STORAGE_SIZE_BYTES / (1024 * 1024 * 1024)}GB). ` +
                `Deleted ${deletedCount} oldest file(s), freed ${freedMB}MB. Current size: ${currentGB}GB`
        );
    }
}

function initializeCleanup() {
    if (typeof window === 'undefined' && !global.__cleanupInterval) {
        global.__cleanupInterval = setInterval(cleanupExpiredFiles, 60 * 60 * 1000);
        console.log('[Storage Cleanup] Started periodic cleanup (every 1 hour)');
    }
}

export function storeAnalysisResult(id: string, data: Record<string, unknown>) {
    initializeCleanup();
    analysisResults.set(id, {
        ...data,
        id,
        createdAt: new Date().toISOString(),
    });
}

export function storeFile(id: string, fileData: ArrayBuffer, fileName: string, mimeType: string) {
    initializeCleanup();
    cleanupOldestFilesIfNeeded();
    fileStorage.set(id, {
        fileData,
        fileName,
        mimeType,
        fileSize: fileData.byteLength,
        storedAt: Date.now(),
    });
}

export function getAnalysisResult(id: string) {
    let result = analysisResults.get(id);
    if (result) {
        return result;
    }

    const standardHash = id.replace(/-/g, '+').replace(/_/g, '/');
    result = analysisResults.get(standardHash);
    if (result) {
        return result;
    }

    const urlSafeHash = id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    result = analysisResults.get(urlSafeHash);
    if (result) {
        return result;
    }

    return null;
}

export function getStoredFile(id: string) {
    const file = fileStorage.get(id);
    return file;
}

export function getAllAnalysisResults() {
    return Array.from(analysisResults.values());
}
