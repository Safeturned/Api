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
                            Политика конфиденциальности
                        </h1>
                        <p className='text-slate-400 text-sm'>Последнее обновление: Январь 2025</p>
                    </div>

                    <div className='space-y-6 text-gray-300'>
                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>1. Введение</h2>
                            <p>
                                Эта Политика конфиденциальности объясняет, как Safeturned собирает,
                                использует и защищает вашу информацию при использовании нашего
                                сервиса анализа безопасности. Мы стремимся защищать вашу
                                конфиденциальность и быть прозрачными в отношении наших практик
                                работы с данными.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                2. Информация, которую мы НЕ собираем
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Важно: Мы НЕ храним ваши файлы плагинов
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Файлы плагинов (.dll)</strong> - Файлы
                                        обрабатываются в памяти и немедленно удаляются
                                    </li>
                                    <li>
                                        <strong>Содержимое файлов</strong> - Мы никогда не храним
                                        фактический код или содержимое ваших плагинов
                                    </li>
                                    <li>
                                        <strong>Личная информация</strong> - Никаких имен,
                                        email-адресов, адресов или личных идентификаторов
                                    </li>
                                    <li>
                                        <strong>Пользовательские аккаунты</strong> - Регистрация или
                                        вход не требуются
                                    </li>
                                    <li>
                                        <strong>IP-адреса</strong> - Используются только временно
                                        для ограничения скорости, не хранятся
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. Информация, которую мы собираем
                            </h2>
                            <div className='bg-green-900/20 border border-green-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-green-300 mb-2'>
                                    Метаданные файлов (для целей анализа)
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Хеш файла</strong> - SHA-256 хеш для идентификации
                                        дублирующихся файлов
                                    </li>
                                    <li>
                                        <strong>Имя файла</strong> - Оригинальное имя файла для
                                        справки
                                    </li>
                                    <li>
                                        <strong>Размер файла</strong> - Размер в байтах для анализа
                                    </li>
                                    <li>
                                        <strong>Тип обнаружения</strong> - Тип обнаруженного файла
                                        (например, &ldquo;Assembly&rdquo;)
                                    </li>
                                    <li>
                                        <strong>Результаты сканирования</strong> - Оценка
                                        безопасности и результаты обнаружения угроз
                                    </li>
                                    <li>
                                        <strong>Временные метки сканирования</strong> - Когда файл
                                        был впервые и последний раз просканирован
                                    </li>
                                    <li>
                                        <strong>Количество сканирований</strong> - Сколько раз файл
                                        был проанализирован
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Аналитические данные, которые мы собираем
                            </h2>
                            <p>
                                Мы собираем агрегированные аналитические данные для улучшения нашего
                                сервиса и понимания моделей использования:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Общее количество просканированных файлов</strong> -
                                    Количество обработанных файлов
                                </li>
                                <li>
                                    <strong>Статистика обнаружения угроз</strong> - Количество
                                    обнаруженных угроз vs безопасных файлов
                                </li>
                                <li>
                                    <strong>Метрики производительности сканирования</strong> -
                                    Среднее время сканирования и статистика обработки
                                </li>
                                <li>
                                    <strong>Средние оценки безопасности</strong> - Общие тенденции
                                    безопасности
                                </li>
                                <li>
                                    <strong>Диапазоны дат сканирования</strong> - Первая и последняя
                                    даты сканирования для аналитики
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. Как мы используем вашу информацию
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Анализ безопасности</strong> - Для предоставления
                                    сервисов сканирования безопасности плагинов
                                </li>
                                <li>
                                    <strong>Улучшение сервиса</strong> - Для улучшения наших
                                    алгоритмов обнаружения и производительности
                                </li>
                                <li>
                                    <strong>Обнаружение дубликатов</strong> - Для избежания
                                    повторного анализа одних и тех же файлов
                                </li>
                                <li>
                                    <strong>Ограничение скорости</strong> - Для предотвращения
                                    злоупотреблений и обеспечения справедливого использования
                                </li>
                                <li>
                                    <strong>Мониторинг ошибок</strong> - Для выявления и исправления
                                    технических проблем (без включения содержимого файлов)
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. Защита данных
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Отсутствие хранения файлов</strong> - Файлы плагинов
                                    никогда не сохраняются на диск
                                </li>
                                <li>
                                    <strong>Обработка только в памяти</strong> - Файлы
                                    обрабатываются в RAM и немедленно удаляются
                                </li>
                                <li>
                                    <strong>Шифрованная передача</strong> - Все данные передаются по
                                    HTTPS
                                </li>
                                <li>
                                    <strong>Безопасность базы данных</strong> - Только метаданные
                                    хранятся в защищенных базах данных
                                </li>
                                <li>
                                    <strong>Фильтрация логов</strong> - Загрузки файлов фильтруются
                                    из логов ошибок
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Хранение данных
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Метаданные файлов</strong> - Хранятся бессрочно для
                                    обнаружения дубликатов и аналитики
                                </li>
                                <li>
                                    <strong>Записи сканирования</strong> - Хранятся для улучшения
                                    сервиса и аналитики
                                </li>
                                <li>
                                    <strong>Аналитические данные</strong> - Агрегированная
                                    статистика хранится для оптимизации сервиса
                                </li>
                                <li>
                                    <strong>Файлы плагинов</strong> - Никогда не хранятся,
                                    немедленно удаляются после анализа
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                8. Передача данных
                            </h2>
                            <p>
                                Мы не продаем, не обмениваем и не передаем вашу информацию третьим
                                лицам. Мы можем делиться:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Агрегированной аналитикой</strong> - Публичная
                                    статистика (без данных отдельных файлов)
                                </li>
                                <li>
                                    <strong>Поставщиками услуг</strong> - Только для технической
                                    инфраструктуры (без содержимого файлов)
                                </li>
                                <li>
                                    <strong>Юридическими требованиями</strong> - Только если
                                    требуется по закону (крайне маловероятно, учитывая наши практики
                                    работы с данными)
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Ваши права
                            </h2>
                            <p>
                                Поскольку мы не собираем личную информацию, традиционные права на
                                конфиденциальность не применяются. Однако вы можете:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Прекратить использование сервиса</strong> - Аккаунт не
                                    требуется, просто прекратите загружать файлы
                                </li>
                                <li>
                                    <strong>Связаться с нами</strong> - Для вопросов о наших
                                    практиках конфиденциальности
                                </li>
                                <li>
                                    <strong>Просмотреть наш код</strong> - Весь код открыт и
                                    публично доступен
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Прозрачность открытого исходного кода
                            </h2>
                            <p>Safeturned полностью открыт. Вы можете:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Просмотреть наш код</strong> - Весь исходный код
                                    публично доступен на GitHub
                                </li>
                                <li>
                                    <strong>Проверить наши практики</strong> - Проверить нашу
                                    фактическую реализацию обработки данных
                                </li>
                                <li>
                                    <strong>Внести вклад</strong> - Помочь улучшить наши практики
                                    конфиденциальности и безопасности
                                </li>
                                <li>
                                    <strong>Самостоятельно разместить</strong> - Запустить свой
                                    собственный экземпляр, если предпочитаете
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                11. Изменения в этом уведомлении
                            </h2>
                            <p>
                                Мы можем время от времени обновлять эту Политику конфиденциальности.
                                Изменения будут размещены на этой странице с обновленной датой.
                                Продолжение использования сервиса означает принятие обновленного
                                уведомления.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Контактная информация
                            </h2>
                            <p>
                                Если у вас есть вопросы об этой Политике конфиденциальности или
                                наших практиках работы с данными, пожалуйста, свяжитесь с нами через
                                наш GitHub репозиторий или другие официальные каналы.
                            </p>
                        </section>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
