import * as chatgptTranslator  from '../index';

test('My Greeter', async() => {
    chatgptTranslator.init({'OPENAI_API_KEY': ''});
    const translation = await chatgptTranslator.translate('hello world');
   console.log('====translation====', translation);
});

