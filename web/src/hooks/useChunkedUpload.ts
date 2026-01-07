import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';

export interface ChunkedUploadState {
    isUploading: boolean;
    progress: number;
    currentChunk: number;
    totalChunks: number;
    sessionId: string | null;
    error: string | null;
    speed: number;
    eta: number;
    status: string;
    isPreparing: boolean;
}

export interface ChunkedUploadOptions {
    chunkSize?: number;
    maxRetries?: number;
    onProgress?: (state: ChunkedUploadState) => void;
    onComplete?: (result: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    getAccessToken?: () => string | null;
}

const DEFAULT_CHUNK_SIZE = 50 * 1024 * 1024;
const DEFAULT_MAX_RETRIES = 3;

export const UPLOAD_STATUS_KEYS = {
    PREPARING: 'upload.status.preparing',
    UPLOADING: 'upload.status.uploading',
    PROCESSING: 'upload.status.processing',
    POLLING: 'upload.status.polling',
    COMPLETED: 'upload.status.completed',
    CANCELLED: 'upload.status.cancelled',
    ERROR: 'upload.status.error',
} as const;

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90;

interface PendingResponse {
    pending: true;
    jobId: string;
    message?: string;
}

interface JobStatusResponse {
    jobId: string;
    status: string;
    result?: Record<string, unknown>;
    error?: string;
    completed: boolean;
}

export function useChunkedUpload(options: ChunkedUploadOptions = {}) {
    const {
        chunkSize = DEFAULT_CHUNK_SIZE,
        maxRetries = DEFAULT_MAX_RETRIES,
        onProgress,
        onComplete,
        onError,
    } = options;

    const [state, setState] = useState<ChunkedUploadState>({
        isUploading: false,
        progress: 0,
        currentChunk: 0,
        totalChunks: 0,
        sessionId: null,
        error: null,
        speed: 0,
        eta: 0,
        status: '',
        isPreparing: false,
    });

    const startTimeRef = useRef<number>(0);
    const uploadedBytesRef = useRef<number>(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isUploadingRef = useRef<boolean>(false);

    const computeFileHash = useCallback(async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const bytes = Array.from(new Uint8Array(hashBuffer));
        const base64 = btoa(String.fromCharCode(...bytes));
        return base64;
    }, []);

    const computeChunkHash = useCallback(async (chunk: Blob): Promise<string> => {
        const arrayBuffer = await chunk.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const bytes = Array.from(new Uint8Array(hashBuffer));
        const base64 = btoa(String.fromCharCode(...bytes));
        return base64;
    }, []);

    const updateProgress = useCallback(
        (
            uploadedBytes: number,
            totalBytes: number,
            currentChunk: number,
            totalChunks: number,
            status: string = UPLOAD_STATUS_KEYS.UPLOADING
        ) => {
            const progress = (uploadedBytes / totalBytes) * 100;
            const elapsed = Date.now() - startTimeRef.current;
            const speed = elapsed > 0 ? (uploadedBytes / elapsed) * 1000 : 0;
            const remainingBytes = totalBytes - uploadedBytes;
            const eta = speed > 0 ? remainingBytes / speed : 0;

            setState(prevState => {
                const newState: ChunkedUploadState = {
                    isUploading: true,
                    progress,
                    currentChunk,
                    totalChunks,
                    sessionId: prevState.sessionId,
                    error: null,
                    speed,
                    eta,
                    status,
                    isPreparing: false,
                };

                onProgress?.(newState);
                return newState;
            });
        },
        [onProgress]
    );

    const uploadChunk = useCallback(
        async (
            sessionId: string,
            chunkIndex: number,
            chunk: Blob,
            chunkHash: string,
            retryCount = 0
        ): Promise<boolean> => {
            try {
                const formData = new FormData();
                formData.append('sessionId', sessionId);
                formData.append('chunkIndex', chunkIndex.toString());
                formData.append('chunk', chunk);
                formData.append('chunkHash', chunkHash);

                await api.post('/api/upload-chunked/chunk', formData, {
                    signal: abortControllerRef.current?.signal,
                });

                return true;
            } catch (error) {
                if (retryCount < maxRetries) {
                    console.warn(
                        `Chunk ${chunkIndex} upload failed, retrying (${retryCount + 1}/${maxRetries})`,
                        error
                    );
                    await new Promise(resolve =>
                        setTimeout(resolve, Math.pow(2, retryCount) * 1000)
                    );
                    return uploadChunk(sessionId, chunkIndex, chunk, chunkHash, retryCount + 1);
                }

                throw error;
            }
        },
        [maxRetries]
    );

    const pollJobStatus = useCallback(
        async (jobId: string): Promise<Record<string, unknown>> => {
            setState(prev => ({ ...prev, status: UPLOAD_STATUS_KEYS.POLLING }));

            for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
                if (abortControllerRef.current?.signal.aborted) {
                    throw new Error(UPLOAD_STATUS_KEYS.CANCELLED);
                }

                const response = await api.get<JobStatusResponse>(
                    `/api/files/jobs/${jobId}`,
                    { signal: abortControllerRef.current?.signal }
                );

                if (response.completed) {
                    if (response.error) {
                        throw new Error(response.error);
                    }
                    return response.result ?? {};
                }

                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            }

            throw new Error('Analysis timed out. Please try again later.');
        },
        []
    );

