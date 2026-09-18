import {readFile} from 'node:fs/promises';import {verifyProduction} from './production-check.ts';
try{const root=process.argv.includes('--dist')?'dist':'public';console.log(verifyProduction(JSON.parse(await readFile(`${root}/data/archive.json`,'utf8')),JSON.parse(await readFile(`${root}/data/archive-meta.json`,'utf8'))));}catch(e){console.error((e as Error).message);process.exitCode=1;}
