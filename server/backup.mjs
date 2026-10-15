import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
export async function backupDatabase(source,destination){
 mkdirSync(dirname(destination),{recursive:true,mode:0o700});
 const db=new DatabaseSync(source,{readOnly:true});
 try{await backup(db,destination);chmodSync(destination,0o600);}
 finally{db.close();}
 const copy=new DatabaseSync(destination,{readOnly:true});
 try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup integrity check failed');}
 finally{copy.close();}
}
