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
                        <p className='text-slate-400 text-sm'>Last updated: January 2026</p>
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
                                2. Account Information We Collect
                            </h2>
                            <p className='mb-4'>
                                When you create an account using Discord or Steam authentication, we collect:
                            </p>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 mb-4'>
                                <h3 className='font-semibold text-slate-200 mb-2'>
                                    Discord Authentication
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>Discord ID</strong> - Your unique Discord identifier</li>
                                    <li><strong>Email address</strong> - From your Discord account</li>
                                    <li><strong>Username</strong> - Your Discord username</li>
                                    <li><strong>Avatar URL</strong> - Link to your Discord profile picture</li>
                                </ul>
                            </div>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-slate-200 mb-2'>
                                    Steam Authentication
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>Steam ID</strong> - Your unique Steam identifier</li>
                                    <li><strong>Username</strong> - Your Steam display name</li>
                                    <li><strong>Avatar URL</strong> - Link to your Steam profile picture</li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. File Analysis Data
                            </h2>
                            <div className='bg-green-900/20 border border-green-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-green-300 mb-2'>
                                    File Metadata We Store
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>File hash</strong> - SHA-256 hash to identify files</li>
                                    <li><strong>File name</strong> - Original filename</li>
                                    <li><strong>File size</strong> - Size in bytes</li>
                                    <li><strong>Detection type</strong> - Type of file detected</li>
                                    <li><strong>Scan results</strong> - Security score and threat detection</li>
                                    <li><strong>Scan timestamps</strong> - When the file was scanned</li>
                                    <li><strong>Scan count</strong> - Number of times analyzed</li>
                                </ul>
                            </div>
                            <div className='bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4'>
                                <h3 className='font-semibold text-yellow-300 mb-2'>
                                    Assembly Metadata Extracted
                                </h3>
                                <p className='mb-2'>For .dll and .exe files, we extract and store:</p>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>Company name</strong> - From assembly attributes</li>
                                    <li><strong>Product name</strong> - From assembly attributes</li>
                                    <li><strong>Title</strong> - Assembly title</li>
                                    <li><strong>GUID</strong> - Assembly identifier</li>
                                    <li><strong>Copyright</strong> - Copyright information</li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Plugin Files
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Important: File Handling
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Temporary storage</strong> - Files are temporarily stored
                                        during the upload and analysis process
                                    </li>
                                    <li>
                                        <strong>Automatic deletion</strong> - Files are deleted after
                                        analysis is complete
                                    </li>
                                    <li>
                                        <strong>No permanent storage</strong> - We do not permanently
                                        store the actual file content
                                    </li>
                                    <li>
                                        <strong>Metadata only</strong> - Only metadata and analysis
                                        results are retained
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. IP Addresses
                            </h2>
                            <p className='mb-4'>
                                We collect and store IP addresses in the following contexts:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Authentication tokens</strong> - IP address recorded when
                                    tokens are created
                                </li>
                                <li>
                                    <strong>Analysis jobs</strong> - IP address of the client requesting
                                    file analysis
                                </li>
                                <li>
                                    <strong>API usage logs</strong> - IP address for usage tracking and
                                    abuse prevention
                                </li>
                                <li>
                                    <strong>Rate limiting</strong> - IP-based rate limiting to prevent abuse
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. API Keys
                            </h2>
                            <p className='mb-4'>
                                When you generate API keys, we store:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Hashed key</strong> - API keys are hashed and never stored
                                    in plain text
                                </li>
                                <li>
                                    <strong>Key metadata</strong> - Name, prefix, creation date,
                                    expiration date
                                </li>
                                <li>
                                    <strong>Scopes</strong> - Permissions assigned to the key
                                </li>
                                <li>
                                    <strong>IP whitelist</strong> - If configured, allowed IP addresses
                                </li>
                                <li>
                                    <strong>Usage statistics</strong> - Request counts, endpoints accessed,
                                    response times
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Cookies and Authentication
                            </h2>
                            <p className='mb-4'>
                                We use the following cookies for authentication:
                            </p>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4'>
                                <ul className='list-disc list-inside space-y-2 ml-4'>
                                    <li>
                                        <strong>access_token</strong> - JWT authentication token
                                        (HTTP-only, 1 year expiry)
                                    </li>
                                    <li>
                                        <strong>refresh_token</strong> - Session refresh token
                                        (HTTP-only, 1 year expiry)
                                    </li>
                                    <li>
                                        <strong>safeturned_oauth</strong> - OAuth state parameter
                                        (temporary, for login flow)
                                    </li>
                                </ul>
                            </div>
                            <p className='mt-4 text-sm text-slate-400'>
                                All authentication cookies are HTTP-only and cannot be accessed by
                                JavaScript for security purposes.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                8. Third-Party Services
                            </h2>
                            <p className='mb-4'>
                                We use the following third-party services:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Sentry</strong> - Error tracking and monitoring. Receives
                                    error messages, stack traces, and application versions. No file
                                    content is sent.
                                </li>
                                <li>
                                    <strong>Discord API</strong> - Used only for authentication.
                                    We request your Discord ID, email, username, and avatar.
                                </li>
                                <li>
                                    <strong>Steam API</strong> - Used only for authentication.
                                    We request your Steam ID, username, and avatar.
                                </li>
                                <li>
                                    <strong>GitHub</strong> - Webhook processing for software releases
                                    and updates.
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Discord Bot Data
                            </h2>
                            <p className='mb-4'>
                                If you use our Discord bot, we store:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Server ID</strong> - Discord server identifier where the
                                    bot is configured
                                </li>
                                <li>
                                    <strong>API key association</strong> - Encrypted reference to the
                                    API key configured for the server
                                </li>
                                <li>
                                    <strong>Configuration settings</strong> - Bot settings for the server
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Analytics Data
                            </h2>
                            <p className='mb-4'>
                                We collect aggregated analytics to improve our service:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li><strong>Total files scanned</strong> - Number of files processed</li>
                                <li><strong>Threat statistics</strong> - Detection rates and patterns</li>
                                <li><strong>Performance metrics</strong> - Scan times and processing stats</li>
                                <li><strong>Average security scores</strong> - Overall trends</li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                11. How We Use Your Information
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Security Analysis</strong> - To provide plugin security
                                    scanning services
                                </li>
                                <li>
                                    <strong>Account Management</strong> - To manage your account and
                                    authentication
                                </li>
                                <li>
                                    <strong>Service Improvement</strong> - To enhance our detection
                                    algorithms and performance
                                </li>
                                <li>
                                    <strong>Rate Limiting</strong> - To prevent abuse and ensure fair usage
                                </li>
                                <li>
                                    <strong>Error Monitoring</strong> - To identify and fix technical issues
                                </li>
                                <li>
                                    <strong>Communication</strong> - To notify you about service updates
                                    if applicable
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Data Protection
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Encryption in transit</strong> - All data transmitted over HTTPS
                                </li>
                                <li>
                                    <strong>Hashed credentials</strong> - API keys are hashed, never
                                    stored in plain text
                                </li>
                                <li>
                                    <strong>HTTP-only cookies</strong> - Authentication tokens cannot be
                                    accessed by JavaScript
                                </li>
                                <li>
                                    <strong>Database security</strong> - Data stored in secure databases
                                    with access controls
                                </li>
                                <li>
                                    <strong>OAuth security</strong> - Industry-standard OAuth 2.0 for
                                    authentication
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                13. Data Retention
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Account data</strong> - Retained until you delete your account
                                </li>
                                <li>
                                    <strong>File metadata</strong> - Retained indefinitely for duplicate
                                    detection and analytics
                                </li>
                                <li>
                                    <strong>Scan records</strong> - Retained for service improvement
                                </li>
                                <li>
                                    <strong>API usage logs</strong> - Retained for analytics and abuse
                                    prevention
                                </li>
                                <li>
                                    <strong>Plugin files</strong> - Deleted after analysis, not permanently
                                    stored
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                14. Data Sharing
                            </h2>
                            <p className='mb-4'>
                                We do not sell, trade, or otherwise transfer your personal information
                                to third parties. We may share:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Aggregated analytics</strong> - Public statistics with no
                                    individual data
                                </li>
                                <li>
                                    <strong>Service providers</strong> - Technical infrastructure providers
                                    (no file content)
                                </li>
                                <li>
                                    <strong>Legal requirements</strong> - Only if required by law
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                15. Your Rights
                            </h2>
                            <p className='mb-4'>You have the right to:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Access your data</strong> - Request information about what
                                    data we hold about you
                                </li>
                                <li>
                                    <strong>Delete your account</strong> - Request deletion of your
                                    account and associated data
                                </li>
                                <li>
                                    <strong>Unlink providers</strong> - Remove connected Discord or
                                    Steam accounts
                                </li>
                                <li>
                                    <strong>Revoke API keys</strong> - Delete any API keys you have created
                                </li>
                                <li>
                                    <strong>Stop using the service</strong> - You can stop using the
                                    service at any time
                                </li>
                                <li>
                                    <strong>Contact us</strong> - For questions about our privacy practices
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                16. Open Source Transparency
                            </h2>
                            <p>Safeturned is open source. You can:</p>
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
                                17. Changes to This Notice
                            </h2>
                            <p>
                                We may update this Privacy Notice from time to time. Changes will be
                                posted on this page with an updated date. Your continued use of the
                                service constitutes acceptance of the updated notice.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                18. Contact Information
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
