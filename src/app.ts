import * as chatgptTranslator from './chatgpt/index';

export function init(apiKey: string) {
    process.env.OPENAI_API_KEY = apiKey;
}

export async function translate(text: string) {
    const translation = await chatgptTranslator.translate(text);
    return translation;
}

async function main(){
    init('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')
    await translate('hello world');
}

main();