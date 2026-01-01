'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';

export default function PrivacyPage() {
    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col'>
            <Navigation />

            <div className='flex-1 max-w-5xl mx-auto px-6 py-12 relative z-1 w-full'>
                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-2xl p-8 md:p-12 shadow-2xl'>
                    <div className='mb-10'>
                        <h1 className='text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pb-1 leading-tight'>
                            Privacy Notice
                        </h1>
                        <p className='text-slate-400 text-sm'>Last updated: November 2025</p>
                    </div>

                    <div className='space-y-6 text-gray-300'>
                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                1. Introduction
                            </h2>
                            <p>
                                This Privacy Notice explains how Safeturned collects, uses, and
                                protects your information when you use our security analysis
                                service. We are committed to protecting your privacy and being
                                transparent about our data practices.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                2. Information We Do NOT Permanently Store
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Important: We do NOT permanently store your plugin files
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Plugin file content</strong> - We never permanently
                                        store the actual code or content of your plugins
                                    </li>
                                    <li>
                                        <strong>Personal information in files</strong> - We do not
                                        extract or store personal data from file contents
                                    </li>
                                    <li>
                                        <strong>IP addresses</strong> - Only used temporarily for
                                        rate limiting via Redis cache (expires after 1 hour)
                                    </li>
                                </ul>
                                <div className='mt-3 pt-3 border-t border-red-500/20'>
                                    <p className='text-sm text-yellow-300 mb-3'>
                                        <strong>Note on website uploads:</strong> Files uploaded
                                        through the website are temporarily stored in server memory
                                        for 24 hours to enable the reanalysis feature. This allows
                                        you to rescan files with updated security checks without
                                        re-uploading. Files are automatically deleted after 24 hours
                                        or when total memory usage exceeds 10GB. Oldest files are
                                        deleted first to protect server resources.
                                    </p>
                                    <p className='text-sm text-yellow-300'>
                                        <strong>Note on large files (&gt;100MB):</strong> Large
                                        files are temporarily stored in encrypted chunks during
                                        upload and processing. All chunks are automatically deleted
                                        after analysis completes or if the upload session expires
                                        (24 hours maximum).
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. Information We DO Collect
                            </h2>
                            <div className='bg-green-900/20 border border-green-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-green-300 mb-2'>
                                    File Metadata (for analysis purposes)
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>File hash</strong> - SHA-256 hash to identify
                                        duplicate files
                                    </li>
                                    <li>
                                        <strong>File name</strong> - Original filename for reference
                                    </li>
                                    <li>
                                        <strong>File size</strong> - Size in bytes for analysis
                                    </li>
                                    <li>
                                        <strong>Detection type</strong> - Type of file detected
                                        (e.g., &ldquo;Assembly&rdquo;)
                                    </li>
                                    <li>
                                        <strong>Scan results</strong> - Security score and threat
                                        detection results
                                    </li>
                                    <li>
                                        <strong>Scan timestamps</strong> - When the file was first
                                        and last scanned
                                    </li>
                                    <li>
                                        <strong>Scan count</strong> - How many times the file has
                                        been analyzed
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Analytics Data We Collect
                            </h2>
                            <p>
                                We collect aggregated analytics data to improve our service and
                                understand usage patterns:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Total files scanned</strong> - Number of files processed
                                </li>
                                <li>
                                    <strong>Threat detection statistics</strong> - Number of threats
                                    detected vs safe files
                                </li>
                                <li>
                                    <strong>Scan performance metrics</strong> - Average scan time
                                    and processing statistics
                                </li>
                                <li>
                                    <strong>Average scan time</strong> - Service performance metrics
                                </li>
                                <li>
                                    <strong>Average security scores</strong> - Overall security
                                    trends
                                </li>
                                <li>
                                    <strong>Scan date ranges</strong> - First and last scan dates
                                    for analytics
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. How We Use Your Information
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Security Analysis</strong> - To provide plugin security
                                    scanning services
                                </li>
                                <li>
                                    <strong>Service Improvement</strong> - To enhance our detection
                                    algorithms and performance
                                </li>
                                <li>
                                    <strong>Duplicate Detection</strong> - To avoid re-analyzing the
                                    same files
                                </li>
                                <li>
                                    <strong>Rate Limiting</strong> - To prevent abuse and ensure
                                    fair usage
                                </li>
                                <li>
                                    <strong>Error Monitoring</strong> - To identify and fix
                                    technical issues (no file content included)
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. Data Protection
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>No permanent file storage</strong> - Plugin file content
                                    is never permanently saved
                                </li>
                                <li>
                                    <strong>Memory-only processing (small files)</strong> - Files
                                    under 100MB are processed in RAM and immediately discarded
                                </li>
                                <li>
                                    <strong>Chunked upload security (large files)</strong> - Files
                                    over 100MB use encrypted chunks with automatic cleanup. All
                                    chunks are deleted after analysis or session expiration
                                </li>
                                <li>
                                    <strong>Encrypted transmission</strong> - All data is
                                    transmitted over HTTPS
                                </li>
                                <li>
                                    <strong>Distributed rate limiting</strong> - Redis-based rate
                                    limiting protects against abuse while persisting limits across
                                    server restarts
                                </li>
                                <li>
                                    <strong>Database security</strong> - Only metadata is stored in
                                    secure databases, never file content
                                </li>
                                <li>
                                    <strong>Log filtering</strong> - File uploads and sensitive data
                                    are filtered from error logs
                                </li>
                                <li>
                                    <strong>Automatic cleanup</strong> - Temporary files and cache
                                    entries expire automatically (chunks: 24h, rate limits: 1h)
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Data Retention
                            </h2>
                            <div className='space-y-3'>
                                <div>
                                    <h4 className='font-semibold text-purple-200 mb-2'>
                                        Permanent Storage:
                                    </h4>
                                    <ul className='list-disc list-inside space-y-1 ml-4'>
                                        <li>
                                            <strong>File metadata</strong> - Retained indefinitely
                                            for duplicate detection and analytics
                                        </li>
                                        <li>
                                            <strong>Scan records</strong> - Retained for service
                                            improvement and analytics
                                        </li>
                                        <li>
                                            <strong>Analytics data</strong> - Aggregated statistics
                                            retained for service optimization
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className='font-semibold text-purple-200 mb-2'>
                                        Temporary Storage (Auto-Deleted):
                                    </h4>
                                    <ul className='list-disc list-inside space-y-1 ml-4'>
                                        <li>
                                            <strong>File chunks</strong> - Deleted immediately after
                                            analysis or after 24 hours (whichever comes first)
                                        </li>
                                        <li>
                                            <strong>Upload sessions</strong> - Expire after 24 hours
                                            of inactivity
                                        </li>
                                        <li>
                                            <strong>Rate limit data</strong> - Stored in Redis
                                            cache, expires after 1 hour
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className='font-semibold text-purple-200 mb-2'>
                                        Never Stored:
                                    </h4>
                                    <ul className='list-disc list-inside space-y-1 ml-4'>
                                        <li>
                                            <strong>Plugin file content</strong> - Never permanently
                                            stored, immediately discarded after analysis
                                        </li>
                                        <li>
                                            <strong>Small files (&lt;100MB)</strong> - Processed
                                            entirely in memory, never written to disk
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                8. Data Sharing
                            </h2>
                            <p>
                                We do not sell, trade, or otherwise transfer your information to
                                third parties. We may share:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Aggregated analytics</strong> - Public statistics (no
                                    individual file data)
                                </li>
                                <li>
                                    <strong>Service providers</strong> - Only for technical
                                    infrastructure (no file content)
                                </li>
                                <li>
                                    <strong>Legal requirements</strong> - Only if required by law
                                    (extremely unlikely given our data practices)
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Your Rights
                            </h2>
                            <p>
                                Since we don&apos;t collect personal information, traditional
                                privacy rights don&apos;t apply. However, you can:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Stop using the service</strong> - No account required,
                                    simply stop uploading files
                                </li>
                                <li>
                                    <strong>Contact us</strong> - For questions about our privacy
                                    practices
                                </li>
                                <li>
                                    <strong>Review our code</strong> - All code is open source and
                                    publicly available
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Open Source Transparency
                            </h2>
                            <p>Safeturned is completely open source. You can:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Review our code</strong> - All source code is publicly
                                    available on GitHub
                                </li>
                                <li>
                                    <strong>Verify our practices</strong> - Check our actual data
                                    handling implementation
                                </li>
                                <li>
                                    <strong>Contribute</strong> - Help improve our privacy and
                                    security practices
                                </li>
                                <li>
                                    <strong>Self-host</strong> - Run your own instance if you prefer
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                11. Changes to This Notice
                            </h2>
                            <p>
                                We may update this Privacy Notice from time to time. Changes will be
                                posted on this page with an updated date. Your continued use of the
                                service constitutes acceptance of the updated notice.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Contact Information
                            </h2>
                            <p>
                                If you have any questions about this Privacy Notice or our data
                                practices, please contact us through our GitHub repository or other
                                official channels.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
            <BackToTop />
            <Footer />
        </div>
    );
}
