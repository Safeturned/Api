'use client';

import React, { useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileSelect: (file: File | null) => void;
    onConfirmUpload: () => void;
    selectedFile: File | null;
    isUploading: boolean;
    useChunkedUpload: boolean;
    chunkedUploadProgress: number;
    chunkedUploadStatus?: string;
    isPreparing?: boolean;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export default function FileUploadModal({
    isOpen,
    onClose,
    onFileSelect,
    onConfirmUpload,
    selectedFile,
    isUploading,
    useChunkedUpload,
    chunkedUploadProgress,
    chunkedUploadStatus,
    isPreparing = false,
}: FileUploadModalProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            alert(t('errors.fileTooLarge'));
            return;
        }
        onFileSelect(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    if (!isOpen) return null;

    return (
        <div
            className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center'
            onClick={e => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className='bg-white rounded-lg p-8 max-w-md w-full mx-4 relative'
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <button
                    onClick={onClose}
                    className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors'
                >
                    <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M6 18L18 6M6 6l12 12'
                        />
                    </svg>
                </button>

                <div className='text-center'>
                    <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                        <svg
                            className='w-8 h-8 text-blue-600'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                        >
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                            />
                        </svg>
                    </div>

                    {!selectedFile ? (
                        <>
                            <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                                {t('uploadModal.title')}
                            </h2>
                            <p className='text-gray-600 mb-6'>{t('uploadModal.subtitle')}</p>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mb-4'
                            >
                                {t('uploadModal.chooseFile')}
                            </button>

                            <p className='text-sm text-gray-500'>{t('uploadModal.dragDropHint')}</p>
                        </>
                    ) : (
                        <>
                            <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                                {t('uploadModal.fileSelected')}
                            </h2>

                            <div className='bg-gray-50 rounded-lg p-4 mb-6'>
                                <div className='flex items-center space-x-3'>
                                    <svg
                                        className='w-8 h-8 text-blue-600'
                                        fill='none'
                                        stroke='currentColor'
                                        viewBox='0 0 24 24'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                                        />
                                    </svg>
                                    <div className='flex-1 text-left'>
                                        <p className='font-medium text-gray-900 truncate'>
                                            {selectedFile.name}
                                        </p>
                                        <p className='text-sm text-gray-500'>
                                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {isUploading ? (
                                <div className='space-y-4'>
                                    <div className='w-full bg-gray-200 rounded-full h-2'>
                                        <div
                                            className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                                            style={{
                                                width: `${useChunkedUpload ? chunkedUploadProgress : 100}%`,
                                            }}
                                        />
                                    </div>
                                    <div className='text-center'>
                                        <p className='text-sm text-gray-600'>
                                            {useChunkedUpload && chunkedUploadStatus
                                                ? chunkedUploadStatus
                                                : t('uploadModal.uploading')}
                                        </p>
                                        {useChunkedUpload && (
                                            <p className='text-xs text-gray-500 mt-1'>
                                                {Math.round(chunkedUploadProgress)}% complete
                                            </p>
                                        )}
                                        {isPreparing && (
                                            <div className='flex items-center justify-center mt-2'>
                                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className='flex space-x-3'>
                                    <button
                                        onClick={onConfirmUpload}
                                        className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'
                                    >
                                        {t('uploadModal.upload')}
                                    </button>
                                    <button
                                        onClick={() => onFileSelect(null)}
                                        className='bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors'
                                    >
                                        {t('uploadModal.cancel')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    <div className='mt-6 text-xs text-gray-500 text-left'>
                        <p>{t('uploadModal.disclaimer')}</p>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type='file'
                    accept='.dll'
                    onChange={handleFileInputChange}
                    className='hidden'
                />
            </div>
        </div>
    );
}
