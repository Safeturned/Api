import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const SUPPORTED_LOCALES = ['en', 'ru'];

function loadMessages(locale) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Failed to load ${locale}.json:`, error.message);
        process.exit(1);
    }
}

function getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                keys = keys.concat(getAllKeys(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }
    }
    return keys;
}

function validateLocales() {
    console.log('Validating locale files...');

    const locales = {};
    for (const locale of SUPPORTED_LOCALES) {
        locales[locale] = loadMessages(locale);
        const keys = getAllKeys(locales[locale]);
        console.log(`Loaded ${locale}: ${keys.length} keys`);
    }

    const enKeys = getAllKeys(locales.en);
    const missingKeys = {};
    let hasErrors = false;

    for (const locale of SUPPORTED_LOCALES) {
        if (locale === 'en') continue;

        const localeKeys = getAllKeys(locales[locale]);
        const missing = enKeys.filter(key => !localeKeys.includes(key));

        if (missing.length > 0) {
            missingKeys[locale] = missing;
            hasErrors = true;
            console.error(`${locale} is missing ${missing.length} keys:`, missing);
        } else {
            console.log(`${locale} has all required keys`);
        }
    }

    for (const locale of SUPPORTED_LOCALES) {
        if (locale === 'en') continue;

        const localeKeys = getAllKeys(locales[locale]);
        const extra = localeKeys.filter(key => !enKeys.includes(key));

        if (extra.length > 0) {
            console.warn(`${locale} has extra keys:`, extra);
        }
    }

    if (hasErrors) {
        console.error('\nLocale validation failed!');
        console.error('Missing keys found. Please add missing translations.');
        process.exit(1);
    } else {
        console.log('\nAll locales are valid!');
    }
}

validateLocales();

export { validateLocales };
