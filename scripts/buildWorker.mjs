import {build} from 'esbuild';
import {rm,writeFile} from 'node:fs/promises';
await build({entryPoints:['server/worker.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/_worker.js'});
// Historical photo demo files are local development artifacts, never production content.
await rm('dist/data',{recursive:true,force:true});
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
