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
                        <p className='text-slate-400 text-sm'>Последнее обновление: Январь 2026</p>
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
                                2. Информация об аккаунте, которую мы собираем
                            </h2>
                            <p className='mb-4'>
                                При создании аккаунта через аутентификацию Discord или Steam мы собираем:
                            </p>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4 mb-4'>
                                <h3 className='font-semibold text-slate-200 mb-2'>
                                    Аутентификация Discord
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>Discord ID</strong> - Ваш уникальный идентификатор Discord</li>
                                    <li><strong>Email-адрес</strong> - Из вашего аккаунта Discord</li>
                                    <li><strong>Имя пользователя</strong> - Ваше имя пользователя Discord</li>
                                    <li><strong>URL аватара</strong> - Ссылка на изображение профиля Discord</li>
                                </ul>
                            </div>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-slate-200 mb-2'>
                                    Аутентификация Steam
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>Steam ID</strong> - Ваш уникальный идентификатор Steam</li>
                                    <li><strong>Имя пользователя</strong> - Ваше отображаемое имя Steam</li>
                                    <li><strong>URL аватара</strong> - Ссылка на изображение профиля Steam</li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                3. Данные анализа файлов
                            </h2>
                            <div className='bg-green-900/20 border border-green-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-green-300 mb-2'>
                                    Метаданные файлов, которые мы храним
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>Хеш файла</strong> - SHA-256 хеш для идентификации файлов</li>
                                    <li><strong>Имя файла</strong> - Оригинальное имя файла</li>
                                    <li><strong>Размер файла</strong> - Размер в байтах</li>
                                    <li><strong>Тип обнаружения</strong> - Тип обнаруженного файла</li>
                                    <li><strong>Результаты сканирования</strong> - Оценка безопасности и обнаружение угроз</li>
                                    <li><strong>Временные метки сканирования</strong> - Когда файл был просканирован</li>
                                    <li><strong>Количество сканирований</strong> - Сколько раз файл анализировался</li>
                                </ul>
                            </div>
                            <div className='bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mt-4'>
                                <h3 className='font-semibold text-yellow-300 mb-2'>
                                    Извлекаемые метаданные сборки
                                </h3>
                                <p className='mb-2'>Для файлов .dll и .exe мы извлекаем и храним:</p>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li><strong>Название компании</strong> - Из атрибутов сборки</li>
                                    <li><strong>Название продукта</strong> - Из атрибутов сборки</li>
                                    <li><strong>Заголовок</strong> - Заголовок сборки</li>
                                    <li><strong>GUID</strong> - Идентификатор сборки</li>
                                    <li><strong>Авторские права</strong> - Информация об авторских правах</li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                4. Файлы плагинов
                            </h2>
                            <div className='bg-red-900/20 border border-red-500/30 rounded-lg p-4'>
                                <h3 className='font-semibold text-red-300 mb-2'>
                                    Важно: Обработка файлов
                                </h3>
                                <ul className='list-disc list-inside space-y-1 ml-4'>
                                    <li>
                                        <strong>Временное хранение</strong> - Файлы временно хранятся
                                        во время загрузки и процесса анализа
                                    </li>
                                    <li>
                                        <strong>Автоматическое удаление</strong> - Файлы удаляются после
                                        завершения анализа
                                    </li>
                                    <li>
                                        <strong>Без постоянного хранения</strong> - Мы не храним
                                        фактическое содержимое файлов постоянно
                                    </li>
                                    <li>
                                        <strong>Только метаданные</strong> - Сохраняются только метаданные
                                        и результаты анализа
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                5. IP-адреса
                            </h2>
                            <p className='mb-4'>
                                Мы собираем и храним IP-адреса в следующих контекстах:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Токены аутентификации</strong> - IP-адрес записывается при
                                    создании токенов
                                </li>
                                <li>
                                    <strong>Задачи анализа</strong> - IP-адрес клиента, запрашивающего
                                    анализ файла
                                </li>
                                <li>
                                    <strong>Логи использования API</strong> - IP-адрес для отслеживания
                                    использования и предотвращения злоупотреблений
                                </li>
                                <li>
                                    <strong>Ограничение скорости</strong> - Ограничение по IP для
                                    предотвращения злоупотреблений
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                6. API-ключи
                            </h2>
                            <p className='mb-4'>
                                При генерации API-ключей мы храним:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Хешированный ключ</strong> - API-ключи хешируются и никогда
                                    не хранятся в открытом виде
                                </li>
                                <li>
                                    <strong>Метаданные ключа</strong> - Название, префикс, дата создания,
                                    дата истечения
                                </li>
                                <li>
                                    <strong>Области действия</strong> - Разрешения, назначенные ключу
                                </li>
                                <li>
                                    <strong>Белый список IP</strong> - При настройке, разрешенные IP-адреса
                                </li>
                                <li>
                                    <strong>Статистика использования</strong> - Количество запросов,
                                    используемые эндпоинты, время ответа
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                7. Cookies и аутентификация
                            </h2>
                            <p className='mb-4'>
                                Мы используем следующие cookies для аутентификации:
                            </p>
                            <div className='bg-slate-700/30 border border-slate-600/30 rounded-lg p-4'>
                                <ul className='list-disc list-inside space-y-2 ml-4'>
                                    <li>
                                        <strong>access_token</strong> - JWT токен аутентификации
                                        (HTTP-only, срок действия 1 год)
                                    </li>
                                    <li>
                                        <strong>refresh_token</strong> - Токен обновления сессии
                                        (HTTP-only, срок действия 1 год)
                                    </li>
                                    <li>
                                        <strong>safeturned_oauth</strong> - Параметр состояния OAuth
                                        (временный, для процесса входа)
                                    </li>
                                </ul>
                            </div>
                            <p className='mt-4 text-sm text-slate-400'>
                                Все cookies аутентификации являются HTTP-only и не могут быть
                                доступны через JavaScript в целях безопасности.
                            </p>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                8. Сторонние сервисы
                            </h2>
                            <p className='mb-4'>
                                Мы используем следующие сторонние сервисы:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Sentry</strong> - Отслеживание ошибок и мониторинг. Получает
                                    сообщения об ошибках, стек-трейсы и версии приложения. Содержимое
                                    файлов не отправляется.
                                </li>
                                <li>
                                    <strong>Discord API</strong> - Используется только для аутентификации.
                                    Мы запрашиваем ваш Discord ID, email, имя пользователя и аватар.
                                </li>
                                <li>
                                    <strong>Steam API</strong> - Используется только для аутентификации.
                                    Мы запрашиваем ваш Steam ID, имя пользователя и аватар.
                                </li>
                                <li>
                                    <strong>GitHub</strong> - Обработка вебхуков для релизов программного
                                    обеспечения и обновлений.
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                9. Данные Discord-бота
                            </h2>
                            <p className='mb-4'>
                                Если вы используете нашего Discord-бота, мы храним:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>ID сервера</strong> - Идентификатор Discord-сервера, где
                                    настроен бот
                                </li>
                                <li>
                                    <strong>Связь с API-ключом</strong> - Зашифрованная ссылка на
                                    API-ключ, настроенный для сервера
                                </li>
                                <li>
                                    <strong>Настройки конфигурации</strong> - Настройки бота для сервера
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                10. Аналитические данные
                            </h2>
                            <p className='mb-4'>
                                Мы собираем агрегированную аналитику для улучшения нашего сервиса:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li><strong>Всего просканировано файлов</strong> - Количество обработанных файлов</li>
                                <li><strong>Статистика угроз</strong> - Показатели обнаружения и паттерны</li>
                                <li><strong>Метрики производительности</strong> - Время сканирования и статистика обработки</li>
                                <li><strong>Средние оценки безопасности</strong> - Общие тенденции</li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                11. Как мы используем вашу информацию
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Анализ безопасности</strong> - Для предоставления сервисов
                                    сканирования безопасности плагинов
                                </li>
                                <li>
                                    <strong>Управление аккаунтом</strong> - Для управления вашим аккаунтом
                                    и аутентификацией
                                </li>
                                <li>
                                    <strong>Улучшение сервиса</strong> - Для улучшения наших алгоритмов
                                    обнаружения и производительности
                                </li>
                                <li>
                                    <strong>Ограничение скорости</strong> - Для предотвращения
                                    злоупотреблений и обеспечения справедливого использования
                                </li>
                                <li>
                                    <strong>Мониторинг ошибок</strong> - Для выявления и исправления
                                    технических проблем
                                </li>
                                <li>
                                    <strong>Коммуникация</strong> - Для уведомления вас об обновлениях
                                    сервиса при необходимости
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                12. Защита данных
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Шифрование при передаче</strong> - Все данные передаются по HTTPS
                                </li>
                                <li>
                                    <strong>Хешированные учетные данные</strong> - API-ключи хешируются,
                                    никогда не хранятся в открытом виде
                                </li>
                                <li>
                                    <strong>HTTP-only cookies</strong> - Токены аутентификации не могут
                                    быть доступны через JavaScript
                                </li>
                                <li>
                                    <strong>Безопасность базы данных</strong> - Данные хранятся в
                                    защищенных базах данных с контролем доступа
                                </li>
                                <li>
                                    <strong>Безопасность OAuth</strong> - Стандартный OAuth 2.0 для
                                    аутентификации
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                13. Хранение данных
                            </h2>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Данные аккаунта</strong> - Хранятся до удаления вашего аккаунта
                                </li>
                                <li>
                                    <strong>Метаданные файлов</strong> - Хранятся бессрочно для
                                    обнаружения дубликатов и аналитики
                                </li>
                                <li>
                                    <strong>Записи сканирования</strong> - Хранятся для улучшения сервиса
                                </li>
                                <li>
                                    <strong>Логи использования API</strong> - Хранятся для аналитики и
                                    предотвращения злоупотреблений
                                </li>
                                <li>
                                    <strong>Файлы плагинов</strong> - Удаляются после анализа, не хранятся
                                    постоянно
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                14. Передача данных
                            </h2>
                            <p className='mb-4'>
                                Мы не продаем, не обмениваем и не передаем вашу личную информацию
                                третьим лицам. Мы можем делиться:
                            </p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Агрегированной аналитикой</strong> - Публичная статистика
                                    без индивидуальных данных
                                </li>
                                <li>
                                    <strong>Поставщиками услуг</strong> - Провайдеры технической
                                    инфраструктуры (без содержимого файлов)
                                </li>
                                <li>
                                    <strong>Юридическими требованиями</strong> - Только если требуется
                                    по закону
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                15. Ваши права
                            </h2>
                            <p className='mb-4'>Вы имеете право:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Доступ к вашим данным</strong> - Запросить информацию о том,
                                    какие данные мы храним о вас
                                </li>
                                <li>
                                    <strong>Удаление аккаунта</strong> - Запросить удаление вашего
                                    аккаунта и связанных данных
                                </li>
                                <li>
                                    <strong>Отвязка провайдеров</strong> - Удалить подключенные аккаунты
                                    Discord или Steam
                                </li>
                                <li>
                                    <strong>Отзыв API-ключей</strong> - Удалить любые созданные вами
                                    API-ключи
                                </li>
                                <li>
                                    <strong>Прекращение использования сервиса</strong> - Вы можете
                                    прекратить использование сервиса в любое время
                                </li>
                                <li>
                                    <strong>Связаться с нами</strong> - Для вопросов о наших практиках
                                    конфиденциальности
                                </li>
                            </ul>
                        </section>

                        <section className='pb-6 border-b border-slate-700/50'>
                            <h2 className='text-2xl font-bold mb-4 text-purple-300'>
                                16. Прозрачность открытого исходного кода
                            </h2>
                            <p>Safeturned имеет открытый исходный код. Вы можете:</p>
                            <ul className='list-disc list-inside space-y-2 ml-4'>
                                <li>
                                    <strong>Просмотреть наш код</strong> - Весь исходный код публично
                                    доступен на GitHub
                                </li>
                                <li>
                                    <strong>Проверить наши практики</strong> - Проверить нашу фактическую
                                    реализацию обработки данных
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
                                17. Изменения в этом уведомлении
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
                                18. Контактная информация
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
