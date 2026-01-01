'use client';

import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';

export default function TermsPage() {
    const { t } = useTranslation();

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col'>
            <Navigation />

            <div className='flex-1 max-w-5xl mx-auto px-6 py-12 relative z-1 w-full'>
                <div className='bg-slate-800/40 backdrop-blur-md border border-purple-500/20 rounded-2xl p-8 md:p-12 shadow-2xl'>
                    <div className='mb-10'>
                        <h1 className='text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pb-1 leading-tight'>
                            {t('terms.title')}
                        </h1>
                        <p className='text-slate-400 text-sm'>{t('terms.lastUpdated')}</p>
                    </div>

                    <div className='space-y-8 text-gray-300'>
                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.acceptance.title')}
                            </h2>
                            <p className='leading-relaxed'>{t('terms.acceptance.content')}</p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.description.title')}
                            </h2>
                            <p className='leading-relaxed'>{t('terms.description.content')}</p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.responsibilities.title')}
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>
                                        {t('terms.responsibilities.fileOwnership.title')}
                                    </strong>{' '}
                                    - {t('terms.responsibilities.fileOwnership.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.responsibilities.noPersonalInfo.title')}
                                    </strong>{' '}
                                    - {t('terms.responsibilities.noPersonalInfo.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.responsibilities.legalUse.title')}</strong> -{' '}
                                    {t('terms.responsibilities.legalUse.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.responsibilities.noMaliciousIntent.title')}
                                    </strong>{' '}
                                    - {t('terms.responsibilities.noMaliciousIntent.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.responsibilities.compliance.title')}</strong>{' '}
                                    - {t('terms.responsibilities.compliance.content')}
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.limitations.title')}
                            </h2>
                            <div className='bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-yellow-300 mb-2'>
                                    {t('terms.limitations.important')}
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>{t('terms.limitations.noGuarantees.title')}</strong>{' '}
                                        - {t('terms.limitations.noGuarantees.content')}
                                    </li>
                                    <li>
                                        <strong>
                                            {t('terms.limitations.falsePositives.title')}
                                        </strong>{' '}
                                        - {t('terms.limitations.falsePositives.content')}
                                    </li>
                                    <li>
                                        <strong>
                                            {t('terms.limitations.falseNegatives.title')}
                                        </strong>{' '}
                                        - {t('terms.limitations.falseNegatives.content')}
                                    </li>
                                    <li>
                                        <strong>{t('terms.limitations.fileSize.title')}</strong> -{' '}
                                        {t('terms.limitations.fileSize.content')}
                                    </li>
                                    <li>
                                        <strong>{t('terms.limitations.fileTypes.title')}</strong> -{' '}
                                        {t('terms.limitations.fileTypes.content')}
                                    </li>
                                    <li>
                                        <strong>{t('terms.limitations.rateLimits.title')}</strong> -{' '}
                                        {t('terms.limitations.rateLimits.content')}
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.dataHandling.title')}
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>{t('terms.dataHandling.websiteUploads.title')}</strong>{' '}
                                    - {t('terms.dataHandling.websiteUploads.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.dataHandling.apiUploads.title')}</strong> -{' '}
                                    {t('terms.dataHandling.apiUploads.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.dataHandling.chunkedUploads.title')}</strong>{' '}
                                    - {t('terms.dataHandling.chunkedUploads.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.dataHandling.metadataOnly.title')}</strong> -{' '}
                                    {t('terms.dataHandling.metadataOnly.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.dataHandling.analyticsData.title')}</strong> -{' '}
                                    {t('terms.dataHandling.analyticsData.content')}
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.intellectualProperty.title')}
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>
                                        {t('terms.intellectualProperty.yourFiles.title')}
                                    </strong>{' '}
                                    - {t('terms.intellectualProperty.yourFiles.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.intellectualProperty.ourService.title')}
                                    </strong>{' '}
                                    - {t('terms.intellectualProperty.ourService.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.intellectualProperty.openSource.title')}
                                    </strong>{' '}
                                    - {t('terms.intellectualProperty.openSource.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.intellectualProperty.noClaims.title')}
                                    </strong>{' '}
                                    - {t('terms.intellectualProperty.noClaims.content')}
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.disclaimers.title')}
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    {t('terms.disclaimers.important')}
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>{t('terms.disclaimers.noWarranty.title')}</strong> -{' '}
                                        {t('terms.disclaimers.noWarranty.content')}
                                    </li>
                                    <li>
                                        <strong>{t('terms.disclaimers.noLiability.title')}</strong>{' '}
                                        - {t('terms.disclaimers.noLiability.content')}
                                    </li>
                                    <li>
                                        <strong>
                                            {t('terms.disclaimers.securityDecisions.title')}
                                        </strong>{' '}
                                        - {t('terms.disclaimers.securityDecisions.content')}
                                    </li>
                                    <li>
                                        <strong>
                                            {t('terms.disclaimers.thirdPartyContent.title')}
                                        </strong>{' '}
                                        - {t('terms.disclaimers.thirdPartyContent.content')}
                                    </li>
                                    <li>
                                        <strong>
                                            {t('terms.disclaimers.serviceAvailability.title')}
                                        </strong>{' '}
                                        - {t('terms.disclaimers.serviceAvailability.content')}
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.prohibitedUses.title')}
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>
                                        {t('terms.prohibitedUses.illegalActivities.title')}
                                    </strong>{' '}
                                    - {t('terms.prohibitedUses.illegalActivities.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.prohibitedUses.spam.title')}</strong> -{' '}
                                    {t('terms.prohibitedUses.spam.content')}
                                </li>
                                <li>
                                    <strong>{t('terms.prohibitedUses.harassment.title')}</strong> -{' '}
                                    {t('terms.prohibitedUses.harassment.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.prohibitedUses.reverseEngineering.title')}
                                    </strong>{' '}
                                    - {t('terms.prohibitedUses.reverseEngineering.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.prohibitedUses.bypassingSecurity.title')}
                                    </strong>{' '}
                                    - {t('terms.prohibitedUses.bypassingSecurity.content')}
                                </li>
                                <li>
                                    <strong>
                                        {t('terms.prohibitedUses.multipleAccounts.title')}
                                    </strong>{' '}
                                    - {t('terms.prohibitedUses.multipleAccounts.content')}
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.termination.title')}
                            </h2>
                            <p className='leading-relaxed'>{t('terms.termination.content')}</p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.changes.title')}
                            </h2>
                            <p className='leading-relaxed'>{t('terms.changes.content')}</p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.governingLaw.title')}
                            </h2>
                            <p className='leading-relaxed'>{t('terms.governingLaw.content')}</p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                {t('terms.contact.title')}
                            </h2>
                            <p className='leading-relaxed'>{t('terms.contact.content')}</p>
                        </section>
                    </div>
                </div>
            </div>
            <BackToTop />
            <Footer />
        </div>
    );
}
