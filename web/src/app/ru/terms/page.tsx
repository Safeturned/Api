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
                        <p className='text-slate-400 text-sm'>Последнее обновление: Январь 2026</p>
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
                            <p className='mb-4'>
                                Safeturned - это сервис анализа безопасности, который сканирует
                                файлы плагинов (.dll и .exe) на предмет потенциальных бэкдоров,
                                троянов и других вредоносных компонентов. Сервис предоставляет
                                автоматизированный анализ кода и обнаружение угроз для плагинов
                                серверов Unturned.
                            </p>
                            <p>Наш сервис включает:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4 mt-2'>
                                <li>
                                    <strong>Веб-интерфейс</strong> - Загрузка и сканирование файлов
                                    через наш сайт
                                </li>
                                <li>
                                    <strong>API-доступ</strong> - Программный доступ для
                                    автоматизированного сканирования
                                </li>
                                <li>
                                    <strong>Discord-бот</strong> - Сканирование файлов непосредственно
                                    в Discord-серверах
                                </li>
                                <li>
                                    <strong>Система бейджей</strong> - Верификационные бейджи для
                                    просканированных плагинов
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. Учетные записи пользователей
                            </h2>
                            <p className='mb-4'>
                                Для доступа к определенным функциям необходимо создать учетную запись
                                через аутентификацию Discord или Steam.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Создание аккаунта</strong> - Аккаунты создаются автоматически
                                    при первом входе через Discord или Steam OAuth
                                </li>
                                <li>
                                    <strong>Связывание аккаунтов</strong> - Вы можете связать несколько
                                    провайдеров аутентификации с одним аккаунтом
                                </li>
                                <li>
                                    <strong>Безопасность аккаунта</strong> - Вы несете ответственность
                                    за поддержание безопасности ваших связанных аккаунтов Discord и Steam
                                </li>
                                <li>
                                    <strong>Достоверная информация</strong> - Информация аккаунта
                                    получается от вашего OAuth-провайдера и должна быть достоверной
                                </li>
                                <li>
                                    <strong>Удаление аккаунта</strong> - Вы можете запросить удаление
                                    аккаунта в любое время
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Уровни подписки
                            </h2>
                            <p className='mb-4'>
                                Safeturned предлагает различные уровни сервиса с разными лимитами
                                запросов и функциями:
                            </p>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4'>
                                <ul className='list-disc list-inside space-y-2 ml-4'>
                                    <li>
                                        <strong>Free</strong> - Базовый доступ со стандартными лимитами
                                    </li>
                                    <li>
                                        <strong>Verified</strong> - Увеличенные лимиты и приоритетная
                                        поддержка
                                    </li>
                                    <li>
                                        <strong>Premium</strong> - Более высокие лимиты и дополнительные
                                        функции
                                    </li>
                                    <li>
                                        <strong>Bot</strong> - Максимальные лимиты для автоматизированных
                                        интеграций
                                    </li>
                                </ul>
                            </div>
                            <p className='mt-4 text-sm text-slate-400'>
                                Повышение уровня в настоящее время назначается вручную. Интеграция
                                платежей может быть добавлена в будущем.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. API-доступ
                            </h2>
                            <p className='mb-4'>
                                Зарегистрированные пользователи могут генерировать API-ключи для
                                программного доступа к нашим сервисам.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>API-ключи</strong> - Вы можете генерировать API-ключи до
                                    лимита вашего уровня (3-10 ключей в зависимости от уровня)
                                </li>
                                <li>
                                    <strong>Безопасность ключей</strong> - Вы несете ответственность
                                    за сохранение ваших API-ключей в безопасности и конфиденциальности
                                </li>
                                <li>
                                    <strong>Области действия</strong> - API-ключи имеют настраиваемые
                                    области разрешений
                                </li>
                                <li>
                                    <strong>Белый список IP</strong> - Вы можете ограничить использование
                                    API-ключа определенными IP-адресами
                                </li>
                                <li>
                                    <strong>Лимиты использования</strong> - API-запросы подчиняются
                                    лимитам скорости в зависимости от вашего уровня
                                </li>
                                <li>
                                    <strong>Отзыв</strong> - Мы можем отозвать API-ключи, нарушающие
                                    наши условия или используемые злонамеренно
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. Discord-бот
                            </h2>
                            <p className='mb-4'>
                                Наш Discord-бот позволяет сканировать файлы непосредственно в
                                Discord-серверах.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Настройка сервера</strong> - Администраторы сервера должны
                                    настроить API-ключ для работы бота
                                </li>
                                <li>
                                    <strong>Лимиты скорости</strong> - Использование бота подчиняется
                                    лимитам настроенного API-ключа
                                </li>
                                <li>
                                    <strong>Ответственность сервера</strong> - Администраторы сервера
                                    несут ответственность за правильную настройку и использование бота
                                </li>
                                <li>
                                    <strong>Официальный сервер</strong> - Наш официальный Discord-сервер
                                    имеет встроенный доступ без необходимости настройки API-ключа
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Система бейджей
                            </h2>
                            <p className='mb-4'>
                                Пользователи могут создавать верификационные бейджи для своих
                                просканированных плагинов.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Создание бейджей</strong> - Создавайте бейджи, связанные
                                    с результатами сканирования
                                </li>
                                <li>
                                    <strong>Авто-обновление</strong> - Бейджи могут быть настроены на
                                    авто-обновление с новыми результатами сканирования
                                </li>
                                <li>
                                    <strong>Официальные бейджи</strong> - Официальные верификационные
                                    бейджи доступны для соответствующих плагинов
                                </li>
                                <li>
                                    <strong>Токены бейджей</strong> - Защищенные токены защищают
                                    функциональность авто-обновления
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                8. Обязанности пользователя
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Владение файлами</strong> - Вы должны загружать только
                                    файлы, которыми владеете или имеете разрешение на анализ
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
                                <li>
                                    <strong>Защита API-ключей</strong> - Храните ваши API-ключи в
                                    безопасности и не делитесь ими публично
                                </li>
                                <li>
                                    <strong>Безопасность аккаунта</strong> - Поддерживайте безопасность
                                    ваших связанных аккаунтов аутентификации
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Ограничения сервиса
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
                                        .dll и .exe
                                    </li>
                                    <li>
                                        <strong>Лимиты скорости</strong> - Запросы на загрузку и
                                        анализ ограничены в зависимости от вашего уровня
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Обработка данных
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Временное хранение файлов</strong> - Файлы плагинов
                                    временно хранятся во время загрузки и анализа, затем удаляются
                                </li>
                                <li>
                                    <strong>Хранение метаданных</strong> - Метаданные файлов (хеш, имя,
                                    размер, результаты сканирования) хранятся постоянно
                                </li>
                                <li>
                                    <strong>Метаданные сборки</strong> - Мы извлекаем и храним атрибуты
                                    сборки (компания, продукт, заголовок, GUID, авторские права)
                                </li>
                                <li>
                                    <strong>История сканирования</strong> - Ваша история сканирования
                                    связана с вашим аккаунтом
                                </li>
                                <li>
                                    <strong>Аналитические данные</strong> - Собирается агрегированная
                                    статистика для улучшения сервиса
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                11. Модерация контента
                            </h2>
                            <p className='mb-4'>
                                Мы оставляем за собой право модерировать контент на нашей платформе.
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Проверка администратором</strong> - Файлы могут быть
                                    проверены администраторами
                                </li>
                                <li>
                                    <strong>Удаление файлов</strong> - Мы можем удалить или ограничить
                                    доступ к файлам, нарушающим наши условия
                                </li>
                                <li>
                                    <strong>Публичные сообщения</strong> - Причины удаления могут
                                    отображаться публично
                                </li>
                                <li>
                                    <strong>Решения администраторов</strong> - Решения администраторов
                                    по файлам являются окончательными
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Интеллектуальная собственность
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
                                    <strong>Открытый исходный код</strong> - Сервис является открытым
                                    и доступен под соответствующими лицензиями
                                </li>
                                <li>
                                    <strong>Отсутствие претензий</strong> - Мы не предъявляем претензий
                                    на вашу интеллектуальную собственность
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                13. Отказ от ответственности
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Важные отказы от ответственности
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Отсутствие гарантий</strong> - Сервис предоставляется
                                        &ldquo;как есть&rdquo; без каких-либо гарантий
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
                                14. Запрещенные виды использования
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Незаконная деятельность</strong> - Использование сервиса
                                    для незаконных целей
                                </li>
                                <li>
                                    <strong>Спам</strong> - Чрезмерные или автоматизированные запросы
                                    сверх ваших лимитов
                                </li>
                                <li>
                                    <strong>Домогательства</strong> - Использование сервиса для
                                    домогательства или причинения вреда другим
                                </li>
                                <li>
                                    <strong>Обратная инженерия</strong> - Попытки обратной инженерии
                                    наших систем анализа
                                </li>
                                <li>
                                    <strong>Обход безопасности</strong> - Попытки обойти ограничения
                                    скорости или меры безопасности
                                </li>
                                <li>
                                    <strong>Злоупотребление API-ключами</strong> - Распространение,
                                    продажа или неправильное использование API-ключей
                                </li>
                                <li>
                                    <strong>Злоупотребление аккаунтами</strong> - Создание нескольких
                                    аккаунтов для обхода ограничений
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                15. Прекращение
                            </h2>
                            <p className='mb-4'>
                                Мы оставляем за собой право немедленно прекратить или приостановить
                                доступ к нашему сервису без предварительного уведомления или
                                ответственности по любой причине, включая, но не ограничиваясь
                                нарушением Условий.
                            </p>
                            <p>При прекращении:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4 mt-2'>
                                <li>Ваши API-ключи будут отозваны</li>
                                <li>Доступ к вашему аккаунту будет отключен</li>
                                <li>Ваша история сканирования и данные могут быть сохранены или
                                    удалены по нашему усмотрению</li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                16. Изменения в условиях
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
                                17. Применимое право
                            </h2>
                            <p>
                                Эти Условия должны толковаться и регулироваться законами юрисдикции,
                                в которой работает сервис, без учета положений о коллизионном праве.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                18. Контактная информация
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
