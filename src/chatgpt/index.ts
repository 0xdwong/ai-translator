import * as fs from 'fs/promises';
import * as path from 'path';

import * as dotenv from 'dotenv';
import minimist from 'minimist';
import configureApiCaller, { ApiCaller, ApiOptions } from './api';
import {
  replaceCodeBlocks,
  restoreCodeBlocks,
  splitStringAtBlankLines
} from './md-utils';
import { Status, statusToText } from './status';

// Run this like:
// npx ts-node-esm index.ts <file_name>


dotenv.config();
// export const apiKey = process.env.OPENAI_API_KEY;
// const baseDir = process.env.GPT_TRANSLATOR_BASE_DIR ?? process.cwd();
// const promptFile = path.resolve(
//   process.cwd(),
//   'src/chatgpt/prompt.md'
// );

export let config = {
  "OPENAI_API_KEY": "",
}


const checkConfiguration = async () => {
  const errors = [];
  if (!config.OPENAI_API_KEY) {
    errors.push('The OPENAI_API_KEY environment variable is not set.');
  }
  // try {
  //   await fs.access(promptFile);
  // } catch (e) {
  //   errors.push(`The prompt file "${promptFile}" does not exist.`);
  // }
  if (errors.length) {
    console.error('Errors:');
    console.error(errors.join('\n'));
    // process.exit(1);
    throw "configuration error";
  }
};

const translateMultiple = async (
  callApi: ApiCaller,
  fragments: string[],
  instruction: string,
  apiOptions: ApiOptions,
  onStatus: (status: Status) => void
) => {
  const statuses: Status[] = new Array(fragments.length).fill(0).map(() => ({
    status: 'waiting'
  }));
  onStatus({ status: 'pending', lastToken: '' });
  const handleNewStatus = (index: number) => {
    return (status: Status) => {
      statuses[index] = status;
      onStatus({
        status: 'pending',
        lastToken: `[${statuses.map(statusToText).join(', ')}]`
      });
    };
  };
  const results = await Promise.all(
    fragments.map((fragment, index) =>
      translateOne(
        callApi,
        fragment,
        instruction,
        apiOptions,
        handleNewStatus(index)
      )
    )
  );
  const finalResult = results.join('\n\n');
  onStatus({ status: 'done', translation: finalResult });
  return finalResult;
};

const translateOne = async (
  callApi: ApiCaller,
  text: string,
  instruction: string,
  apiOptions: ApiOptions,
  onStatus: (status: Status) => void
): Promise<string> => {
  onStatus({ status: 'waiting' });
  const res = await callApi(text, instruction, apiOptions, onStatus);

  if (
    res.status === 'error' &&
    res.message.match(/reduce the length|stream read error/i)
  ) {
    // Looks like the input was too long, so split the text in half and retry
    const splitResult = splitStringAtBlankLines(text, 0);
    console.log(
      'Split: ',
      splitResult?.map(s => s.length + ':' + s.slice(0, 20)).join(', ')
    );
    console.log('\n\n');
    if (splitResult === null) return text; // perhaps code blocks only
    return await translateMultiple(
      callApi,
      splitResult,
      instruction,
      apiOptions,
      onStatus
    );
  }

  if (res.status === 'error') throw new Error(res.message);
  return (res as { translation: string }).translation;
};

const resolveModelShorthand = (model: string): string => {
  const shorthands: { [key: string]: string } = {
    '4': 'gpt-4',
    '4large': 'gpt-4-32k',
    '3': 'gpt-3.5-turbo'
  };
  return shorthands[model] ?? model;
};

const readTextFile = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      console.error(`File not found: ${filePath}`);
      // process.exit(1);
    } else {
      throw e;
    }
  }
};

export async function translate(text: string) {
  await checkConfiguration();

  // const args = minimist(process.argv.slice(2));
  // const model = resolveModelShorthand(args.m ?? process.env.MODEL_NAME ?? '3');
  // const temperature = Number(args.t) || Number(process.env.TEMPERATURE) || 0.1;
  // const fragmentSize =
  //   Number(args.f) || Number(process.env.FRAGMENT_TOKEN_SIZE) || 2048;
  // const apiCallInterval =
  //   Number(args.i) || Number(process.env.API_CALL_INTERVAL) || 0;
  // const httpsProxy = process.env.HTTPS_PROXY;

    const model = resolveModelShorthand('3');
  const temperature = 0.1;
  const fragmentSize = 2048;
  const apiCallInterval = 0;
  const httpsProxy = "";


  // if (args._.length !== 1)
  //   throw new Error('Specify one (and only one) markdown file.');
  // const file = args._[0] as string;

  // const filePath = path.resolve(baseDir, file);

  // const markdown = await readTextFile(filePath);
  const markdown = text;

  // const instruction = await readTextFile(promptFile);
  const instruction =`
  I am translating the React documentation for Chinese
  Please translate the Markdown content I'll paste later to Chinese.
  
  You must strictly follow the rules below.
  
  - Never change the Markdown markup structure. Don't add or remove links. Do not change any URL.
  - Never change the contents of code blocks even if they appear to have a bug. Importantly, never touch lines containing the \`omittedCodeBlock-xxxxxx\` keyword.
  - Always preserve the original line breaks. Do not add or remove blank lines.
  - Never touch the permalink such as \`{/*try-react*/}\` at the end of each heading.
  - Never touch HTML-like tags such as \`<Notes>\` or \`<YouWillLearn>\`.
  `;

  const { output: replacedMd, codeBlocks } = replaceCodeBlocks(markdown);
  const fragments = splitStringAtBlankLines(replacedMd, fragmentSize)!;

  let status: Status = { status: 'pending', lastToken: '' };

  // console.log(`Translating ${file}...\n`);
  console.log(`Translating ...\n`);

  console.log(`Model: ${model}, Temperature: ${temperature}\n\n`);
  const printStatus = () => {
    // process.stdout.write('\x1b[1A\x1b[2K'); // clear previous line
    console.log('\n');
    console.log(statusToText(status));
  };
  printStatus();

  const callApi = configureApiCaller({
    apiKey: config.OPENAI_API_KEY!,
    rateLimit: apiCallInterval,
    httpsProxy
  });

  const translatedText = await translateMultiple(
    callApi,
    fragments,
    instruction,
    { model, temperature },
    newStatus => {
      status = newStatus;
      printStatus();
    }
  );

  const finalResult = restoreCodeBlocks(translatedText, codeBlocks) + '\n';

  // await fs.writeFile(filePath, finalResult, 'utf-8');
  // console.log(`\nTranslation done! Saved to ${filePath}.`);
  console.log(`\nTranslation done!.`);
  return finalResult;
};

