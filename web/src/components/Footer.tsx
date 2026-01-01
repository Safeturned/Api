'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { getVersionString } from '@/lib/version';

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className='px-6 py-8 md:py-12 border-t border-purple-800/30 mt-16 bg-slate-900/50'>
            <div className='max-w-7xl mx-auto'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-8'>
                    <div className='text-center md:text-left'>
                        <div className='flex items-center justify-center md:justify-start space-x-3 mb-4'>
                            <div className='w-8 h-8 select-none'>
                                <Image
                                    src='/favicon.jpg'
                                    alt='Safeturned Logo'
                                    width={32}
                                    height={32}
                                    className='w-full h-full object-contain rounded-lg pointer-events-none'
                                    draggable={false}
                                    onContextMenu={e => e.preventDefault()}
                                    onDragStart={e => e.preventDefault()}
                                />
                            </div>
                            <span className='text-lg font-bold text-white'>{t('hero.title')}</span>
                        </div>
                        <p className='text-gray-400 text-sm'>{t('footer.protectionMessage')}</p>
                    </div>

                    <div className='text-center'>
                        <h3 className='text-white font-semibold mb-4'>{t('footer.quickLinks')}</h3>
                        <div className='flex flex-col space-y-2'>
                            <Link
                                href='/docs'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm'
                            >
                                {t('nav.apiDocumentation')}
                            </Link>
                            <Link
                                href='/terms'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm'
                            >
                                {t('consent.termsOfService')}
                            </Link>
                            <Link
                                href='/privacy'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm'
                            >
                                {t('consent.privacyNotice')}
                            </Link>
                            <a
                                href='https://discord.gg/JAKWGEabhc'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm inline-flex items-center justify-center gap-2'
                            >
                                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                                    <path d='M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.019 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z' />
                                </svg>
                                {t('footer.discordCommunity')}
                            </a>
                        </div>
                    </div>

                    <div className='text-center md:text-right'>
                        <h3 className='text-white font-semibold mb-4'>{t('footer.openSource')}</h3>
                        <div className='flex flex-col space-y-2'>
                            <a
                                href='https://github.com/Safeturned/Plugins'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm inline-flex items-center justify-center md:justify-end gap-2'
                                title={t('footer.pluginsRepository')}
                            >
                                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                                </svg>
                                {t('footer.plugins')}
                            </a>
                            <a
                                href='https://github.com/Safeturned/FileChecker'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm inline-flex items-center justify-center md:justify-end gap-2'
                                title={t('footer.fileCheckerRepository')}
                            >
                                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                                </svg>
                                {t('footer.fileChecker')}
                            </a>
                            <a
                                href='https://github.com/Safeturned/Api'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm inline-flex items-center justify-center md:justify-end gap-2'
                                title={t('footer.apiRepository')}
                            >
                                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                                </svg>
                                {t('footer.apiServer')}
                            </a>
                            <a
                                href='https://github.com/Safeturned/Website'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm inline-flex items-center justify-center md:justify-end gap-2'
                                title={t('footer.websiteRepository')}
                            >
                                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 24 24'>
                                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                                </svg>
                                {t('footer.website')}
                            </a>
                        </div>
                    </div>
                </div>

                <div className='border-t border-purple-800/30 pt-6'>
                    <div className='text-gray-600 text-xs max-w-4xl mx-auto leading-relaxed mb-4 text-center'>
                        {t('footer.disclaimer')}
                    </div>

                    <div className='text-center space-y-1'>
                        <div className='text-gray-500 text-xs'>
                            © 2025 Safeturned. {t('footer.allRightsReserved')}.
                        </div>
                        <div className='text-gray-600 text-xs'>Website {getVersionString()}</div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
