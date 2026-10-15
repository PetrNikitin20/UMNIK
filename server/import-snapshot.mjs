import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {migrate} from './migrate.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node server/import-snapshot.mjs PRIVATE_SNAPSHOT NEW_DATABASE');
const snapshot=JSON.parse(readFileSync(resolve(input),'utf8'));
if(snapshot.format!=='umnik-d1-snapshot-v1')throw new Error('Unknown snapshot format');
const filename=resolve(output);migrate(filename);const db=new DatabaseSync(filename);
const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name<>'_node_migrations'").all().map(r=>r.name);
for(const name of names){if(db.prepare('SELECT COUNT(*) n FROM "'+name+'"').get().n)throw new Error('Target database is not empty');}
const skipped=new Set(['sessions','limits']);const counts={};
db.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
try{
 for(const [name,table] of Object.entries(snapshot.tables)){
  if(!names.includes(name)||!Array.isArray(table.rows))throw new Error('Unknown table in snapshot');
  if(skipped.has(name)){counts[name]=0;continue;}
  const allowed=new Set(db.prepare('PRAGMA table_info("'+name+'")').all().map(r=>r.name));
  const columns=table.columns;if(!columns.every(c=>allowed.has(c)&&/^\w+$/.test(c)))throw new Error('Invalid columns');
  const statement=db.prepare('INSERT INTO "'+name+'" ('+columns.map(c=>'"'+c+'"').join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
  for(const row of table.rows)statement.run(...columns.map(c=>row[c]??null));
  counts[name]=table.rows.length;
 }
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key check failed');
 if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Database integrity check failed');
 db.exec('COMMIT');
}catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
console.log(JSON.stringify({imported:counts,notice:'Sessions and rate limits start empty; passwords are preserved'}));

