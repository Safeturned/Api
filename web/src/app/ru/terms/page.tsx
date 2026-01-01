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
                            Условия использования
                        </h1>
                        <p className='text-slate-400 text-sm'>Последнее обновление: ноябрь 2025</p>
                    </div>

                    <div className='space-y-6 text-gray-300'>
                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                1. Принятие условий
                            </h2>
                            <p>
                                Используя Safeturned, вы принимаете и соглашаетесь соблюдать условия
                                и положения данного соглашения. Если вы не согласны соблюдать
                                вышеуказанное, пожалуйста, не используйте этот сервис.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                2. Описание сервиса
                            </h2>
                            <p>
                                Safeturned - это сервис анализа безопасности, который сканирует
                                файлы плагинов (.dll) на предмет потенциальных бэкдоров, троянов и
                                других вредоносных компонентов. Сервис предоставляет
                                автоматизированный анализ кода и обнаружение угроз для плагинов
                                серверов Unturned.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. Обязанности пользователя
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Владение файлами</strong> - Вы должны загружать только
                                    файлы, которыми владеете или имеете разрешение на анализ
                                </li>
                                <li>
                                    <strong>Отсутствие личной информации</strong> - Не отправляйте
                                    никакую личную информацию или конфиденциальные данные
                                </li>
                                <li>
                                    <strong>Законное использование</strong> - Используйте сервис
                                    только для законных целей анализа безопасности
                                </li>
                                <li>
                                    <strong>Отсутствие вредоносных намерений</strong> - Не
                                    используйте сервис для анализа файлов с намерением причинить
                                    вред другим
                                </li>
                                <li>
                                    <strong>Соблюдение</strong> - Соблюдайте все применимые законы и
                                    правила
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Ограничения сервиса
                            </h2>
                            <div className='bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-yellow-300 mb-2'>
                                    Важные ограничения
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Нет гарантий</strong> - Мы не гарантируем 100%
                                        эффективность обнаружения угроз
                                    </li>
                                    <li>
                                        <strong>Ложные срабатывания</strong> - Законные файлы могут
                                        быть помечены как подозрительные
                                    </li>
                                    <li>
                                        <strong>Ложные отрицания</strong> - Некоторые угрозы могут
                                        не быть обнаружены
                                    </li>
                                    <li>
                                        <strong>Размер файла</strong> - Максимальный размер файла
                                        составляет 500МБ
                                    </li>
                                    <li>
                                        <strong>Типы файлов</strong> - Поддерживаются только файлы
                                        .dll
                                    </li>
                                    <li>
                                        <strong>Ограничения скорости</strong> - Запросы на загрузку
                                        и анализ ограничены по скорости
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. Обработка данных
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Отсутствие хранения файлов</strong> - Файлы плагинов
                                    обрабатываются в памяти и немедленно удаляются
                                </li>
                                <li>
                                    <strong>Только метаданные</strong> - Хранятся только метаданные
                                    файлов (хеш, имя, размер, результаты сканирования)
                                </li>
                                <li>
                                    <strong>Отсутствие анализа содержимого</strong> - Мы не храним и
                                    не анализируем фактическое содержимое кода
                                </li>
                                <li>
                                    <strong>Аналитические данные</strong> - Собирается
                                    агрегированная статистика для улучшения сервиса
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. Интеллектуальная собственность
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Ваши файлы</strong> - Вы сохраняете все права на ваши
                                    загруженные файлы
                                </li>
                                <li>
                                    <strong>Наш сервис</strong> - Safeturned и его алгоритмы анализа
                                    являются нашей интеллектуальной собственностью
                                </li>
                                <li>
                                    <strong>Открытый исходный код</strong> - Сервис является
                                    открытым и доступен под соответствующими лицензиями
                                </li>
                                <li>
                                    <strong>Отсутствие претензий</strong> - Мы не предъявляем
                                    претензий на вашу интеллектуальную собственность
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Отказ от ответственности
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Важные отказы от ответственности
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Отсутствие гарантий</strong> - Сервис
                                        предоставляется &ldquo;как есть&rdquo; без каких-либо
                                        гарантий
                                    </li>
                                    <li>
                                        <strong>Отсутствие ответственности</strong> - Мы не несем
                                        ответственности за любой ущерб, возникший в результате
                                        использования сервиса
                                    </li>
                                    <li>
                                        <strong>Решения по безопасности</strong> - Вы несете
                                        ответственность за свои собственные решения по безопасности
                                    </li>
                                    <li>
                                        <strong>Контент третьих сторон</strong> - Мы не несем
                                        ответственности за содержимое анализируемых файлов
                                    </li>
                                    <li>
                                        <strong>Доступность сервиса</strong> - Мы не гарантируем
                                        бесперебойную доступность сервиса
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                8. Запрещенные виды использования
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Незаконная деятельность</strong> - Использование сервиса
                                    для незаконных целей
                                </li>
                                <li>
                                    <strong>Спам</strong> - Чрезмерные или автоматизированные
                                    запросы
                                </li>
                                <li>
                                    <strong>Домогательства</strong> - Использование сервиса для
                                    домогательства или причинения вреда другим
                                </li>
                                <li>
                                    <strong>Обратная инженерия</strong> - Попытки обратной инженерии
                                    наших систем
                                </li>
                                <li>
                                    <strong>Обход безопасности</strong> - Попытки обойти ограничения
                                    скорости или меры безопасности
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Прекращение
                            </h2>
                            <p>
                                Мы оставляем за собой право немедленно прекратить или приостановить
                                доступ к нашему сервису без предварительного уведомления или
                                ответственности по любой причине, включая, но не ограничиваясь
                                нарушением Условий.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Изменения в условиях
                            </h2>
                            <p>
                                Мы оставляем за собой право по нашему собственному усмотрению
                                изменять или заменять эти Условия в любое время. Если пересмотр
                                является существенным, мы постараемся предоставить уведомление как
                                минимум за 30 дней до вступления в силу новых условий.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                11. Применимое право
                            </h2>
                            <p>
                                Эти Условия должны толковаться и регулироваться законами юрисдикции,
                                в которой работает сервис, без учета положений о коллизионном праве.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Контактная информация
                            </h2>
                            <p>
                                Если у вас есть вопросы об этих Условиях использования, пожалуйста,
                                свяжитесь с нами через наш GitHub репозиторий или другие официальные
                                каналы.
                            </p>
                        </section>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
