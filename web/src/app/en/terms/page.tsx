'use client';

import Navigation from '../../../components/Navigation';
import Footer from '../../../components/Footer';

export default function TermsPage() {
    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col'>
            <Navigation />

            <div className='flex-1 max-w-5xl mx-auto px-6 py-12 relative z-1 w-full'>
                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-2xl p-8 md:p-12 shadow-2xl'>
                    <div className='mb-10'>
                        <h1 className='text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pb-1 leading-tight'>
                            Terms of Service
                        </h1>
                        <p className='text-slate-400 text-sm'>Last updated: January 2026</p>
                    </div>

                    <div className='space-y-6 text-gray-300'>
                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                1. Acceptance of Terms
                            </h2>
                            <p>
                                By accessing and using Safeturned, you accept and agree to be bound
                                by the terms and provision of this agreement. If you do not agree to
                                abide by the above, please do not use this service.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                2. Description of Service
                            </h2>
                            <p className='mb-4'>
                                Safeturned is a security analysis service that scans plugin files
                                (.dll and .exe) for potential backdoors, trojans, and other malicious
                                components. The service provides automated code analysis and threat
                                detection for Unturned server plugins.
                            </p>
                            <p>Our service includes:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4 mt-2'>
                                <li>
                                    <strong>Web Interface</strong> - Upload and scan files through our website
                                </li>
                                <li>
                                    <strong>API Access</strong> - Programmatic access for automated scanning
                                </li>
                                <li>
                                    <strong>Discord Bot</strong> - Scan files directly within Discord servers
                                </li>
                                <li>
                                    <strong>Badge System</strong> - Verification badges for scanned plugins
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. User Accounts
                            </h2>
                            <p className='mb-4'>
                                To access certain features, you must create an account using Discord
                                or Steam authentication.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Account Creation</strong> - Accounts are created automatically
                                    upon first login via Discord or Steam OAuth
                                </li>
                                <li>
                                    <strong>Account Linking</strong> - You may link multiple authentication
                                    providers to a single account
                                </li>
                                <li>
                                    <strong>Account Security</strong> - You are responsible for maintaining
                                    the security of your linked Discord and Steam accounts
                                </li>
                                <li>
                                    <strong>Accurate Information</strong> - Account information is pulled
                                    from your OAuth provider and should be accurate
                                </li>
                                <li>
                                    <strong>Account Deletion</strong> - You may request account deletion
                                    at any time
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Subscription Tiers
                            </h2>
                            <p className='mb-4'>
                                Safeturned offers different service tiers with varying rate limits
                                and features:
                            </p>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4'>
                                <ul className='list-disc list-inside space-y-2 ml-4'>
                                    <li>
                                        <strong>Free</strong> - Basic access with standard rate limits
                                    </li>
                                    <li>
                                        <strong>Verified</strong> - Increased rate limits and priority support
                                    </li>
                                    <li>
                                        <strong>Premium</strong> - Higher rate limits and additional features
                                    </li>
                                    <li>
                                        <strong>Bot</strong> - Highest rate limits for automated integrations
                                    </li>
                                </ul>
                            </div>
                            <p className='mt-4 text-sm text-slate-400'>
                                Tier upgrades are currently assigned manually. Payment integration
                                may be added in the future.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. API Access
                            </h2>
                            <p className='mb-4'>
                                Registered users may generate API keys for programmatic access to our
                                services.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>API Keys</strong> - You may generate API keys up to your
                                    tier limit (3-10 keys depending on tier)
                                </li>
                                <li>
                                    <strong>Key Security</strong> - You are responsible for keeping your
                                    API keys secure and confidential
                                </li>
                                <li>
                                    <strong>Scopes</strong> - API keys have configurable permission scopes
                                </li>
                                <li>
                                    <strong>IP Whitelisting</strong> - You may restrict API key usage to
                                    specific IP addresses
                                </li>
                                <li>
                                    <strong>Usage Limits</strong> - API requests are subject to rate limits
                                    based on your tier
                                </li>
                                <li>
                                    <strong>Revocation</strong> - We may revoke API keys that violate our
                                    terms or are used abusively
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. Discord Bot
                            </h2>
                            <p className='mb-4'>
                                Our Discord bot allows file scanning directly within Discord servers.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Server Configuration</strong> - Server administrators must
                                    configure an API key for the bot to function
                                </li>
                                <li>
                                    <strong>Rate Limits</strong> - Bot usage is subject to the rate limits
                                    of the configured API key
                                </li>
                                <li>
                                    <strong>Server Responsibility</strong> - Server administrators are
                                    responsible for proper bot configuration and usage
                                </li>
                                <li>
                                    <strong>Official Server</strong> - Our official Discord server has
                                    built-in access without requiring API key setup
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Badge System
                            </h2>
                            <p className='mb-4'>
                                Users can create verification badges for their scanned plugins.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Badge Creation</strong> - Create badges linked to scan results
                                </li>
                                <li>
                                    <strong>Auto-Update</strong> - Badges can be configured to auto-update
                                    with new scan results
                                </li>
                                <li>
                                    <strong>Official Badges</strong> - Official verification badges are
                                    available for qualifying plugins
                                </li>
                                <li>
                                    <strong>Badge Tokens</strong> - Secure tokens protect badge auto-update
                                    functionality
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                8. User Responsibilities
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>File Ownership</strong> - You must only upload files
                                    that you own or have permission to analyze
                                </li>
                                <li>
                                    <strong>Legal Use</strong> - Use the service only for legitimate
                                    security analysis purposes
                                </li>
                                <li>
                                    <strong>No Malicious Intent</strong> - Do not use the service to
                                    analyze files with the intent to harm others
                                </li>
                                <li>
                                    <strong>Compliance</strong> - Comply with all applicable laws
                                    and regulations
                                </li>
                                <li>
                                    <strong>API Key Protection</strong> - Keep your API keys secure
                                    and do not share them publicly
                                </li>
                                <li>
                                    <strong>Account Security</strong> - Maintain the security of your
                                    linked authentication accounts
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Service Limitations
                            </h2>
                            <div className='bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-yellow-300 mb-2'>
                                    Important Limitations
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>No Guarantees</strong> - We do not guarantee 100%
                                        effectiveness of threat detection
                                    </li>
                                    <li>
                                        <strong>False Positives</strong> - Legitimate files may be
                                        flagged as suspicious
                                    </li>
                                    <li>
                                        <strong>False Negatives</strong> - Some threats may not be
                                        detected
                                    </li>
                                    <li>
                                        <strong>File Size</strong> - Maximum file size is 500MB
                                    </li>
                                    <li>
                                        <strong>File Types</strong> - Only .dll and .exe files are supported
                                    </li>
                                    <li>
                                        <strong>Rate Limits</strong> - Upload and analysis requests
                                        are rate-limited based on your tier
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Data Handling
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Temporary File Storage</strong> - Plugin files are temporarily
                                    stored during upload and analysis, then deleted
                                </li>
                                <li>
                                    <strong>Metadata Storage</strong> - File metadata (hash, name, size,
                                    scan results) is stored permanently
                                </li>
                                <li>
                                    <strong>Assembly Metadata</strong> - We extract and store assembly
                                    attributes (company, product, title, GUID, copyright)
                                </li>
                                <li>
                                    <strong>Scan History</strong> - Your scan history is associated with
                                    your account
                                </li>
                                <li>
                                    <strong>Analytics Data</strong> - Aggregated statistics are collected
                                    for service improvement
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                11. Content Moderation
                            </h2>
                            <p className='mb-4'>
                                We reserve the right to moderate content on our platform.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Admin Review</strong> - Files may be reviewed by administrators
                                </li>
                                <li>
                                    <strong>File Takedown</strong> - We may remove or restrict access to
                                    files that violate our terms
                                </li>
                                <li>
                                    <strong>Public Messages</strong> - Takedown reasons may be displayed
                                    publicly
                                </li>
                                <li>
                                    <strong>Admin Verdicts</strong> - Administrator decisions on files
                                    are final
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Intellectual Property
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Your Files</strong> - You retain all rights to your
                                    uploaded files
                                </li>
                                <li>
                                    <strong>Our Service</strong> - Safeturned and its analysis
                                    algorithms are our intellectual property
                                </li>
                                <li>
                                    <strong>Open Source</strong> - The service is open source and
                                    available under appropriate licenses
                                </li>
                                <li>
                                    <strong>No Claims</strong> - We make no claims on your
                                    intellectual property
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                13. Disclaimers
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Important Disclaimers
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>No Warranty</strong> - The service is provided
                                        &ldquo;as is&rdquo; without any warranties
                                    </li>
                                    <li>
                                        <strong>No Liability</strong> - We are not liable for any
                                        damages arising from use of the service
                                    </li>
                                    <li>
                                        <strong>Security Decisions</strong> - You are responsible
                                        for your own security decisions
                                    </li>
                                    <li>
                                        <strong>Third-Party Content</strong> - We are not
                                        responsible for the content of analyzed files
                                    </li>
                                    <li>
                                        <strong>Service Availability</strong> - We do not guarantee
                                        uninterrupted service availability
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                14. Prohibited Uses
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Illegal Activities</strong> - Using the service for
                                    illegal purposes
                                </li>
                                <li>
                                    <strong>Spam</strong> - Excessive or automated requests beyond
                                    your rate limits
                                </li>
                                <li>
                                    <strong>Harassment</strong> - Using the service to harass or
                                    harm others
                                </li>
                                <li>
                                    <strong>Reverse Engineering</strong> - Attempting to reverse
                                    engineer our analysis systems
                                </li>
                                <li>
                                    <strong>Bypassing Security</strong> - Attempting to bypass rate
                                    limits or security measures
                                </li>
                                <li>
                                    <strong>API Key Abuse</strong> - Sharing, selling, or misusing
                                    API keys
                                </li>
                                <li>
                                    <strong>Account Abuse</strong> - Creating multiple accounts to
                                    bypass limitations
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                15. Termination
                            </h2>
                            <p className='mb-4'>
                                We reserve the right to terminate or suspend access to our service
                                immediately, without prior notice or liability, for any reason
                                whatsoever, including without limitation if you breach the Terms.
                            </p>
                            <p>Upon termination:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4 mt-2'>
                                <li>Your API keys will be revoked</li>
                                <li>Your account access will be disabled</li>
                                <li>Your scan history and data may be retained or deleted at our discretion</li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                16. Changes to Terms
                            </h2>
                            <p>
                                We reserve the right, at our sole discretion, to modify or replace
                                these Terms at any time. If a revision is material, we will try to
                                provide at least 30 days notice prior to any new terms taking
                                effect.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                17. Governing Law
                            </h2>
                            <p>
                                These Terms shall be interpreted and governed by the laws of the
                                jurisdiction in which the service operates, without regard to its
                                conflict of law provisions.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                18. Contact Information
                            </h2>
                            <p>
                                If you have any questions about these Terms of Service, please
                                contact us through our GitHub repository or other official channels.
                            </p>
                        </section>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
