'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { formatFileSize } from '@/lib/utils';
import { getRandomLoadingMessage } from '@/lib/loadingMessages';
import { useTypingEffect } from '@/hooks/useTypingEffect';

interface StandardFileUploadProps {
    onFileSelect: (file: File) => void;
    onUpload: (file: File) => Promise<void>;
    isUploading?: boolean;
    uploadProgress?: number;
    useChunkedUpload?: boolean;
    maxFileSize?: number;
    acceptedFileTypes?: string[];
    className?: string;
    disabled?: boolean;
    uploadStatus?: string;
    isPreparing?: boolean;
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (Cloudflare limit)
const DEFAULT_ACCEPTED_TYPES = ['.dll'];

export default function StandardFileUpload({
    onFileSelect,
    onUpload,
    isUploading = false,
    uploadProgress = 0,
    useChunkedUpload = false,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
    className = '',
    disabled = false,
    uploadStatus,
    isPreparing = false,
}: StandardFileUploadProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(getRandomLoadingMessage());
    const { displayedText: typedMessage, isComplete } = useTypingEffect(loadingMessage, 30);

    useEffect(() => {
        if (isUploading) {
            const interval = setInterval(() => {
                setLoadingMessage(getRandomLoadingMessage());
            }, 5000);
            return () => clearInterval(interval);
        } else {
            setLoadingMessage(getRandomLoadingMessage());
        }
    }, [isUploading]);

    const validateFile = useCallback(
        (file: File): string | null => {
            if (file.size > maxFileSize) {
                return t('errors.fileTooLarge', 'File is too large. Maximum size is {{size}}.', {
                    size: formatFileSize(maxFileSize, t),
                });
            }

            const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!acceptedFileTypes.includes(fileExtension)) {
                return t(
                    'errors.invalidFileType',
                    'Invalid file type. Accepted types are {{types}}.',
                    { types: acceptedFileTypes.join(', ') }
                );
            }

            return null;
        },
        [maxFileSize, acceptedFileTypes, t]
    );

    const handleFileSelect = useCallback(
        (file: File) => {
            setError(null);
            const validationError = validateFile(file);

            if (validationError) {
                setError(validationError);
                return;
            }

            setSelectedFile(file);
            onFileSelect(file);
        },
        [validateFile, onFileSelect]
    );

    const handleFileInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    const handleDragEnter = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
                setIsDragOver(true);
            }
        },
        [disabled]
    );

    const handleDragLeave = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
                setIsDragOver(false);
            }
        },
        [disabled]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            if (disabled) return;

            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileSelect(file);
            }
        },
        [disabled, handleFileSelect]
    );

    const handleClick = useCallback(() => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, [disabled]);

    const handleUpload = useCallback(async () => {
        if (!selectedFile || isUploading || isProcessing) return;

        setIsProcessing(true);
        try {
            await onUpload(selectedFile);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsProcessing(false);
        }
    }, [selectedFile, isUploading, isProcessing, onUpload]);

    const handleClearFile = useCallback(() => {
        setSelectedFile(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    return (
        <div className={`w-full ${className}`}>
            <div
                className={`
                    group relative border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition-all duration-300
                    ${
                        isDragOver
                            ? 'border-purple-400 bg-purple-500/10 scale-[1.02]'
                            : 'border-purple-500/50 hover:border-purple-400/70'
                    }
                    ${
                        disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-purple-500/5 hover:shadow-lg hover:shadow-purple-500/20'
                    }
                    ${error ? 'border-red-400 bg-red-500/10' : ''}
                `}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type='file'
                    accept={acceptedFileTypes.join(',')}
                    onChange={handleFileInputChange}
                    className='hidden'
                    disabled={disabled}
                />

                {!selectedFile ? (
                    <div className='space-y-4'>
                        <div className='mx-auto w-12 h-12 md:w-16 md:h-16 text-purple-400 transition-transform duration-300 ease-in-out group-hover:scale-110'>
                            <svg
                                className='w-full h-full'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                                aria-hidden='true'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                                />
                            </svg>
                        </div>

                        <div>
                            <p className='text-lg md:text-xl font-semibold text-white mb-2'>
                                {t('upload.title', 'Drop your plugin here')}
                            </p>
                            <p className='text-gray-400 text-sm md:text-base mb-4'>
                                {t('upload.subtitle', 'or click to browse')}
                            </p>
                        </div>

                        <div className='text-xs text-gray-500 space-y-1'>
                            <p className='flex items-center justify-center gap-2'>
                                <svg
                                    className='w-4 h-4 text-gray-400'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10'
                                    />
                                </svg>
                                {t('upload.maxSize', 'Up to {{size}}', {
                                    size: formatFileSize(maxFileSize, t),
                                })}
                            </p>
                            <p className='flex items-center justify-center gap-2'>
                                <svg
                                    className='w-4 h-4 text-gray-400'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                    aria-hidden='true'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                    />
                                </svg>
                                {t('upload.acceptedTypes', '{{types}} files only', {
                                    types: acceptedFileTypes.join(', '),
                                })}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        <div className='mx-auto w-12 h-12 text-purple-400'>
                            <svg
                                className='w-full h-full'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                                />
                            </svg>
                        </div>

                        <div>
                            <p className='text-lg md:text-xl font-semibold text-white mb-2'>
                                {t('upload.fileSelected', 'Ready to scan')}
                            </p>
                            <p
                                className='text-gray-400 truncate max-w-full text-sm md:text-base'
                                title={selectedFile.name}
                            >
                                {selectedFile.name}
                            </p>
                            <p className='text-xs md:text-sm text-gray-500 mt-1'>
                                {formatFileSize(selectedFile.size, t)}
                            </p>
                        </div>

                        {isUploading ? (
                            <div className='space-y-2'>
                                <div className='w-full bg-gray-700 rounded-full h-2'>
                                    <div
                                        className='bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300'
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <div className='text-center'>
                                    <p className='text-sm text-purple-300 font-medium'>
                                        {typedMessage}
                                        {!isComplete && <span className='animate-pulse'>▊</span>}
                                    </p>
                                    <p className='text-xs text-gray-400 mt-1'>
                                        {Math.round(uploadProgress)}% complete
                                    </p>
                                    {useChunkedUpload && uploadStatus && (
                                        <p className='text-xs text-gray-500 mt-1'>{uploadStatus}</p>
                                    )}
                                    {isPreparing && (
                                        <div className='flex items-center justify-center mt-2'>
                                            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400'></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className='flex space-x-3 justify-center'>
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleUpload();
                                    }}
                                    disabled={disabled}
                                    className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 px-6 md:px-8 py-2 md:py-3 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/50 active:scale-95 disabled:hover:scale-100 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800'
                                >
                                    {error
                                        ? t('upload.uploadAgain', 'Scan Again')
                                        : t('upload.upload', 'Scan Now')}
                                </button>
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleClearFile();
                                    }}
                                    disabled={disabled}
                                    className='bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-gray-200 px-6 md:px-8 py-2 md:py-3 rounded-lg font-semibold transition-all duration-200 active:scale-95 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800'
                                >
                                    {t('upload.cancel', 'Cancel')}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className='mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg'>
                        <div className='flex items-center gap-2'>
                            <svg
                                className='w-5 h-5 text-red-400 flex-shrink-0'
                                fill='currentColor'
                                viewBox='0 0 20 20'
                            >
                                <path
                                    fillRule='evenodd'
                                    d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                                    clipRule='evenodd'
                                />
                            </svg>
                            <p className='text-sm text-red-300'>{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
