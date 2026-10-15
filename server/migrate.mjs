import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export function migrate(filename){
 mkdirSync(dirname(filename),{recursive:true,mode:0o700});
 const db=new DatabaseSync(filename);
 db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
 db.exec('CREATE TABLE IF NOT EXISTS _node_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)');
 const dir=resolve(dirname(fileURLToPath(import.meta.url)),'../drizzle');
 for(const name of readdirSync(dir).filter(x=>/^\d.*\.sql$/.test(x)).sort()){
  if(db.prepare('SELECT name FROM _node_migrations WHERE name=?').get(name))continue;
  db.exec('BEGIN IMMEDIATE');
  try{db.exec(readFileSync(resolve(dir,name),'utf8'));db.prepare('INSERT INTO _node_migrations VALUES(?,?)').run(name,new Date().toISOString());db.exec('COMMIT');}
  catch(e){db.exec('ROLLBACK');throw e;}
 }
 db.close();
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const filename=resolve(process.env.DATABASE_PATH||'data/umnik.sqlite');migrate(filename);console.log('Database migrations complete');
}

