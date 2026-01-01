'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/lib/auth-context';
import {
    getTierName,
    getTierTextColor,
    getTierBgColor,
    getTierBorderColor,
    getTierBadgeColor,
    getTierRateLimitNumber,
    getTierWriteLimit,
    getTierUploadLimit,
    TIER_FREE,
    TIER_VERIFIED,
    TIER_PREMIUM,
} from '@/lib/tierConstants';
import Link from 'next/link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import ApiPlayground from '@/components/ApiPlayground';
import BackToTop from '@/components/BackToTop';
import { API_BASE_URL } from '@/lib/apiConfig';

type CodeLanguage = 'unity' | 'csharp' | 'curl' | 'javascript' | 'python';

const languageMap: Record<CodeLanguage, string> = {
    unity: 'csharp',
    csharp: 'csharp',
    curl: 'bash',
    javascript: 'javascript',
    python: 'python',
};

interface CodeBlockProps {
    code: string;
    language: string;
    customStyle?: React.CSSProperties;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, customStyle }) => {
    return (
        <div className='rounded-lg overflow-hidden border border-slate-600/50'>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    borderRadius: 0,
                    ...customStyle,
                }}
                showLineNumbers={false}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

export default function DocsPage() {
    const { t } = useTranslation();
    const { user, isAuthenticated } = useAuth();
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>('unity');
    const [selectedChunkedLanguage, setSelectedChunkedLanguage] = useState<CodeLanguage>('unity');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(id);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    const codeExamples: Record<CodeLanguage, { name: string; code: string; id: string }> = {
        unity: { name: 'Unity C# (Unturned)', code: unityExample, id: 'unity' },
        csharp: { name: 'C# (.NET)', code: csharpExample, id: 'csharp' },
        curl: { name: 'cURL', code: curlExample, id: 'curl' },
        javascript: { name: 'JavaScript (Node.js)', code: jsExample, id: 'js' },
        python: { name: 'Python', code: pythonExample, id: 'python' },
    };

    const chunkedUploadExamples: Record<CodeLanguage, { name: string; code: string; id: string }> =
        {
            unity: {
                name: 'Unity C# (Unturned)',
                code: chunkedUploadCSharpExample,
                id: 'chunked-unity',
            },
            csharp: {
                name: 'C# (.NET)',
                code: chunkedUploadCSharpNetExample,
                id: 'chunked-csharp',
            },
            curl: { name: 'cURL', code: chunkedUploadCurlExample, id: 'chunked-curl' },
            javascript: {
                name: 'JavaScript (Node.js)',
                code: chunkedUploadJsExample,
                id: 'chunked-js',
            },
            python: { name: 'Python', code: chunkedUploadPythonExample, id: 'chunked-python' },
        };

    return (
        <div className='min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900'>
            <div className='max-w-4xl mx-auto px-6 py-12'>
                <Link
                    href='/'
                    className='inline-flex items-center text-gray-400 hover:text-purple-300 transition-colors mb-8'
                >
                    ← {t('docs.backToHome')}
                </Link>

                <h1 className='text-4xl font-bold text-white mb-4'>{t('docs.title')}</h1>
                <p className='text-gray-300 text-lg mb-12'>{t('docs.subtitle')}</p>

                <div className='space-y-12'>
                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.gettingStarted.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6 space-y-4'>
                            <ol className='list-decimal list-inside space-y-2 text-gray-300 ml-4'>
                                {!isAuthenticated && (
                                    <li>
                                        <Link
                                            href='/login'
                                            className='text-purple-400 hover:text-purple-300'
                                        >
                                            {t('docs.gettingStarted.signIn')}
                                        </Link>{' '}
                                        {t('docs.gettingStarted.step1')}
                                    </li>
                                )}
                                <li>
                                    {t('docs.gettingStarted.step2')}{' '}
                                    <Link
                                        href='/dashboard/api-keys'
                                        className='text-purple-400 hover:text-purple-300'
                                    >
                                        {t('docs.gettingStarted.apiKeysPage')}
                                    </Link>
                                </li>
                                <li>{t('docs.gettingStarted.step3')}</li>
                                <li>{t('docs.gettingStarted.step4')}</li>
                            </ol>
                        </div>
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.rateLimits.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div
                                    className={`rounded-lg p-4 ${
                                        isAuthenticated && user?.tier === TIER_FREE
                                            ? `${getTierBgColor(TIER_FREE)} border-2 ${getTierBorderColor(TIER_FREE)} shadow-lg`
                                            : 'bg-slate-700/30'
                                    }`}
                                >
                                    <div className='flex items-center justify-between mb-1'>
                                        <div
                                            className={`${getTierTextColor(TIER_FREE)} font-semibold`}
                                        >
                                            {t('docs.rateLimits.free')}
                                        </div>
                                        {isAuthenticated && user?.tier === TIER_FREE && (
                                            <span
                                                className={`text-xs px-2 py-1 ${getTierBadgeColor(TIER_FREE)} text-white rounded-full`}
                                            >
                                                {t('docs.rateLimits.your')}
                                            </span>
                                        )}
                                    </div>
                                    <div className='text-lg font-bold text-white leading-tight'>
                                        <span className='text-green-400'>
                                            {getTierRateLimitNumber(TIER_FREE).toLocaleString()}
                                        </span>{' '}
                                        {t('dashboard.reads')}
                                        <br />
                                        <span className='text-blue-400'>
                                            {getTierWriteLimit(TIER_FREE)}
                                        </span>{' '}
                                        {t('dashboard.writes')}
                                        <br />
                                        <span className='text-purple-400'>
                                            {getTierUploadLimit(TIER_FREE)}
                                        </span>{' '}
                                        {t('dashboard.uploads')}
                                        <br />
                                        <span className='text-xs text-gray-400'>
                                            {t('dashboard.perHour')}
                                        </span>
                                    </div>
                                    <div className='text-gray-400 text-sm mt-2'>
                                        {t('docs.rateLimits.freeDesc')}
                                    </div>
                                </div>
                                <div
                                    className={`rounded-lg p-4 ${
                                        isAuthenticated && user?.tier === TIER_VERIFIED
                                            ? `${getTierBgColor(TIER_VERIFIED)} border-2 ${getTierBorderColor(TIER_VERIFIED)} shadow-lg`
                                            : 'bg-slate-700/30'
                                    }`}
                                >
                                    <div className='flex items-center justify-between mb-1'>
                                        <div
                                            className={`${getTierTextColor(TIER_VERIFIED)} font-semibold`}
                                        >
                                            {t('docs.rateLimits.verified')}
                                        </div>
                                        {isAuthenticated && user?.tier === TIER_VERIFIED && (
                                            <span
                                                className={`text-xs px-2 py-1 ${getTierBadgeColor(TIER_VERIFIED)} text-white rounded-full`}
                                            >
                                                {t('docs.rateLimits.your')}
                                            </span>
                                        )}
                                    </div>
                                    <div className='text-lg font-bold text-white leading-tight'>
                                        <span className='text-green-400'>
                                            {getTierRateLimitNumber(TIER_VERIFIED).toLocaleString()}
                                        </span>{' '}
                                        {t('dashboard.reads')}
                                        <br />
                                        <span className='text-blue-400'>
                                            {getTierWriteLimit(TIER_VERIFIED)}
                                        </span>{' '}
                                        {t('dashboard.writes')}
                                        <br />
                                        <span className='text-purple-400'>
                                            {getTierUploadLimit(TIER_VERIFIED)}
                                        </span>{' '}
                                        {t('dashboard.uploads')}
                                        <br />
                                        <span className='text-xs text-gray-400'>
                                            {t('dashboard.perHour')}
                                        </span>
                                    </div>
                                    <div className='text-gray-400 text-sm mt-2'>
                                        {t('docs.rateLimits.verifiedDesc')}
                                    </div>
                                </div>
                                <div
                                    className={`rounded-lg p-4 ${
                                        isAuthenticated && user?.tier === TIER_PREMIUM
                                            ? `${getTierBgColor(TIER_PREMIUM)} border-2 ${getTierBorderColor(TIER_PREMIUM)} shadow-lg`
                                            : 'bg-slate-700/30'
                                    }`}
                                >
                                    <div className='flex items-center justify-between mb-1'>
                                        <div
                                            className={`${getTierTextColor(TIER_PREMIUM)} font-semibold`}
                                        >
                                            {t('docs.rateLimits.premium')}
                                        </div>
                                        {isAuthenticated && user?.tier === TIER_PREMIUM && (
                                            <span
                                                className={`text-xs px-2 py-1 ${getTierBadgeColor(TIER_PREMIUM)} text-white rounded-full`}
                                            >
                                                {t('docs.rateLimits.your')}
                                            </span>
                                        )}
                                    </div>
                                    <div className='text-lg font-bold text-white leading-tight'>
                                        <span className='text-green-400'>
                                            {getTierRateLimitNumber(TIER_PREMIUM).toLocaleString()}
                                        </span>{' '}
                                        {t('dashboard.reads')}
                                        <br />
                                        <span className='text-blue-400'>
                                            {getTierWriteLimit(TIER_PREMIUM)}
                                        </span>{' '}
                                        {t('dashboard.writes')}
                                        <br />
                                        <span className='text-purple-400'>
                                            {getTierUploadLimit(TIER_PREMIUM)}
                                        </span>{' '}
                                        {t('dashboard.uploads')}
                                        <br />
                                        <span className='text-xs text-gray-400'>
                                            {t('dashboard.perHour')}
                                        </span>
                                    </div>
                                    <div className='text-gray-400 text-sm mt-2'>
                                        {t('docs.rateLimits.premiumDesc')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.endpoints.title')}
                        </h2>

                        <div className='space-y-6'>
                            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                                <div className='flex items-center gap-3 mb-4'>
                                    <span className='px-3 py-1 bg-green-500/20 text-green-400 rounded font-mono text-sm font-semibold'>
                                        POST
                                    </span>
                                    <code className='text-purple-400 font-mono'>/v1.0/files</code>
                                </div>
                                <p className='text-gray-300 mb-4'>
                                    {t('docs.endpoints.upload.title')}
                                </p>
                                <div className='bg-slate-900/50 rounded p-4 space-y-2'>
                                    <div className='text-sm text-gray-400'>
                                        {t('docs.endpoints.upload.params')}
                                    </div>
                                    <ul className='text-gray-300 space-y-1 ml-4'>
                                        <li>
                                            <code className='text-purple-400'>file</code> -{' '}
                                            {t('docs.endpoints.upload.paramFile')}
                                        </li>
                                        <li>
                                            <code className='text-purple-400'>forceAnalyze</code> -{' '}
                                            {t('docs.endpoints.upload.paramForce')}
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                                <div className='flex items-center gap-3 mb-4'>
                                    <span className='px-3 py-1 bg-green-500/20 text-green-400 rounded font-mono text-sm font-semibold'>
                                        POST
                                    </span>
                                    <code className='text-purple-400 font-mono'>
                                        /v1.0/files/upload/*
                                    </code>
                                </div>
                                <p className='text-gray-300 mb-4'>
                                    {t('docs.endpoints.chunkedUpload.title')}
                                </p>
                                <div className='bg-slate-900/50 rounded p-4 space-y-3'>
                                    <div>
                                        <div className='text-sm text-gray-400 mb-2 font-semibold'>
                                            {t('docs.endpoints.chunkedUpload.processTitle')}
                                        </div>
                                        <ol className='text-gray-300 space-y-2 ml-4 list-decimal text-sm'>
                                            <li>
                                                <code className='text-purple-400'>
                                                    POST /v1.0/files/upload/initiate
                                                </code>{' '}
                                                - {t('docs.endpoints.chunkedUpload.step1')}
                                            </li>
                                            <li>
                                                <code className='text-purple-400'>
                                                    POST /v1.0/files/upload/chunk
                                                </code>{' '}
                                                - {t('docs.endpoints.chunkedUpload.step2')}
                                            </li>
                                            <li>
                                                <code className='text-purple-400'>
                                                    POST /v1.0/files/upload/complete
                                                </code>{' '}
                                                - {t('docs.endpoints.chunkedUpload.step3')}
                                            </li>
                                        </ol>
                                    </div>
                                    <div className='bg-blue-900/20 border border-blue-500/20 rounded p-3'>
                                        <p className='text-blue-300 text-xs'>
                                            💡 <strong>Tip:</strong>{' '}
                                            {t('docs.endpoints.chunkedUpload.tip')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                                <div className='flex items-center gap-3 mb-4'>
                                    <span className='px-3 py-1 bg-blue-500/20 text-blue-400 rounded font-mono text-sm font-semibold'>
                                        GET
                                    </span>
                                    <code className='text-purple-400 font-mono'>
                                        /v1.0/files/{'{hash}'}
                                    </code>
                                </div>
                                <p className='text-gray-300 mb-4'>
                                    {t('docs.endpoints.getByHash.title')}
                                </p>
                            </div>

                            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                                <div className='flex items-center gap-3 mb-4'>
                                    <span className='px-3 py-1 bg-blue-500/20 text-blue-400 rounded font-mono text-sm font-semibold'>
                                        GET
                                    </span>
                                    <code className='text-purple-400 font-mono'>
                                        /v1.0/files/filename/{'{filename}'}
                                    </code>
                                </div>
                                <p className='text-gray-300 mb-4'>
                                    {t('docs.endpoints.getByFilename.title')}
                                </p>
                            </div>

                            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                                <div className='flex items-center gap-3 mb-4'>
                                    <span className='px-3 py-1 bg-blue-500/20 text-blue-400 rounded font-mono text-sm font-semibold'>
                                        GET
                                    </span>
                                    <code className='text-purple-400 font-mono'>
                                        /v1.0/files/analytics
                                    </code>
                                </div>
                                <p className='text-gray-300 mb-4'>
                                    {t('docs.endpoints.analytics.title')}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-2xl font-bold text-white'>
                                {t('docs.codeExamples.title')}
                            </h2>
                            <button
                                onClick={() => toggleSection('codeExamples')}
                                className='flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded-lg transition-all duration-200 hover:scale-105 font-medium'
                            >
                                {expandedSections.has('codeExamples') ? (
                                    <>
                                        <svg
                                            className='w-5 h-5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M5 15l7-7 7 7'
                                            />
                                        </svg>
                                        {t('docs.common.collapse')}
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className='w-5 h-5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M19 9l-7 7-7-7'
                                            />
                                        </svg>
                                        {t('docs.common.expand')}
                                    </>
                                )}
                            </button>
                        </div>
                        <p className='text-gray-300 mb-6'>
                            {t('docs.codeExamples.intro')}{' '}
                            <code className='text-purple-400 bg-slate-800 px-2 py-1 rounded'>
                                {t('docs.codeExamples.yourApiKey')}
                            </code>{' '}
                            {t('docs.codeExamples.withKey')}
                        </p>

                        {expandedSections.has('codeExamples') && (
                            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg overflow-hidden'>
                                <div className='flex flex-wrap gap-2 p-4 bg-slate-800/30 border-b border-slate-600/50'>
                                    {(Object.keys(codeExamples) as CodeLanguage[]).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setSelectedLanguage(lang)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                                selectedLanguage === lang
                                                    ? 'bg-purple-600 text-white shadow-lg'
                                                    : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                                            }`}
                                        >
                                            {codeExamples[lang].name}
                                        </button>
                                    ))}
                                </div>

                                <div className='p-6'>
                                    <div className='flex items-center justify-between mb-3'>
                                        <h3 className='text-xl font-semibold text-white'>
                                            {codeExamples[selectedLanguage].name}
                                        </h3>
                                        <button
                                            onClick={() =>
                                                copyCode(
                                                    codeExamples[selectedLanguage].code,
                                                    codeExamples[selectedLanguage].id
                                                )
                                            }
                                            className='px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded text-sm transition-colors'
                                        >
                                            {copiedCode === codeExamples[selectedLanguage].id
                                                ? t('docs.codeExamples.copied')
                                                : t('docs.codeExamples.copy')}
                                        </button>
                                    </div>
                                    <CodeBlock
                                        code={codeExamples[selectedLanguage].code}
                                        language={languageMap[selectedLanguage]}
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    <section>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-2xl font-bold text-white'>
                                {t('docs.endpoints.chunkedUpload.exampleTitle')}
                            </h2>
                            <button
                                onClick={() => toggleSection('chunkedUpload')}
                                className='flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded-lg transition-all duration-200 hover:scale-105 font-medium'
                            >
                                {expandedSections.has('chunkedUpload') ? (
                                    <>
                                        <svg
                                            className='w-5 h-5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M5 15l7-7 7 7'
                                            />
                                        </svg>
                                        {t('docs.common.collapse')}
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className='w-5 h-5'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M19 9l-7 7-7-7'
                                            />
                                        </svg>
                                        {t('docs.common.expand')}
                                    </>
                                )}
                            </button>
                        </div>
                        {expandedSections.has('chunkedUpload') && (
                            <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg overflow-hidden'>
                                <div className='flex flex-wrap gap-2 p-4 bg-slate-800/30 border-b border-slate-600/50'>
                                    {(Object.keys(chunkedUploadExamples) as CodeLanguage[]).map(
                                        lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setSelectedChunkedLanguage(lang)}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                                    selectedChunkedLanguage === lang
                                                        ? 'bg-purple-600 text-white shadow-lg'
                                                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
                                                }`}
                                            >
                                                {chunkedUploadExamples[lang].name}
                                            </button>
                                        )
                                    )}
                                </div>

                                <div className='p-6'>
                                    <div className='flex items-center justify-between mb-3'>
                                        <h3 className='text-xl font-semibold text-white'>
                                            {chunkedUploadExamples[selectedChunkedLanguage].name}
                                        </h3>
                                        <button
                                            onClick={() =>
                                                copyCode(
                                                    chunkedUploadExamples[selectedChunkedLanguage]
                                                        .code,
                                                    chunkedUploadExamples[selectedChunkedLanguage]
                                                        .id
                                                )
                                            }
                                            className='px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded text-sm transition-colors'
                                        >
                                            {copiedCode ===
                                            chunkedUploadExamples[selectedChunkedLanguage].id
                                                ? t('docs.codeExamples.copied')
                                                : t('docs.codeExamples.copy')}
                                        </button>
                                    </div>
                                    <CodeBlock
                                        code={chunkedUploadExamples[selectedChunkedLanguage].code}
                                        language={languageMap[selectedChunkedLanguage]}
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.response.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                            <CodeBlock code={responseExample} language='json' />
                            <div className='mt-4 space-y-2 text-sm text-gray-300'>
                                <div>
                                    <code className='text-purple-400'>fileName</code> -{' '}
                                    {t('docs.response.fileName')}
                                </div>
                                <div>
                                    <code className='text-purple-400'>hash</code> -{' '}
                                    {t('docs.response.hash')}
                                </div>
                                <div>
                                    <code className='text-purple-400'>score</code> -{' '}
                                    {t('docs.response.score')}
                                </div>
                                <div>
                                    <code className='text-purple-400'>isNew</code> -{' '}
                                    {t('docs.response.isNew')}
                                </div>
                                <div>
                                    <code className='text-purple-400'>message</code> -{' '}
                                    {t('docs.response.message')}
                                </div>
                                <div>
                                    <code className='text-purple-400'>uploadedAt</code> -{' '}
                                    {t('docs.response.uploadedAt')}
                                </div>
                                <div>
                                    <code className='text-purple-400'>lastScanned</code> -{' '}
                                    {t('docs.response.lastScanned')}
                                </div>
                                <div>
                                    <code className='text-purple-400'>fileSizeBytes</code> -{' '}
                                    {t('docs.response.fileSizeBytes')}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.riskScores.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                            <div className='space-y-3'>
                                <div className='flex items-start gap-3'>
                                    <div className='w-24 text-green-400 font-semibold'>0-30</div>
                                    <div className='text-gray-300'>{t('docs.riskScores.safe')}</div>
                                </div>
                                <div className='flex items-start gap-3'>
                                    <div className='w-24 text-yellow-400 font-semibold'>31-60</div>
                                    <div className='text-gray-300'>
                                        {t('docs.riskScores.suspicious')}
                                    </div>
                                </div>
                                <div className='flex items-start gap-3'>
                                    <div className='w-24 text-orange-400 font-semibold'>61-80</div>
                                    <div className='text-gray-300'>
                                        {t('docs.riskScores.moderate')}
                                    </div>
                                </div>
                                <div className='flex items-start gap-3'>
                                    <div className='w-24 text-red-400 font-semibold'>81-100</div>
                                    <div className='text-gray-300'>
                                        {t('docs.riskScores.dangerous')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.errorHandling.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                            <div className='space-y-4'>
                                <div>
                                    <div className='text-red-400 font-semibold mb-2'>
                                        401 {t('docs.errorHandling.unauthorized')}
                                    </div>
                                    <CodeBlock
                                        code={errorExample401}
                                        language='json'
                                        customStyle={{ padding: '0.75rem' }}
                                    />
                                </div>
                                <div>
                                    <div className='text-red-400 font-semibold mb-2'>
                                        429 {t('docs.errorHandling.tooManyRequests')}
                                    </div>
                                    <CodeBlock
                                        code={errorExample429}
                                        language='json'
                                        customStyle={{ padding: '0.75rem' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.badgeTokens.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                            <p className='text-gray-300 mb-4'>
                                {t('docs.badgeTokens.description')}
                            </p>

                            <div className='space-y-4'>
                                <div>
                                    <h3 className='text-lg font-semibold text-white mb-3'>
                                        {t('docs.badgeTokens.howItWorks')}
                                    </h3>
                                    <ol className='list-decimal list-inside space-y-2 text-gray-300 ml-4'>
                                        <li>{t('docs.badgeTokens.step1')}</li>
                                        <li>{t('docs.badgeTokens.step2')}</li>
                                        <li>{t('docs.badgeTokens.step3')}</li>
                                        <li>{t('docs.badgeTokens.step4')}</li>
                                    </ol>
                                </div>

                                <div className='bg-purple-900/20 border border-purple-500/20 rounded-lg p-4'>
                                    <div className='flex items-center gap-2 mb-2'>
                                        <svg
                                            className='w-5 h-5 text-purple-400'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                                            />
                                        </svg>
                                        <span className='text-purple-300 font-semibold text-sm'>
                                            {t('docs.badgeTokens.createBadgesTitle')}
                                        </span>
                                    </div>
                                    <p className='text-slate-300 text-sm'>
                                        {t('docs.badgeTokens.createBadgesDescription')}
                                    </p>
                                    <Link
                                        href='/dashboard/badges'
                                        className='inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm font-medium underline underline-offset-2 mt-2'
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
                                                d='M13 7l5 5m0 0l-5 5m5-5H6'
                                            />
                                        </svg>
                                        {t('docs.badgeTokens.goToBadgesDashboard')}
                                    </Link>
                                </div>

                                <div className='bg-green-900/20 border border-green-500/20 rounded-lg p-4'>
                                    <h4 className='text-green-300 font-semibold text-sm mb-3 flex items-center gap-2'>
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
                                                d='M13 10V3L4 14h7v7l9-11h-7z'
                                            />
                                        </svg>
                                        {t('docs.badgeTokens.usingToken')}
                                    </h4>
                                    <p className='text-gray-300 text-sm mb-3'>
                                        {t('docs.badgeTokens.usingTokenDescription')}
                                    </p>
                                    <CodeBlock
                                        code={`curl -X POST ${API_BASE_URL}/v1.0/files \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/your/plugin.dll" \\
  -F "forceAnalyze=false" \\
  -F "badgeToken=YOUR_BADGE_TOKEN"`}
                                        language='bash'
                                        customStyle={{ padding: '0.75rem' }}
                                    />
                                </div>

                                <div className='bg-blue-900/20 border border-blue-500/20 rounded-lg p-4'>
                                    <h4 className='text-blue-300 font-semibold text-sm mb-2 flex items-center gap-2'>
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
                                                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                                            />
                                        </svg>
                                        {t('docs.badgeTokens.howMatching')}
                                    </h4>
                                    <p className='text-gray-300 text-sm'>
                                        {t('docs.badgeTokens.howMatchingDescription')}
                                    </p>
                                </div>

                                <div className='bg-red-900/20 border border-red-500/20 rounded-lg p-4'>
                                    <h4 className='text-red-300 font-semibold text-sm mb-2 flex items-center gap-2'>
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
                                                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                            />
                                        </svg>
                                        {t('docs.badgeTokens.securityPractices')}
                                    </h4>
                                    <ul className='text-gray-300 text-sm space-y-1 list-disc list-inside ml-4'>
                                        <li>{t('docs.badgeTokens.securityTip1')}</li>
                                        <li>{t('docs.badgeTokens.securityTip2')}</li>
                                        <li>{t('docs.badgeTokens.securityTip3')}</li>
                                        <li>{t('docs.badgeTokens.securityTip4')}</li>
                                    </ul>
                                </div>

                                <div className='bg-purple-900/20 border border-purple-500/20 rounded-lg p-4'>
                                    <h4 className='text-purple-300 font-semibold text-sm mb-2'>
                                        {t('docs.badgeTokens.cicdTitle')}
                                    </h4>
                                    <p className='text-gray-300 text-sm'>
                                        {t('docs.badgeTokens.cicdDescription')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.playground.title')}
                        </h2>
                        <p className='text-gray-300 mb-6'>{t('docs.playground.intro')}</p>
                        <ApiPlayground />
                    </section>

                    <section>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.tierFeatures.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                            <div className='space-y-6'>
                                <div className='p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg'>
                                    <div className='flex items-center gap-2 mb-3'>
                                        <h3
                                            className={`text-lg font-semibold ${getTierTextColor(TIER_FREE)}`}
                                        >
                                            {getTierName(TIER_FREE)}
                                        </h3>
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${getTierBgColor(TIER_FREE)} ${getTierTextColor(TIER_FREE)}`}
                                        >
                                            {t('docs.tierFeatures.default')}
                                        </span>
                                    </div>
                                    <ul className='space-y-2 text-sm text-gray-300'>
                                        <li>
                                            <span className='font-semibold'>
                                                {getTierRateLimitNumber(TIER_FREE).toLocaleString()}{' '}
                                                reads, {getTierWriteLimit(TIER_FREE)} writes,{' '}
                                                {getTierUploadLimit(TIER_FREE)} uploads/hour
                                            </span>
                                        </li>
                                        <li>
                                            <span className='font-semibold'>100 MB</span> file size
                                            limit
                                        </li>
                                        <li>
                                            <span className='font-semibold'>Up to 3</span> active
                                            API keys
                                        </li>
                                        <li>{t('docs.tierFeatures.communitySupport')}</li>
                                    </ul>
                                </div>

                                <div className='p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg'>
                                    <div className='flex items-center gap-2 mb-3'>
                                        <h3
                                            className={`text-lg font-semibold ${getTierTextColor(TIER_VERIFIED)}`}
                                        >
                                            {getTierName(TIER_VERIFIED)}
                                        </h3>
                                    </div>
                                    <ul className='space-y-2 text-sm text-gray-300'>
                                        <li>
                                            <span className='font-semibold'>
                                                {getTierRateLimitNumber(
                                                    TIER_VERIFIED
                                                ).toLocaleString()}{' '}
                                                reads, {getTierWriteLimit(TIER_VERIFIED)} writes,{' '}
                                                {getTierUploadLimit(TIER_VERIFIED)} uploads/hour
                                            </span>
                                        </li>
                                        <li>
                                            <span className='font-semibold'>200 MB</span> file size
                                            limit
                                        </li>
                                        <li>
                                            <span className='font-semibold'>Up to 5</span> active
                                            API keys
                                        </li>
                                        <li>{t('docs.tierFeatures.prioritySupport')}</li>
                                    </ul>
                                </div>

                                <div className='p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg'>
                                    <div className='flex items-center gap-2 mb-3'>
                                        <h3
                                            className={`text-lg font-semibold ${getTierTextColor(TIER_PREMIUM)}`}
                                        >
                                            {getTierName(TIER_PREMIUM)}
                                        </h3>
                                        <span className='px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400'>
                                            {t('docs.tierFeatures.recommended')}
                                        </span>
                                    </div>
                                    <ul className='space-y-2 text-sm text-gray-300'>
                                        <li>
                                            <span className='font-semibold'>
                                                {getTierRateLimitNumber(
                                                    TIER_PREMIUM
                                                ).toLocaleString()}{' '}
                                                reads,{' '}
                                                {getTierWriteLimit(TIER_PREMIUM).toLocaleString()}{' '}
                                                writes, {getTierUploadLimit(TIER_PREMIUM)}{' '}
                                                uploads/hour
                                            </span>
                                        </li>
                                        <li>
                                            <span className='font-semibold'>500 MB</span> file size
                                            limit
                                        </li>
                                        <li>
                                            <span className='font-semibold'>Up to 10</span> active
                                            API keys
                                        </li>
                                        <li>{t('docs.tierFeatures.prioritySupport')}</li>
                                        <li>{t('docs.tierFeatures.additionalFeatures')}</li>
                                    </ul>
                                </div>
                            </div>

                            <div className='mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg'>
                                <p className='text-sm text-gray-300'>
                                    <span className='font-semibold text-blue-400'>💡 Tip:</span>{' '}
                                    {t('docs.tierFeatures.tipDesc')}{' '}
                                    <Link
                                        href='/dashboard/api-keys'
                                        className='text-purple-400 hover:text-purple-300 underline'
                                    >
                                        API Keys dashboard
                                    </Link>
                                    . Each tier limits how many active keys you can have at once.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className='border-t border-slate-700 pt-8'>
                        <h2 className='text-2xl font-bold text-white mb-4'>
                            {t('docs.help.title')}
                        </h2>
                        <div className='bg-slate-700/40 backdrop-blur-sm border border-slate-600/50 rounded-lg p-6'>
                            <div className='space-y-3 text-gray-300'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-purple-400'>💬</span>
                                    <a
                                        href='https://discord.gg/JAKWGEabhc'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='text-purple-400 hover:text-purple-300'
                                    >
                                        {t('docs.help.discord')}
                                    </a>
                                </div>
                                <div className='flex items-center gap-3'>
                                    <span className='text-purple-400'>🐛</span>
                                    <a
                                        href='https://github.com/Safeturned/safeturned'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='text-purple-400 hover:text-purple-300'
                                    >
                                        {t('docs.help.issues')}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            <BackToTop />
        </div>
    );
}

const unityExample = `using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

// Best practice for Unturned plugins - uses Unity's built-in UnityWebRequest
// No external dependencies required
//
// SECURITY NOTE: Never hardcode API keys in production code!
// Load from encrypted config or environment variables instead.
public class SafeturnedScanner : MonoBehaviour
{
    private const string API_KEY = "YOUR_API_KEY"; // TODO: Load from secure storage
    private const string BASE_URL = "${API_BASE_URL}/v1.0";

    public IEnumerator ScanPlugin(string pluginPath)
    {
        byte[] fileData = File.ReadAllBytes(pluginPath);
        string fileName = Path.GetFileName(pluginPath);

        List<IMultipartFormSection> formData = new List<IMultipartFormSection>
        {
            new MultipartFormFileSection("file", fileData, fileName, "application/octet-stream"),
            new MultipartFormDataSection("forceAnalyze", "false")
        };

        using (UnityWebRequest www = UnityWebRequest.Post($"{BASE_URL}/files", formData))
        {
            www.SetRequestHeader("Authorization", $"Bearer {API_KEY}");

            yield return www.SendWebRequest();

            if (www.result == UnityWebRequest.Result.Success)
            {
                string response = www.downloadHandler.text;
                Debug.Log($"Scan complete: {response}");

                // Parse the response
                var result = JsonUtility.FromJson<ScanResult>(response);
                Debug.Log($"Risk Score: {result.score}/100");
                Debug.Log($"File Hash: {result.hash}");
            }
            else
            {
                Debug.LogError($"Scan failed: {www.error}");
                Debug.LogError($"Response: {www.downloadHandler.text}");
            }
        }
    }
}

[System.Serializable]
public class ScanResult
{
    public string fileName;
    public string hash;
    public int score;
    public bool isNew;
    public string message;
}

// Usage in Unturned plugin:
// StartCoroutine(ScanPlugin("./Plugins/MyPlugin.dll"));`;

const curlExample = `curl -X POST ${API_BASE_URL}/v1.0/files \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/your/plugin.dll" \\
  -F "forceAnalyze=false"`;

const jsExample = `const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function scanFile(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('forceAnalyze', 'false');

    const response = await fetch(\`\${API_BASE_URL}/v1.0/files\`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: form
    });

    const result = await response.json();
    console.log('Scan result:', result);
    console.log(\`Risk score: \${result.score}/100\`);

    return result;
}

scanFile('./MyPlugin.dll');`;

const pythonExample = `import requests

def scan_file(file_path):
    url = '${API_BASE_URL}/v1.0/files'
    headers = {
        'Authorization': 'Bearer YOUR_API_KEY'
    }

    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'forceAnalyze': 'false'}

        response = requests.post(url, headers=headers, files=files, data=data)
        result = response.json()

        print(f"Scan result: {result}")
        print(f"Risk score: {result['score']}/100")

        return result

scan_file('./MyPlugin.dll')`;

const csharpExample = `using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

public class SafeturnedClient
{
    private readonly HttpClient _client;

    public SafeturnedClient(string apiKey)
    {
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);
    }

    public async Task<string> ScanFileAsync(string filePath)
    {
        using var form = new MultipartFormDataContent();
        using var fileStream = File.OpenRead(filePath);
        using var fileContent = new StreamContent(fileStream);

        form.Add(fileContent, "file", Path.GetFileName(filePath));
        form.Add(new StringContent("false"), "forceAnalyze");

        var response = await _client.PostAsync(
            "${API_BASE_URL}/v1.0/files", form);

        var result = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Scan result: {result}");

        return result;
    }
}

var client = new SafeturnedClient("YOUR_API_KEY");
await client.ScanFileAsync("./MyPlugin.dll");`;

const responseExample = `{
  "fileName": "MyPlugin.dll",
  "hash": "a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  "score": 15,
  "isNew": true,
  "message": "New file processed successfully",
  "uploadedAt": "2025-01-12T14:30:00Z",
  "lastScanned": "2025-01-12T14:30:00Z",
  "fileSizeBytes": 245760
}`;

const errorExample401 = `{
  "error": "Unauthorized",
  "message": "Valid API key required. Use 'Authorization: Bearer sk_live_...' header."
}`;

const errorExample429 = `{
  "error": "Rate limit exceeded",
  "message": "You have exceeded the read operation rate limit of 500 requests per hour.",
  "retryAfter": 1800,
  "limit": 500,
  "remaining": 0,
  "operationTier": "Read",
  "userTier": "Free"
}`;

const chunkedUploadCSharpExample = `using System;
using System.Collections;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

[Serializable]
public class InitiateUploadRequest
{
    public string fileName;
    public long fileSizeBytes;
    public string fileHash;
    public int totalChunks;
}

[Serializable]
public class InitiateUploadResponse
{
    public string sessionId;
    public string message;
}

[Serializable]
public class FinalizeUploadRequest
{
    public string sessionId;
}

public class ChunkedUploader : MonoBehaviour
{
    private const int ChunkSize = 5 * 1024 * 1024; // 5MB
    private string _apiKey;

    public void Initialize(string apiKey)
    {
        _apiKey = apiKey;
    }

    public void UploadLargeFile(string filePath)
    {
        StartCoroutine(UploadLargeFileCoroutine(filePath));
    }

    private IEnumerator UploadLargeFileCoroutine(string filePath)
    {
        byte[] fileBytes = File.ReadAllBytes(filePath);
        string fileName = Path.GetFileName(filePath);
        string fileHash = ComputeFileHash(fileBytes);
        int totalChunks = Mathf.CeilToInt((float)fileBytes.Length / ChunkSize);

        // Step 1: Initiate upload
        var initRequest = new InitiateUploadRequest
        {
            fileName = fileName,
            fileSizeBytes = fileBytes.Length,
            fileHash = fileHash,
            totalChunks = totalChunks
        };

        string initJson = JsonUtility.ToJson(initRequest);
        using (UnityWebRequest www = UnityWebRequest.Post(
            "${API_BASE_URL}/v1.0/files/upload/initiate", initJson, "application/json"))
        {
            www.SetRequestHeader("Authorization", "Bearer " + _apiKey);
            yield return www.SendWebRequest();

            if (www.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError("Initiate failed: " + www.error);
                yield break;
            }

            var response = JsonUtility.FromJson<InitiateUploadResponse>(www.downloadHandler.text);
            string sessionId = response.sessionId;

            // Step 2: Upload chunks
            for (int i = 0; i < totalChunks; i++)
            {
                int offset = i * ChunkSize;
                int chunkLength = Mathf.Min(ChunkSize, fileBytes.Length - offset);
                byte[] chunk = new byte[chunkLength];
                Array.Copy(fileBytes, offset, chunk, 0, chunkLength);

                WWWForm form = new WWWForm();
                form.AddField("sessionId", sessionId);
                form.AddField("chunkIndex", i);
                form.AddBinaryData("chunk", chunk, fileName);

                using (UnityWebRequest chunkWww = UnityWebRequest.Post(
                    "${API_BASE_URL}/v1.0/files/upload/chunk", form))
                {
                    chunkWww.SetRequestHeader("Authorization", "Bearer " + _apiKey);
                    yield return chunkWww.SendWebRequest();

                    if (chunkWww.result != UnityWebRequest.Result.Success)
                    {
                        Debug.LogError($"Chunk {i + 1} failed: " + chunkWww.error);
                        yield break;
                    }

                    Debug.Log($"Uploaded chunk {i + 1}/{totalChunks}");
                }
            }

            // Step 3: Finalize upload
            var finalizeRequest = new FinalizeUploadRequest { sessionId = sessionId };
            string finalizeJson = JsonUtility.ToJson(finalizeRequest);

            using (UnityWebRequest finalizeWww = UnityWebRequest.Post(
                "${API_BASE_URL}/v1.0/files/upload/complete", finalizeJson, "application/json"))
            {
                finalizeWww.SetRequestHeader("Authorization", "Bearer " + _apiKey);
                yield return finalizeWww.SendWebRequest();

                if (finalizeWww.result != UnityWebRequest.Result.Success)
                {
                    Debug.LogError("Finalize failed: " + finalizeWww.error);
                    yield break;
                }

                Debug.Log("Upload completed: " + finalizeWww.downloadHandler.text);
            }
        }
    }

    private string ComputeFileHash(byte[] fileBytes)
    {
        using (SHA256 sha256 = SHA256.Create())
        {
            byte[] hash = sha256.ComputeHash(fileBytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }
}

// Usage:
// ChunkedUploader uploader = gameObject.AddComponent<ChunkedUploader>();
// uploader.Initialize("YOUR_API_KEY");
// uploader.UploadLargeFile("path/to/LargePlugin.dll");`;

const chunkedUploadCSharpNetExample = `using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;

public class ChunkedUploadClient
{
    private const int ChunkSize = 5 * 1024 * 1024; // 5MB
    private readonly HttpClient _client;
    private readonly string _baseUrl;

    public ChunkedUploadClient(string apiKey, string baseUrl = "${API_BASE_URL}")
    {
        _baseUrl = baseUrl;
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);
    }

    public async Task UploadLargeFileAsync(string filePath)
    {
        var fileInfo = new FileInfo(filePath);
        var fileBytes = await File.ReadAllBytesAsync(filePath);
        var fileHash = ComputeFileHash(fileBytes);
        var totalChunks = (int)Math.Ceiling((double)fileBytes.Length / ChunkSize);

        // Step 1: Initiate upload
        var initRequest = new
        {
            fileName = Path.GetFileName(filePath),
            fileSizeBytes = fileBytes.Length,
            fileHash = fileHash,
            totalChunks = totalChunks
        };

        var initResponse = await _client.PostAsJsonAsync(
            $"{_baseUrl}/v1.0/files/upload/initiate",
            initRequest);

        var initContent = await initResponse.Content.ReadAsStringAsync();
        var initResult = JsonSerializer.Deserialize<JsonElement>(initContent);
        var sessionId = initResult.GetProperty("sessionId").GetString();

        // Step 2: Upload chunks
        for (int i = 0; i < totalChunks; i++)
        {
            int offset = i * ChunkSize;
            int chunkLength = Math.Min(ChunkSize, fileBytes.Length - offset);
            byte[] chunk = new byte[chunkLength];
            Array.Copy(fileBytes, offset, chunk, 0, chunkLength);

            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(sessionId), "sessionId");
            form.Add(new StringContent(i.ToString()), "chunkIndex");
            form.Add(
                new ByteArrayContent(chunk),
                "chunk",
                Path.GetFileName(filePath));

            var response = await _client.PostAsync(
                $"{_baseUrl}/v1.0/files/upload/chunk",
                form);

            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"Chunk {i + 1} failed: {response.StatusCode}");
            }
        }

        // Step 3: Finalize upload
        var finalizeRequest = new { sessionId = sessionId };
        var finalResponse = await _client.PostAsJsonAsync(
            $"{_baseUrl}/v1.0/files/upload/finalize",
            finalizeRequest);

        var finalContent = await finalResponse.Content.ReadAsStringAsync();
        Console.WriteLine("Upload completed: " + finalContent);
    }

    private string ComputeFileHash(byte[] fileBytes)
    {
        using (var sha256 = SHA256.Create())
        {
            var hash = sha256.ComputeHash(fileBytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }
}

// Usage:
// var client = new ChunkedUploadClient("YOUR_API_KEY");
// await client.UploadLargeFileAsync("path/to/LargePlugin.dll");`;

const chunkedUploadJsExample = `const fs = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');
const fetch = require('node-fetch');

const CHUNK_SIZE = 5 * 1024 * 1024;

async function computeFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

async function uploadLargeFile(filePath, apiKey) {
    const stats = fs.statSync(filePath);
    const fileHash = await computeFileHash(filePath);
    const totalChunks = Math.ceil(stats.size / CHUNK_SIZE);

    const initResponse = await fetch(\`${API_BASE_URL}/v1.0/files/upload/initiate\`, {
        method: 'POST',
        headers: {
            'Authorization': \`Bearer \${apiKey}\`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileName: filePath.split('/').pop(),
            fileSizeBytes: stats.size,
            fileHash: fileHash,
            totalChunks: totalChunks
        })
    });

    const { sessionId } = await initResponse.json();

    const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
    let chunkIndex = 0;

    for await (const chunk of fileStream) {
        const form = new FormData();
        form.append('sessionId', sessionId);
        form.append('chunkIndex', chunkIndex.toString());
        form.append('chunk', chunk, { filename: filePath.split('/').pop() });

        await fetch(\`${API_BASE_URL}/v1.0/files/upload/chunk\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${apiKey}\` },
            body: form
        });

        console.log(\`Uploaded chunk \${chunkIndex + 1}/\${totalChunks}\`);
        chunkIndex++;
    }

    const finalizeResponse = await fetch(\`${API_BASE_URL}/v1.0/files/upload/complete\`, {
        method: 'POST',
        headers: {
            'Authorization': \`Bearer \${apiKey}\`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId })
    });

    return await finalizeResponse.json();
}

uploadLargeFile('./LargePlugin.dll', 'YOUR_API_KEY');`;

const chunkedUploadPythonExample = `import os
import hashlib
import requests
import math

CHUNK_SIZE = 5 * 1024 * 1024  # 5MB

def compute_file_hash(file_path):
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def upload_large_file(file_path, api_key):
    file_size = os.path.getsize(file_path)
    file_hash = compute_file_hash(file_path)
    total_chunks = math.ceil(file_size / CHUNK_SIZE)

    headers = {'Authorization': f'Bearer {api_key}'}

    # Step 1: Initiate upload
    init_response = requests.post(
        '${API_BASE_URL}/v1.0/files/upload/initiate',
        headers=headers,
        json={
            'fileName': os.path.basename(file_path),
            'fileSizeBytes': file_size,
            'fileHash': file_hash,
            'totalChunks': total_chunks
        }
    )
    session_id = init_response.json()['sessionId']

    # Step 2: Upload chunks
    with open(file_path, 'rb') as f:
        for chunk_index in range(total_chunks):
            chunk_data = f.read(CHUNK_SIZE)

            files = {'chunk': (os.path.basename(file_path), chunk_data)}
            data = {
                'sessionId': session_id,
                'chunkIndex': str(chunk_index)
            }

            requests.post(
                '${API_BASE_URL}/v1.0/files/upload/chunk',
                headers=headers,
                files=files,
                data=data
            )

            print(f'Uploaded chunk {chunk_index + 1}/{total_chunks}')

    # Step 3: Complete upload
    finalize_response = requests.post(
        '${API_BASE_URL}/v1.0/files/upload/complete',
        headers=headers,
        json={'sessionId': session_id}
    )

    return finalize_response.json()

result = upload_large_file('./LargePlugin.dll', 'YOUR_API_KEY')
print(f"Upload result: {result}")`;

const chunkedUploadCurlExample = `#!/bin/bash

API_KEY="YOUR_API_KEY"
FILE_PATH="./LargePlugin.dll"
CHUNK_SIZE=5242880  # 5MB
API_BASE="${API_BASE_URL}/v1.0/files/upload"

# Compute file hash
FILE_HASH=$(sha256sum "$FILE_PATH" | awk '{print $1}')
FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH")
FILE_NAME=$(basename "$FILE_PATH")
TOTAL_CHUNKS=$(( ($FILE_SIZE + $CHUNK_SIZE - 1) / $CHUNK_SIZE ))

# Step 1: Initiate upload
echo "Initiating chunked upload..."
INIT_RESPONSE=$(curl -s -X POST "$API_BASE/initiate" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"fileName\\": \\"$FILE_NAME\\",
    \\"fileSizeBytes\\": $FILE_SIZE,
    \\"fileHash\\": \\"$FILE_HASH\\",
    \\"totalChunks\\": $TOTAL_CHUNKS
  }")

SESSION_ID=$(echo "$INIT_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "Session ID: $SESSION_ID"

# Step 2: Upload chunks
for ((i=0; i<$TOTAL_CHUNKS; i++)); do
    OFFSET=$((i * CHUNK_SIZE))
    echo "Uploading chunk $((i+1))/$TOTAL_CHUNKS..."

    dd if="$FILE_PATH" bs=$CHUNK_SIZE skip=$i count=1 2>/dev/null | \\
    curl -s -X POST "$API_BASE/chunk" \\
      -H "Authorization: Bearer $API_KEY" \\
      -F "sessionId=$SESSION_ID" \\
      -F "chunkIndex=$i" \\
      -F "chunk=@-;filename=$FILE_NAME"
done

# Step 3: Complete upload
echo "Completing upload..."
curl -X POST "$API_BASE/complete" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{\\"sessionId\\": \\"$SESSION_ID\\"}"`;
