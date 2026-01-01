'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { api, ApiError } from '@/lib/api-client';

interface ApiResponse {
    status: number;
    data: unknown;
    error?: string;
}

type EndpointType = 'upload' | 'getByHash' | 'getByFilename' | 'analytics' | 'chunkedUpload';

export default function ApiPlayground() {
    const { t } = useTranslation();
    const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointType>('upload');
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [hashQuery, setHashQuery] = useState('');
    const [filenameQuery, setFilenameQuery] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadTest = async () => {
        if (!apiKey || !selectedFile) {
            setValidationError(t('docs.playground.validationErrors.provideKeyAndFile'));
            return;
        }

        setValidationError(null);
        setLoading(true);
        setResponse(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('forceAnalyze', 'false');

            const data = await api.post('files', formData, { token: apiKey });
            setResponse({ status: 200, data });
        } catch (error: unknown) {
            let errorStatus = 500;
            let errorMessage = 'Request failed';
            let errorData: unknown = { error: 'Request failed' };

            const err = error as Record<string, unknown>;

            if (error instanceof ApiError) {
                errorStatus = error.status;
                errorMessage = error.message;
                errorData = error.data || { error: error.message };
            } else if ('status' in err || 'statusCode' in err) {
                errorStatus = (err.status as number) || (err.statusCode as number) || 500;
                errorMessage = (err.message as string) || String(error) || 'Request failed';

                if ('data' in err && err.data) {
                    errorData = err.data;
                } else if ('body' in err && err.body) {
                    errorData = err.body;
                } else {
                    errorData = { error: errorMessage };
                }
            } else {
                errorMessage = String(error) || 'Request failed';
                errorData = { error: errorMessage };
            }

            setResponse({
                status: errorStatus,
                data: errorData,
                error: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGetByHash = async () => {
        if (!apiKey || !hashQuery) {
            setValidationError(t('docs.playground.validationErrors.provideKeyAndHash'));
            return;
        }

        setValidationError(null);
        setLoading(true);
        setResponse(null);

        try {
            const data = await api.get(`files/${hashQuery}`, { token: apiKey });
            setResponse({ status: 200, data });
        } catch (error: unknown) {
            let errorStatus = 500;
            let errorMessage = 'Request failed';
            let errorData: unknown = { error: 'Request failed' };

            const err = error as Record<string, unknown>;

            if (error instanceof ApiError) {
                errorStatus = error.status;
                errorMessage = error.message;
                errorData = error.data || { error: error.message };
            } else if ('status' in err || 'statusCode' in err) {
                errorStatus = (err.status as number) || (err.statusCode as number) || 500;
                errorMessage = (err.message as string) || String(error) || 'Request failed';

                if ('data' in err && err.data) {
                    errorData = err.data;
                } else if ('body' in err && err.body) {
                    errorData = err.body;
                } else {
                    errorData = { error: errorMessage };
                }
            } else {
                errorMessage = String(error) || 'Request failed';
                errorData = { error: errorMessage };
            }

            setResponse({
                status: errorStatus,
                data: errorData,
                error: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGetByFilename = async () => {
        if (!apiKey || !filenameQuery) {
            setValidationError(t('docs.playground.validationErrors.provideKeyAndFilename'));
            return;
        }

        setValidationError(null);
        setLoading(true);
        setResponse(null);

        try {
            const data = await api.get(`files/filename/${encodeURIComponent(filenameQuery)}`, {
                token: apiKey,
            });
            setResponse({ status: 200, data });
        } catch (error: unknown) {
            let errorStatus = 500;
            let errorMessage = 'Request failed';
            let errorData: unknown = { error: 'Request failed' };

            const err = error as Record<string, unknown>;

            if (error instanceof ApiError) {
                errorStatus = error.status;
                errorMessage = error.message;
                errorData = error.data || { error: error.message };
            } else if ('status' in err || 'statusCode' in err) {
                errorStatus = (err.status as number) || (err.statusCode as number) || 500;
                errorMessage = (err.message as string) || String(error) || 'Request failed';

                if ('data' in err && err.data) {
                    errorData = err.data;
                } else if ('body' in err && err.body) {
                    errorData = err.body;
                } else {
                    errorData = { error: errorMessage };
                }
            } else {
                errorMessage = String(error) || 'Request failed';
                errorData = { error: errorMessage };
            }

            setResponse({
                status: errorStatus,
                data: errorData,
                error: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGetAnalytics = async () => {
        if (!apiKey) {
            setValidationError(t('docs.playground.validationErrors.provideKey'));
            return;
        }

        setValidationError(null);
        setLoading(true);
        setResponse(null);

        try {
            const data = await api.get('files/analytics', { token: apiKey });
            setResponse({ status: 200, data });
        } catch (error: unknown) {
            let errorStatus = 500;
            let errorMessage = 'Request failed';
            let errorData: unknown = { error: 'Request failed' };

            const err = error as Record<string, unknown>;

            if (error instanceof ApiError) {
                errorStatus = error.status;
                errorMessage = error.message;
                errorData = error.data || { error: error.message };
            } else if ('status' in err || 'statusCode' in err) {
                errorStatus = (err.status as number) || (err.statusCode as number) || 500;
                errorMessage = (err.message as string) || String(error) || 'Request failed';

                if ('data' in err && err.data) {
                    errorData = err.data;
                } else if ('body' in err && err.body) {
                    errorData = err.body;
                } else {
                    errorData = { error: errorMessage };
                }
            } else {
                errorMessage = String(error) || 'Request failed';
                errorData = { error: errorMessage };
            }

            setResponse({
                status: errorStatus,
                data: errorData,
                error: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    const generateCurlCommand = () => {
        switch (selectedEndpoint) {
            case 'upload':
                if (!selectedFile) return '';
                return `curl -X POST https://api.safeturned.com/v1.0/files \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -F "file=@${selectedFile.name}" \\
  -F "forceAnalyze=false"`;
            case 'getByHash':
                return `curl -X GET https://api.safeturned.com/v1.0/files/${hashQuery || '{hash}'} \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}"`;
            case 'getByFilename':
                return `curl -X GET https://api.safeturned.com/v1.0/files/filename/${encodeURIComponent(filenameQuery || '{filename}')} \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}"`;
            case 'analytics':
                return `curl -X GET https://api.safeturned.com/v1.0/files/analytics \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}"`;
            case 'chunkedUpload':
                return `# See documentation for complete chunked upload process
# Step 1: Initiate
curl -X POST https://api.safeturned.com/v1.0/files/upload/initiate \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"fileName":"file.dll","fileSizeBytes":10485760,"fileHash":"...","totalChunks":2}'`;
            default:
                return '';
        }
    };

    const endpoints = [
        { id: 'upload' as EndpointType, name: 'Upload File', method: 'POST', path: '/v1.0/files' },
        {
            id: 'getByHash' as EndpointType,
            name: 'Get by Hash',
            method: 'GET',
            path: '/v1.0/files/{hash}',
        },
        {
            id: 'getByFilename' as EndpointType,
            name: 'Get by Filename',
            method: 'GET',
            path: '/v1.0/files/filename/{filename}',
        },
        {
            id: 'analytics' as EndpointType,
            name: 'Get Analytics',
            method: 'GET',
            path: '/v1.0/files/analytics',
        },
        {
            id: 'chunkedUpload' as EndpointType,
            name: 'Chunked Upload',
            method: 'POST',
            path: '/v1.0/files/upload/*',
        },
    ];

    return (
        <div className='space-y-6'>
            <div className='bg-amber-900/20 border border-amber-500/30 rounded-lg p-4'>
                <p className='text-amber-300 text-sm flex items-start gap-2'>
                    <span className='text-lg'>⚠️</span>
                    <span>
                        <strong>{t('docs.playground.securityWarning')}</strong>{' '}
                        {t('docs.playground.securityWarningDesc')}
                    </span>
                </p>
            </div>

            {validationError && (
                <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                    <p className='text-red-300 text-sm flex items-start gap-2'>
                        <span className='text-lg'>❌</span>
                        <span>{validationError}</span>
                    </p>
                </div>
            )}

            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6 space-y-6'>
                <div>
                    <label className='block text-white font-medium mb-2'>
                        {t('docs.playground.yourApiKey')}
                    </label>
                    <div className='flex gap-2'>
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder='sk_live_...'
                            className='flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                        />
                        <button
                            onClick={() => setShowKey(!showKey)}
                            className='px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-gray-300 hover:text-white transition-colors'
                            title={showKey ? 'Hide key' : 'Show key'}
                        >
                            {showKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <div className='mt-3 flex items-center justify-between gap-4 text-sm'>
                        <span className='text-gray-400'>{t('docs.playground.noApiKey')}</span>
                        <Link
                            href='/dashboard/api-keys'
                            className='inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300'
                        >
                            <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                                />
                            </svg>
                            {t('docs.playground.createApiKey')}
                        </Link>
                    </div>
                </div>

                <div className='border-t border-slate-600 pt-6'>
                    <label className='block text-white font-medium mb-4'>
                        {t('docs.playground.selectEndpoint')}
                    </label>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                        {endpoints.map(endpoint => (
                            <button
                                key={endpoint.id}
                                onClick={() => {
                                    setSelectedEndpoint(endpoint.id);
                                    setResponse(null);
                                    setValidationError(null);
                                }}
                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                    selectedEndpoint === endpoint.id
                                        ? 'border-purple-500 bg-purple-500/20'
                                        : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                                }`}
                            >
                                <div className='flex items-center gap-2 mb-1'>
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                            endpoint.method === 'POST'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                        }`}
                                    >
                                        {endpoint.method}
                                    </span>
                                </div>
                                <div className='text-white font-medium text-sm mb-1'>
                                    {endpoint.name}
                                </div>
                                <div className='text-purple-400 text-xs font-mono'>
                                    {endpoint.path}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {selectedEndpoint === 'upload' && (
                    <div className='border-t border-slate-600 pt-6'>
                        <h4 className='text-white font-semibold mb-4'>
                            {t('docs.playground.testUpload')}
                        </h4>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-gray-300 text-sm mb-2'>
                                    {t('docs.playground.selectFile')}
                                </label>
                                <input
                                    type='file'
                                    accept='.dll'
                                    onChange={handleFileSelect}
                                    className='block w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer'
                                />
                                {selectedFile && (
                                    <p className='text-green-400 text-sm mt-2'>
                                        Selected: {selectedFile.name} (
                                        {(selectedFile.size / 1024).toFixed(2)} KB)
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={handleUploadTest}
                                disabled={loading || !apiKey || !selectedFile}
                                className='w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-300'
                            >
                                {loading
                                    ? t('docs.playground.testing')
                                    : `🚀 ${t('docs.playground.testUploadBtn')}`}
                            </button>

                            <div className='bg-slate-900/50 rounded-lg p-4'>
                                <div className='text-gray-400 text-xs mb-2'>
                                    {t('docs.playground.curlCommand')}
                                </div>
                                <pre className='text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all'>
                                    {generateCurlCommand() || t('docs.playground.selectFileMsg')}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {selectedEndpoint === 'getByHash' && (
                    <div className='border-t border-slate-600 pt-6'>
                        <h4 className='text-white font-semibold mb-4'>
                            {t('docs.playground.testGetByHash')}
                        </h4>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-gray-300 text-sm mb-2'>
                                    {t('docs.playground.fileHash')}
                                </label>
                                <input
                                    type='text'
                                    value={hashQuery}
                                    onChange={e => setHashQuery(e.target.value)}
                                    placeholder='a3f5b2c1d4e6f7a8...'
                                    className='w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                />
                            </div>

                            <button
                                onClick={handleGetByHash}
                                disabled={loading || !apiKey || !hashQuery}
                                className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-300'
                            >
                                {loading
                                    ? t('docs.playground.fetching')
                                    : `🔍 ${t('docs.playground.testGetBtn')}`}
                            </button>

                            <div className='bg-slate-900/50 rounded-lg p-4'>
                                <div className='text-gray-400 text-xs mb-2'>
                                    {t('docs.playground.curlCommand')}
                                </div>
                                <pre className='text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all'>
                                    {generateCurlCommand()}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {selectedEndpoint === 'getByFilename' && (
                    <div className='border-t border-slate-600 pt-6'>
                        <h4 className='text-white font-semibold mb-4'>
                            {t('docs.playground.testGetByFilename')}
                        </h4>
                        <div className='space-y-4'>
                            <div>
                                <label className='block text-gray-300 text-sm mb-2'>
                                    {t('docs.playground.filename')}
                                </label>
                                <input
                                    type='text'
                                    value={filenameQuery}
                                    onChange={e => setFilenameQuery(e.target.value)}
                                    placeholder='MyPlugin.dll'
                                    className='w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500'
                                />
                            </div>

                            <button
                                onClick={handleGetByFilename}
                                disabled={loading || !apiKey || !filenameQuery}
                                className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-300'
                            >
                                {loading
                                    ? t('docs.playground.fetching')
                                    : `🔍 ${t('docs.playground.testGetByFilenameBtn')}`}
                            </button>

                            <div className='bg-slate-900/50 rounded-lg p-4'>
                                <div className='text-gray-400 text-xs mb-2'>
                                    {t('docs.playground.curlCommand')}
                                </div>
                                <pre className='text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all'>
                                    {generateCurlCommand()}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {selectedEndpoint === 'analytics' && (
                    <div className='border-t border-slate-600 pt-6'>
                        <h4 className='text-white font-semibold mb-4'>
                            {t('docs.playground.testGetAnalytics')}
                        </h4>
                        <div className='space-y-4'>
                            <p className='text-gray-300 text-sm'>
                                {t('docs.playground.analyticsDesc')}
                            </p>

                            <button
                                onClick={handleGetAnalytics}
                                disabled={loading || !apiKey}
                                className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-300'
                            >
                                {loading
                                    ? t('docs.playground.fetching')
                                    : `📊 ${t('docs.playground.testAnalyticsBtn')}`}
                            </button>

                            <div className='bg-slate-900/50 rounded-lg p-4'>
                                <div className='text-gray-400 text-xs mb-2'>
                                    {t('docs.playground.curlCommand')}
                                </div>
                                <pre className='text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all'>
                                    {generateCurlCommand()}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {selectedEndpoint === 'chunkedUpload' && (
                    <div className='border-t border-slate-600 pt-6'>
                        <h4 className='text-white font-semibold mb-4'>
                            {t('docs.playground.chunkedUploadTitle')}
                        </h4>
                        <div className='space-y-4'>
                            <p className='text-gray-300 text-sm'>
                                {t('docs.playground.chunkedUploadDesc')}
                            </p>
                            <ol className='list-decimal list-inside text-gray-300 text-sm space-y-2 ml-4'>
                                <li>
                                    <strong>Start:</strong> {t('docs.playground.chunkedStep1')}
                                </li>
                                <li>
                                    <strong>Upload:</strong> {t('docs.playground.chunkedStep2')}
                                </li>
                                <li>
                                    <strong>Finish:</strong> {t('docs.playground.chunkedStep3')}
                                </li>
                            </ol>
                            <div className='bg-blue-900/20 border border-blue-500/20 rounded p-3'>
                                <p className='text-blue-300 text-xs'>
                                    💡 <strong>Tip:</strong> {t('docs.playground.chunkedTip')}
                                </p>
                            </div>

                            <div className='bg-slate-900/50 rounded-lg p-4'>
                                <div className='text-gray-400 text-xs mb-2'>
                                    {t('docs.playground.curlCommandExample')}
                                </div>
                                <pre className='text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all'>
                                    {generateCurlCommand()}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {response && (
                    <div className='border-t border-slate-600 pt-6'>
                        <h4 className='text-white font-semibold mb-4'>
                            {t('docs.playground.response')}
                            <span
                                className={`ml-3 text-sm px-3 py-1 rounded-full ${
                                    response.status >= 200 && response.status < 300
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                }`}
                            >
                                {response.status}
                            </span>
                        </h4>
                        <div className='bg-slate-900 rounded-lg p-4 overflow-x-auto'>
                            <pre className='text-sm text-gray-300'>
                                {JSON.stringify(response.data || response.error, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
