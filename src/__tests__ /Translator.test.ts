import * as chatgptTranslator  from '../index';

test('My Greeter', async() => {
    process.env.OPENAI_API_KEY = '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';

    const translation = await chatgptTranslator.translate('hello world');
   console.log('====translation====', translation);
});

