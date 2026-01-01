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
                        <p className='text-slate-400 text-sm'>Last updated: November 2025</p>
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
                            <p>
                                Safeturned is a security analysis service that scans plugin files
                                (.dll) for potential backdoors, trojans, and other malicious
                                components. The service provides automated code analysis and threat
                                detection for Unturned server plugins.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. User Responsibilities
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>File Ownership</strong> - You must only upload files
                                    that you own or have permission to analyze
                                </li>
                                <li>
                                    <strong>No Personal Information</strong> - Do not submit any
                                    personal information or sensitive data
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
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Service Limitations
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
                                        <strong>File Types</strong> - Only .dll files are supported
                                    </li>
                                    <li>
                                        <strong>Rate Limits</strong> - Upload and analysis requests
                                        are rate-limited
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. Data Handling
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>No File Storage</strong> - Plugin files are processed in
                                    memory and immediately discarded
                                </li>
                                <li>
                                    <strong>Metadata Only</strong> - Only file metadata (hash, name,
                                    size, scan results) is stored
                                </li>
                                <li>
                                    <strong>No Content Analysis</strong> - We do not store or
                                    analyze the actual code content
                                </li>
                                <li>
                                    <strong>Analytics Data</strong> - Aggregated statistics are
                                    collected for service improvement
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. Intellectual Property
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
                                7. Disclaimers
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
                                8. Prohibited Uses
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Illegal Activities</strong> - Using the service for
                                    illegal purposes
                                </li>
                                <li>
                                    <strong>Spam</strong> - Excessive or automated requests
                                </li>
                                <li>
                                    <strong>Harassment</strong> - Using the service to harass or
                                    harm others
                                </li>
                                <li>
                                    <strong>Reverse Engineering</strong> - Attempting to reverse
                                    engineer our systems
                                </li>
                                <li>
                                    <strong>Bypassing Security</strong> - Attempting to bypass rate
                                    limits or security measures
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Termination
                            </h2>
                            <p>
                                We reserve the right to terminate or suspend access to our service
                                immediately, without prior notice or liability, for any reason
                                whatsoever, including without limitation if you breach the Terms.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Changes to Terms
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
                                11. Governing Law
                            </h2>
                            <p>
                                These Terms shall be interpreted and governed by the laws of the
                                jurisdiction in which the service operates, without regard to its
                                conflict of law provisions.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Contact Information
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
