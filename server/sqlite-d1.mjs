import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export function openDatabase(filename){
 if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true,mode:0o700});
 const sqlite=new DatabaseSync(filename);
 sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 if(filename!==':memory:')sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
 const result=(results,changes=0,last=0)=>({success:true,results,meta:{changes,last_row_id:Number(last),duration:0,rows_read:results.length,rows_written:changes,changed_db:changes>0,size_after:0}});
 class Statement{
  constructor(sql,values=[]){this.sql=sql;this.values=values;}
  bind(...values){return new Statement(this.sql,values);}
  execute(){
   const query=sqlite.prepare(this.sql);
   if(query.columns().length)return result(query.all(...this.values));
   const r=query.run(...this.values);return result([],Number(r.changes),r.lastInsertRowid);
  }
  async all(){return this.execute();}
  async run(){return this.execute();}
  async first(column){const row=this.execute().results[0];if(!row)return null;if(column!==undefined){if(!(column in row))throw new Error('Unknown column');return row[column];}return row;}
  async raw(options){const query=sqlite.prepare(this.sql),columns=query.columns().map(x=>x.name),rows=query.all(...this.values).map(row=>columns.map(c=>row[c]));return options?.columnNames?[columns,...rows]:rows;}
 }
 const api={
  prepare(sql){return new Statement(sql);},
  async batch(statements){
   sqlite.exec('BEGIN IMMEDIATE');
   try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}
   catch(e){sqlite.exec('ROLLBACK');throw e;}
  },
  async exec(sql){sqlite.exec(sql);return {count:0,duration:0};},
  close(){sqlite.close();},
  sqlite
 };
 return api;
}