    const initiateSession = useCallback(
        async (
            fileName: string,
            fileSizeBytes: number,
            fileHash: string,
            totalChunks: number,
            retryCount = 0
        ): Promise<string> => {
            try {
                const result = await api.post<{ sessionId: string }>(
                    '/api/upload-chunked/initiate',
                    {
                        fileName,
                        fileSizeBytes,
                        fileHash,
                        totalChunks,
                    },
                    { signal: abortControllerRef.current?.signal }
                );

                return result.sessionId;
            } catch (error) {
                if (retryCount < maxRetries) {
                    console.warn(
                        `Session initiation failed, retrying (${retryCount + 1}/${maxRetries})`,
                        error
                    );
                    await new Promise(resolve =>
                        setTimeout(resolve, Math.pow(2, retryCount) * 1000)
                    );
                    return initiateSession(
                        fileName,
                        fileSizeBytes,
                        fileHash,
                        totalChunks,
                        retryCount + 1
                    );
                }
                throw error;
            }
        },
        [maxRetries]
    );

    const uploadFile = useCallback(
        async (file: File) => {
            if (isUploadingRef.current) {
                throw new Error('Upload already in progress');
            }

            isUploadingRef.current = true;
            setState(prev => ({
                ...prev,
                isUploading: true,
                progress: 0,
                currentChunk: 0,
                totalChunks: 0,
                sessionId: null,
                error: null,
                speed: 0,
                eta: 0,
                status: UPLOAD_STATUS_KEYS.PREPARING,
                isPreparing: true,
            }));

            startTimeRef.current = Date.now();
            uploadedBytesRef.current = 0;
            abortControllerRef.current = new AbortController();

            try {
                setState(prev => ({ ...prev, status: UPLOAD_STATUS_KEYS.PREPARING, isPreparing: true }));

                const fileHash = await computeFileHash(file);
                const totalChunks = Math.ceil(file.size / chunkSize);

                setState(prev => ({ ...prev, status: UPLOAD_STATUS_KEYS.UPLOADING, isPreparing: false }));

                const sessionId = await initiateSession(
                    file.name,
                    file.size,
                    fileHash,
                    totalChunks
                );

                setState(prev => ({ ...prev, sessionId, totalChunks }));

                for (let i = 0; i < totalChunks; i++) {
                    if (abortControllerRef.current?.signal.aborted) {
                        throw new Error(UPLOAD_STATUS_KEYS.CANCELLED);
                    }

                    const start = i * chunkSize;
                    const end = Math.min(start + chunkSize, file.size);
                    const chunk = file.slice(start, end);
                    const chunkHash = await computeChunkHash(chunk);

                    await uploadChunk(sessionId, i, chunk, chunkHash);

                    uploadedBytesRef.current += chunk.size;
                    updateProgress(
                        uploadedBytesRef.current,
                        file.size,
                        i + 1,
                        totalChunks,
                        UPLOAD_STATUS_KEYS.UPLOADING
                    );
                }

                setState(prev => ({ ...prev, status: UPLOAD_STATUS_KEYS.PROCESSING }));

                const completeResponse = await api.post<Record<string, unknown> | PendingResponse>(
                    '/api/upload-chunked/complete',
                    { sessionId },
                    { signal: abortControllerRef.current.signal }
                );

                let result: Record<string, unknown>;

                const pendingResponse = completeResponse as PendingResponse;
                if (pendingResponse.pending && pendingResponse.jobId) {
                    result = await pollJobStatus(pendingResponse.jobId);
                } else {
                    result = completeResponse as Record<string, unknown>;
                }

                isUploadingRef.current = false;
                setState(prev => ({
                    ...prev,
                    isUploading: false,
                    progress: 100,
                    error: null,
                    status: UPLOAD_STATUS_KEYS.COMPLETED,
                }));

                onComplete?.(result);
                return result;
            } catch (error) {
                let errorMessage: string;

                if (error instanceof Error) {
                    if (
                        error.message.includes('Failed to fetch') ||
                        error.message.includes('NetworkError')
                    ) {
                        errorMessage =
                            'Network error: Unable to connect to the server. Please check your internet connection.';
                    } else if (
                        error.name === 'AbortError' ||
                        error.message === UPLOAD_STATUS_KEYS.CANCELLED
                    ) {
                        errorMessage = UPLOAD_STATUS_KEYS.CANCELLED;
                    } else {
                        errorMessage = error.message;
                    }
                } else {
                    errorMessage = 'An unexpected error occurred during upload. Please try again.';
                }

                isUploadingRef.current = false;
                setState(prev => ({
                    ...prev,
                    isUploading: false,
                    error: errorMessage,
                    status: UPLOAD_STATUS_KEYS.ERROR,
                }));

                onError?.(errorMessage);
                throw error;
            }
        },
        [
            chunkSize,
            computeFileHash,
            computeChunkHash,
            uploadChunk,
            updateProgress,
            onComplete,
            onError,
            initiateSession,
            pollJobStatus,
        ]
    );

    const cancelUpload = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        isUploadingRef.current = false;
        setState(prev => ({
            ...prev,
            isUploading: false,
            error: UPLOAD_STATUS_KEYS.CANCELLED,
            status: UPLOAD_STATUS_KEYS.CANCELLED,
        }));
    }, []);

    const reset = useCallback(() => {
        isUploadingRef.current = false;
        setState({
            isUploading: false,
            progress: 0,
            currentChunk: 0,
            totalChunks: 0,
            sessionId: null,
            error: null,
            speed: 0,
            eta: 0,
            status: '',
            isPreparing: false,
        });
    }, []);

    return {
        ...state,
        uploadFile,
        cancelUpload,
        reset,
    };
}
