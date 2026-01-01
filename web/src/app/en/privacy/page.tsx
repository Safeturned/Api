'use client';

import Navigation from '../../../components/Navigation';
import Footer from '../../../components/Footer';

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
                                2. Information We Do NOT Collect
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Important: We do NOT store your plugin files
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Plugin files (.dll)</strong> - Files are processed
                                        in memory and immediately discarded
                                    </li>
                                    <li>
                                        <strong>File content</strong> - We never store the actual
                                        code or content of your plugins
                                    </li>
                                    <li>
                                        <strong>Personal information</strong> - No names, emails,
                                        addresses, or personal identifiers
                                    </li>
                                    <li>
                                        <strong>User accounts</strong> - No registration or login
                                        required
                                    </li>
                                    <li>
                                        <strong>IP addresses</strong> - Only used temporarily for
                                        rate limiting, not stored
                                    </li>
                                </ul>
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
                                    <strong>No file storage</strong> - Plugin files are never saved
                                    to disk
                                </li>
                                <li>
                                    <strong>Memory-only processing</strong> - Files are processed in
                                    RAM and immediately discarded
                                </li>
                                <li>
                                    <strong>Encrypted transmission</strong> - All data is
                                    transmitted over HTTPS
                                </li>
                                <li>
                                    <strong>Database security</strong> - Only metadata is stored in
                                    secure databases
                                </li>
                                <li>
                                    <strong>Log filtering</strong> - File uploads are filtered from
                                    error logs
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Data Retention
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>File metadata</strong> - Retained indefinitely for
                                    duplicate detection and analytics
                                </li>
                                <li>
                                    <strong>Scan records</strong> - Retained for service improvement
                                    and analytics
                                </li>
                                <li>
                                    <strong>Analytics data</strong> - Aggregated statistics retained
                                    for service optimization
                                </li>
                                <li>
                                    <strong>Plugin files</strong> - Never stored, immediately
                                    discarded after analysis
                                </li>
                            </ul>
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

            <Footer />
        </div>
    );
}
