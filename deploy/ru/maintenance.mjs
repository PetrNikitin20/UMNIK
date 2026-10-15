import {backupDatabase} from '../../server/backup.mjs';
import {mkdirSync,readdirSync,statSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
const folder=resolve(process.env.BACKUP_DIR||'backups');
mkdirSync(folder,{recursive:true,mode:0o700});
const database=resolve(process.env.DATABASE_PATH||'data/umnik.sqlite');
const formatted=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
let backupDay='',newsDay='',newsRetryAt=0;
async function tick(){
 const p=Object.fromEntries(formatted.formatToParts(new Date()).map(x=>[x.type,x.value]));
 const day=p.year+'-'+p.month+'-'+p.day,hour=Number(p.hour);
 if(!backupDay||backupDay!==day&&hour>=4){
  const filename=resolve(folder,'umnik-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
  await backupDatabase(database,filename);backupDay=day;console.log('Database backup complete');
  const expiry=Date.now()-14*86400000;
  for(const name of readdirSync(folder))if(/^umnik-\d{4}-\d{2}-\d{2}T[\dZ-]+\.sqlite$/.test(name)){
   const file=resolve(folder,name);if(statSync(file).mtimeMs<expiry)unlinkSync(file);
  }
 }
 if(process.env.NEWS_SYNC_TOKEN&&Date.now()>=newsRetryAt&&(!newsDay||newsDay!==day&&hour>=9)){
  newsRetryAt=Date.now()+30*60000;
  const response=await fetch((process.env.APP_INTERNAL_ORIGIN||'http://app:3000')+'/api/news/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.NEWS_SYNC_TOKEN},body:'{}',signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error('News sync failed: '+response.status);
  newsDay=day;console.log('News sources checked; new items stay in drafts');
 }
}
while(true){try{await tick();}catch(e){console.error(e instanceof Error?e.message:'Maintenance failed');}await new Promise(r=>setTimeout(r,60000));}

