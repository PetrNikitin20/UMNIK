import {resolve} from 'node:path';
import {openDatabase} from './sqlite-d1.mjs';
type Environment=typeof import('cloudflare:workers').env & {DEPLOYMENT_MODE?:string};
let database:ReturnType<typeof openDatabase>|undefined;
export const env=new Proxy({} as Environment,{
 get(_target,key){
  if(key==='DEPLOYMENT_MODE')return 'standalone';
  if(key==='DB')return database??=openDatabase(resolve(process.env.DATABASE_PATH||'data/umnik.sqlite'));
  return typeof key==='string'?process.env[key]:undefined;
 }
});

