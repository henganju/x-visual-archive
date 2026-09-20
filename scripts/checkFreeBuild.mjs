import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
assert(existsSync('dist/_worker.js'),'Build first.');
assert(!existsSync('dist/data/archive.json'),'Demo data must not ship.');
for(const name of readdirSync('dist/assets').filter(n=>n.endsWith('.js'))){const text=readFileSync('dist/assets/'+name,'utf8');assert(!text.includes('api.x.com'));assert(!text.includes('X_BEARER_TOKEN'));assert(!text.includes('picsum.photos'))}
console.log('Free production build verified: no paid API, credentials, or demo dataset in frontend.');
