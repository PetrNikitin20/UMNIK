import {env} from '@/lib/runtime-env';
import {digest} from '@/lib/security';
import {newsSources,parseUmnikFeed,pageContent,reviewedNews} from '@/lib/news';
const db=()=>{if(!env.DB)throw new Error('База данных недоступна');return env.DB;};
const stmt=(sql:string,...values:unknown[])=>db().prepare(sql).bind(...values);
const first=<T,>(sql:string,...values:unknown[])=>stmt(sql,...values).first<T>();
const now=()=>new Date().toISOString();
const auditStmt=(actor:string|null,event:string,target:string|null,detail:unknown)=>stmt('INSERT INTO audit(id,actor_id,event,target_id,detail,created_at) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),actor,event,target,JSON.stringify(detail),now());
export async function syncNews(actor:string|null) {
 const checks=[];
 for(const {url:source,name,kind} of newsSources) {
  try {
   const res=await fetch(source,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'UMNIK-Educational-Tracker/1.0'},redirect:'manual'});
   if(!res.ok) throw new Error(`Источник вернул HTTP ${res.status}`);
   const text=await res.text();if(text.length>1000000)throw new Error('Источник превышает допустимый размер');
   const candidates=kind==='rss'?parseUmnikFeed(text):[];
   const normalized=kind==='rss'?JSON.stringify(candidates):pageContent(text);
   if(!normalized||kind==='page'&&!/умник/iu.test(normalized))throw new Error('Содержимое источника не распознано; проверьте вручную');
   const sourceHash=await digest(normalized);
   const prior=await first<{value:string}>('SELECT value FROM settings WHERE key=?','source:'+source);
   const changed=prior?.value!==sourceHash;
   const statements=[stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','source:'+source,sourceHash)];
   // Stable IDs prevent repeated/concurrent checks from duplicating drafts, including archived ones.
   if(kind==='rss')for(const item of candidates) {
    const hash=await digest(JSON.stringify(item));
    const body=`Региональное представительство ФСИ · Саратовская область. Дата публикации: ${item.publicationDate} (московский календарь). Краткое описание источника: ${item.summary}\n\nЧерновик для проверки преподавателем. Откройте источник, уточните территорию участия и актуальность дат. Региональное объявление не подтверждает прием для студентов в Москве. Укажите дату события только после сверки.`;
    statements.push(stmt('INSERT OR IGNORE INTO news(id,title,body,source,status,source_hash,checked_at,created_at) VALUES(?,?,?,?,?,?,?,?)','source-'+hash,'Региональный источник · '+item.title,body,item.source,'draft',hash,now(),now()));
   }
   else if(changed) {
    const start=Math.max(0,normalized.toLowerCase().indexOf('умник')-100);
    statements.push(stmt('INSERT OR IGNORE INTO news(id,title,body,source,status,source_hash,checked_at,created_at) VALUES(?,?,?,?,?,?,?,?)','source-'+await digest(source+sourceHash),'Обновление источника Фонда требует проверки',normalized.slice(start,start+700)+'\n\nКраткий фрагмент. Откройте источник и проверьте актуальные сведения перед публикацией.',source,'draft',sourceHash,now(),now()));
   }
   const saved=await db().batch(statements);checks.push({source,name,ok:true,changed,found:candidates.length,created:saved.slice(1).reduce((sum,r)=>sum+(r.meta.changes||0),0)});
  }catch(err){checks.push({source,name,ok:false,message:err instanceof Error?err.message:'Источник недоступен'});}
 }
 const timestamp=now(),report={at:timestamp,checks};
 // Only these code-reviewed summaries can be published by synchronization. Imported items remain drafts.
 await db().batch([...reviewedNews.map(x=>stmt('INSERT OR IGNORE INTO news(id,title,body,source,event_date,status,checked_at,created_at) VALUES(?,?,?,?,?,?,?,?)',x.id,x.title,x.body,x.source,x.eventDate,'published',timestamp,timestamp)),stmt('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','newsLastCheck',JSON.stringify(report)),auditStmt(actor,'news_check',null,report)]);
 return report;
}
