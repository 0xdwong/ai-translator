import * as chatgptTranslator  from '../index';

test('My Greeter', async() => {
    process.env.OPENAI_API_KEY = ''; // enter your key

    const translation = await chatgptTranslator.translate('hello world');
   console.log('====translation====', translation);
});

