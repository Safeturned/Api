import React from 'react';
import { ChunkedUploadState } from '../hooks/useChunkedUpload';

interface UploadProgressProps {
    state: ChunkedUploadState;
    onCancel?: () => void;
}

export function UploadProgress({ state, onCancel }: UploadProgressProps) {
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        if (bytes < 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.max(
            0,
            Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
        );
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond: number): string => {
        return formatBytes(bytesPerSecond) + '/s';
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
    };

    if (!state.isUploading && state.progress === 0) {
        return null;
    }

    return (
        <div className='bg-slate-800/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6 space-y-4'>
            <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-white'>
                    {state.isUploading ? 'Uploading File...' : 'Upload Complete'}
                </h3>
                {state.isUploading && onCancel && (
                    <button
                        onClick={onCancel}
                        className='px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors'
                    >
                        Cancel
                    </button>
                )}
            </div>

            <div className='space-y-2'>
                <div className='flex justify-between text-sm text-gray-300'>
                    <span>Progress</span>
                    <span>{Math.round(state.progress)}%</span>
                </div>
                <div className='w-full bg-gray-700 rounded-full h-2'>
                    <div
                        className='bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out'
                        style={{ width: `${state.progress}%` }}
                    />
                </div>
            </div>

            {state.totalChunks > 0 && (
                <div className='space-y-2'>
                    <div className='flex justify-between text-sm text-gray-300'>
                        <span>Chunks</span>
                        <span>
                            {state.currentChunk} / {state.totalChunks}
                        </span>
                    </div>
                    <div className='w-full bg-gray-700 rounded-full h-1'>
                        <div
                            className='bg-gradient-to-r from-green-400 to-green-500 h-1 rounded-full transition-all duration-300'
                            style={{
                                width: `${state.totalChunks > 0 ? (state.currentChunk / state.totalChunks) * 100 : 0}%`,
                            }}
                        />
                    </div>
                </div>
            )}

            <div className='grid grid-cols-2 gap-4 text-sm'>
                <div className='space-y-1'>
                    <div className='text-gray-400'>Speed</div>
                    <div className='text-white font-mono'>
                        {state.speed > 0 ? formatSpeed(state.speed) : 'Calculating...'}
                    </div>
                </div>
                <div className='space-y-1'>
                    <div className='text-gray-400'>ETA</div>
                    <div className='text-white font-mono'>
                        {state.eta > 0 ? formatTime(state.eta) : 'Calculating...'}
                    </div>
                </div>
            </div>

            {state.sessionId && (
                <div className='text-xs text-gray-500'>
                    Session: {state.sessionId.substring(0, 8)}...
                </div>
            )}

            {state.error && (
                <div className='bg-red-900/50 border border-red-500/50 rounded p-3'>
                    <div className='text-red-400 text-sm'>
                        <strong>Error:</strong> {state.error}
                    </div>
                </div>
            )}

            {!state.isUploading && state.progress === 100 && !state.error && (
                <div className='bg-green-900/50 border border-green-500/50 rounded p-3'>
                    <div className='text-green-400 text-sm'>
                        <strong>Success!</strong> File uploaded and processed successfully.
                    </div>
                </div>
            )}
        </div>
    );
}
