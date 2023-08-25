import * as chatgptTranslator from './chatgpt/index';

export function init(apiKey: string) {
    process.env.OPENAI_API_KEY = apiKey;
}

export async function translate(text: string) {
    const translation = await chatgptTranslator.translate(text);
    return translation;
}