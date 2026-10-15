import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/sqlite-d1.mjs';
import {backupDatabase} from '../server/backup.mjs';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('standalone SQL preserves bind values, nulls, raw columns and atomic rollback',async()=>{
 const db=openDatabase(':memory:');await db.exec('CREATE TABLE items(id TEXT PRIMARY KEY,value TEXT)');
 const insert=db.prepare('INSERT INTO items VALUES(?,?)');
 const first=await insert.bind('a',"текст '; DROP TABLE items;--").run();assert.equal(first.meta.changes,1);
 await insert.bind('b',null).run();
 assert.equal((await db.prepare('SELECT value FROM items WHERE id=?').bind('a').first()).value,"текст '; DROP TABLE items;--");
 assert.equal(await db.prepare('SELECT value FROM items WHERE id=?').bind('missing').first(),null);
 assert.deepEqual(await db.prepare('SELECT id,value FROM items ORDER BY id').raw({columnNames:true}),[['id','value'],['a',"текст '; DROP TABLE items;--"],['b',null]]);
 await assert.rejects(db.batch([insert.bind('c','must roll back'),insert.bind('a','duplicate')]));
 assert.equal(await db.prepare('SELECT id FROM items WHERE id=?').bind('c').first(),null);
 const result=await db.batch([insert.bind('d','saved'),db.prepare('SELECT COUNT(*) n FROM items')]);assert.equal(result[1].results[0].n,3);db.close();
});

test('online backup restores committed WAL records without losing the live database',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'umnik-backup-test-'));
 const live=join(folder,'live.sqlite'),saved=join(folder,'backup.sqlite');
 const db=openDatabase(live);
 try{
  await db.exec('CREATE TABLE work(id INTEGER PRIMARY KEY,payload TEXT)');
  await db.prepare('INSERT INTO work VALUES(?,?)').bind(1,'Сохраненная версия').run();
  await backupDatabase(live,saved);
  await db.prepare('UPDATE work SET payload=? WHERE id=1').bind('Следующая версия').run();
  const copy=new DatabaseSync(saved,{readOnly:true});
  try{assert.equal(copy.prepare('SELECT payload FROM work').get().payload,'Сохраненная версия');assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{copy.close();}
  assert.equal((await db.prepare('SELECT payload FROM work').first()).payload,'Следующая версия');
 }finally{db.close();rmSync(folder,{recursive:true,force:true});}
});

