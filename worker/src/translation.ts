import { Env } from './types';

/**
 * Supported Indian languages (AI4Bharat dataset coverage)
 */
export const SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'हिन्दी (Hindi)',
    'bn': 'বাংলা (Bengali)',
    'ta': 'தமிழ் (Tamil)',
    'te': 'తెలుగు (Telugu)',
    'mr': 'मराठी (Marathi)',
    'gu': 'ગુજરાતી (Gujarati)',
    'kn': 'ಕನ್ನಡ (Kannada)',
    'ml': 'മലയാളം (Malayalam)',
    'pa': 'ਪੰਜਾਬੀ (Punjabi)',
    'or': 'ଓଡ଼ିଆ (Odia)',
    'as': 'অসমীয়া (Assamese)',
    'ur': 'اردو (Urdu)',
    'sa': 'संस्कृत (Sanskrit)',
    'mai': 'मैथिली (Maithili)',
    'sd': 'سنڌي (Sindhi)',
    'ne': 'नेपाली (Nepali)',
    'ks': 'कॉशुर (Kashmiri)',
    'doi': 'डोगरी (Dogri)',
    'sat': 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)',
    'mni': 'ꯃꯩꯇꯩꯂꯣꯟ (Manipuri)',
    'kok': 'कोंकणी (Konkani)'
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Detect if text is in English (simple heuristic)
 */
export function isEnglish(text: string): boolean {
    // Check if text is primarily ASCII characters
    const asciiRatio = text.split('').filter(c => c.charCodeAt(0) < 128).length / text.length;
    return asciiRatio > 0.7;
}

/**
 * Detect if text is in Hindi
 */
export function isHindi(text: string): boolean {
    // Devanagari script range: U+0900 to U+097F
    const devanagariRegex = /[\u0900-\u097F]/;
    return devanagariRegex.test(text);
}

/**
 * Universal translate function - translates between any two languages
 */
export async function translate(
    text: string,
    targetLang: LanguageCode,
    sourceLang?: LanguageCode,
    env?: Env
): Promise<string> {
    try {
        // If no source language specified, auto-detect
        if (!sourceLang) {
            sourceLang = isEnglish(text) ? 'en' : 'hi'; // Default to Hindi if not English
        }

        // If source and target are the same, return original
        if (sourceLang === targetLang) {
            return text;
        }

        // Use M2M100 for translation
        if (env) {
            const response: any = await env.AI.run('@cf/meta/m2m100-1.2b', {
                text: text,
                source_lang: sourceLang,
                target_lang: targetLang
            });

            return response.translated_text || text;
        }

        return text;
    } catch (error) {
        console.error(`Translation error (${sourceLang} -> ${targetLang}):`, error);
        return text; // Return original on error
    }
}

/**
 * Translate to English (from any Indian language)
 */
export async function translateToEnglish(text: string, env: Env, sourceLang?: LanguageCode): Promise<string> {
    return translate(text, 'en', sourceLang, env);
}

/**
 * Translate from English to target language
 */
export async function translateFromEnglish(text: string, targetLang: LanguageCode, env: Env): Promise<string> {
    return translate(text, targetLang, 'en', env);
}

/**
 * Legacy: Translate to Hindi (kept for backward compatibility)
 */
export async function translateToHindi(text: string, env: Env): Promise<string> {
    return translateFromEnglish(text, 'hi', env);
}
