import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import type {Database,Statement} from './worker.ts';
export function localDatabase(path=':memory:'):Database {
 const db=new DatabaseSync(path);db.exec(readFileSync(new URL('../migrations/0001_archive.sql',import.meta.url),'utf8'));
 class Query implements Statement {
  values:any[]=[];sql:string;constructor(sql:string){this.sql=sql}bind(...v:unknown[]){this.values=v;return this}
  async first<T>(){return (db.prepare(this.sql).get(...this.values)||null) as T|null}
  async all<T>(){return {results:db.prepare(this.sql).all(...this.values) as T[]}}
  async run(){return {meta:{changes:Number(db.prepare(this.sql).run(...this.values).changes)}}}
 }
 return {prepare(sql){return new Query(sql)},async batch(items){db.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};
}
export function localEnv(){mkdirSync('.state',{recursive:true});if(!existsSync('.dev.vars'))writeFileSync('.dev.vars',`ADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\n`);const password=readFileSync('.dev.vars','utf8').match(/^ADMIN_PASSWORD=(.+)$/m)?.[1]?.trim()||'';return {DB:localDatabase('.state/curated.sqlite'),ADMIN_PASSWORD:password}}
