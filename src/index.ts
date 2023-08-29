import * as chatgptTranslator from './chatgpt/index';


export function init(obj: {OPENAI_API_KEY: string}) {
    chatgptTranslator.config.OPENAI_API_KEY = obj.OPENAI_API_KEY;
}

export async function translate(text: string) {
    const translation = await chatgptTranslator.translate(text);
    return translation;
}