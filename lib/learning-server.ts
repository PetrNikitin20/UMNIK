import {env} from '@/lib/runtime-env';
import {competencies,modules,starterCourses,starterAssignments,RUBRIC_VERSION,validateExperiment,experimentFeedback,competencySummary,cohortSummary,type Evidence} from './learning';
import {blank} from './workbook';
import {digest,passwordHash,token} from './security';
import {isCalendarDate,reportInterval} from './calendar';
export type Actor={id:string;name:string;login:string;role:string;must_change:number};
type Assignment={id:string;course_id:string;module_id:string;title:string;instruction:string;deadline:string|null;rubric_version:string;active:number;course_status:string;module_version:string};
type Work={id:string;user_id:string;assignment_id:string;version:number;submitted_version:number|null;source_work:string|null;updated_at:string};
export class LearningError extends Error{constructor(message:string,public status=400){super(message);}}
const db=()=>{if(!env.DB)throw new LearningError('База данных недоступна',503);return env.DB;};
const now=()=>new Date().toISOString();
const stmt=(sql:string,...values:unknown[])=>db().prepare(sql).bind(...values);
const first=<T,>(sql:string,...values:unknown[])=>stmt(sql,...values).first<T>();
const rows=async<T=Record<string,any>>(sql:string,...values:unknown[])=>(await stmt(sql,...values).all<T>()).results;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const audit=(u:Actor,event:string,target:string|null,detail:unknown)=>stmt('INSERT INTO audit(id,actor_id,event,target_id,detail,created_at) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),u.id,event,target,JSON.stringify(detail),now());
const workKey=(assignment:string)=>assignment==='research-umnik'?'umnik-main':assignment;
const workId=(user:string,assignment:string)=>user+'::'+assignment;
function requireActor(u:Actor|null){if(!u)throw new LearningError('Войдите в учетную запись',401);if(u.must_change)throw new LearningError('Смените временный пароль',403);return u;}
function requireTeacher(u:Actor){if(!['admin','teacher'].includes(u.role))throw new LearningError('Требуется роль преподавателя',403);}
function requireAdmin(u:Actor){if(u.role!=='admin')throw new LearningError('Требуется роль администратора',403);}
function value(body:Record<string,unknown>,key:string,min:number,max:number){const v=body[key];if(typeof v!=='string'||v.trim().length<min||v.length>max)throw new LearningError('Проверьте поле «'+key+'»');return v.trim();}
async function rate(key:string,max:number,seconds:number){const time=Math.floor(Date.now()/1000);await stmt('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN ? ELSE expires END',key,time+seconds,time,time,time+seconds).run();if((await first<{count:number}>('SELECT count FROM limits WHERE key=?',key))!.count>max)throw new LearningError('Слишком много запросов. Повторите позже.',429);}
// Only data initialization lives here. All DDL is in immutable Drizzle migrations.
export async function ensureLearning(){
 if(await first('SELECT key FROM settings WHERE key=?','learning-catalog-v1'))return;
 const timestamp=now(),batch=[];
 for(const c of starterCourses)batch.push(stmt('INSERT OR IGNORE INTO courses(id,slug,title,description,category,semester,status,created_at) VALUES(?,?,?,?,?,?,?,?)',c.id,c.slug,c.title,c.description,c.category,c.semester,'published',timestamp));
 for(const m of modules)batch.push(stmt('INSERT OR IGNORE INTO learning_modules(id,title,version,description) VALUES(?,?,?,?)',m.id,m.title,m.version,m.description));
 for(const c of competencies)batch.push(stmt('INSERT OR IGNORE INTO competencies(id,title,description,rubric_version) VALUES(?,?,?,?)',c.id,c.title,c.description,RUBRIC_VERSION));
 for(const a of starterAssignments){batch.push(stmt('INSERT OR IGNORE INTO assignments(id,course_id,module_id,title,instruction,rubric_version,active,created_at) VALUES(?,?,?,?,?,?,1,?)',a.id,a.course,a.module,a.title,a.instruction,RUBRIC_VERSION,timestamp));for(const c of a.competencies)batch.push(stmt('INSERT OR IGNORE INTO assignment_competencies(assignment_id,competency_id) VALUES(?,?)',a.id,c));}
 batch.push(stmt("INSERT OR IGNORE INTO enrollments(id,course_id,user_id,status,created_at) SELECT 'legacy-enrollment-'||id,'research-seminar',id,'active',? FROM users WHERE role='student'",timestamp));
 batch.push(stmt("INSERT OR IGNORE INTO course_teachers(course_id,user_id) SELECT c.id,u.id FROM courses c CROSS JOIN users u WHERE u.role='admin'"));
 batch.push(stmt("INSERT OR IGNORE INTO learning_works(id,user_id,assignment_id,version,updated_at) SELECT user_id||'::research-umnik',user_id,'research-umnik',MAX(version),MAX(created_at) FROM revisions WHERE work_key='umnik-main' GROUP BY user_id"));
 batch.push(stmt('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)','learning-catalog-v1',timestamp));
 await db().batch(batch);
}
async function teachingCourse(u:Actor,course:string){requireTeacher(u);if(u.role==='admin')return;if(!await first('SELECT course_id FROM course_teachers WHERE course_id=? AND user_id=?',course,u.id))throw new LearningError('Нет доступа к этой дисциплине',403);}
async function assignmentFor(u:Actor,id:string,write=true){
 const a=await first<Assignment>('SELECT a.*,c.status course_status,m.version module_version FROM assignments a JOIN courses c ON c.id=a.course_id JOIN learning_modules m ON m.id=a.module_id WHERE a.id=?',id);
 if(!a)throw new LearningError('Задание не найдено',404);
 if(u.role!=='student'){await teachingCourse(u,a.course_id);return a;}
 const e=await first<{status:string}>('SELECT status FROM enrollments WHERE user_id=? AND course_id=?',u.id,a.course_id);
 if(!e||write&&(e.status!=='active'||!a.active||a.course_status!=='published'))throw new LearningError('Сначала выберите доступную дисциплину в каталоге',403);
 return a;
}
async function getWork(u:Actor,a:Assignment){
 const id=workId(u.id,a.id);await stmt('INSERT OR IGNORE INTO learning_works(id,user_id,assignment_id,updated_at) VALUES(?,?,?,?)',id,u.id,a.id,now()).run();
 return (await first<Work>('SELECT * FROM learning_works WHERE id=?',id))!;
}
// A conditional duplicate primary key aborts the whole D1 batch on a stale version.
function versionGuard(w:Work,submitted=false){return stmt(`INSERT INTO learning_works(id,user_id,assignment_id,version,updated_at) SELECT id,user_id,assignment_id,version,updated_at FROM learning_works WHERE id=? AND (version<>?${submitted?' OR submitted_version IS NULL OR submitted_version<>version':''})`,w.id,w.version);}
export async function umnikContext(req:Request,u:Actor,write=true){
 await ensureLearning();if(u.role!=='student')throw new LearningError('Рабочая заявка доступна в кабинете студента',403);
 const a=await assignmentFor(u,new URL(req.url).searchParams.get('assignment')||'research-umnik',write);
 if(a.module_id!=='umnik')throw new LearningError('Это задание использует другой симулятор');
 const w=await getWork(u,a);return {assignment:a,work:w,key:workKey(a.id)};
}
export function learningEvent(u:Actor,a:Assignment,w:Work,event:string,version:number|null,detail:unknown={},seconds=0,source='server',id=crypto.randomUUID()){
 return stmt('INSERT OR IGNORE INTO learning_events(id,user_id,assignment_id,work_id,event,version,module_version,source,seconds,detail,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',id,u.id,a.id,w.id,event,version,a.module_version,source,seconds,JSON.stringify(detail),now());
}
export function umnikMutationStatements(u:Actor,ctx:Awaited<ReturnType<typeof umnikContext>>,event:string,version:number,detail:unknown){
 return [stmt('UPDATE learning_works SET version=MAX(version,?),updated_at=CASE WHEN ?>=version THEN ? ELSE updated_at END WHERE id=?',version,version,now(),ctx.work.id),learningEvent(u,ctx.assignment,ctx.work,event,version,detail)];
}
async function courseCatalog(u:Actor|null){
 const courses=await rows("SELECT c.*,(SELECT COUNT(*) FROM assignments a WHERE a.course_id=c.id AND a.active=1) assignment_count FROM courses c WHERE c.status='published' OR ?='admin' OR (?='teacher' AND EXISTS(SELECT 1 FROM course_teachers ct WHERE ct.course_id=c.id AND ct.user_id=?)) ORDER BY c.created_at,c.title",u?.role||'',u?.role||'',u?.id||'');
 const assignments=await rows("SELECT a.*,m.title module_title,m.version module_version FROM assignments a JOIN courses c ON c.id=a.course_id JOIN learning_modules m ON m.id=a.module_id WHERE (a.active=1 AND c.status='published') OR ?='admin' OR (?='teacher' AND EXISTS(SELECT 1 FROM course_teachers ct WHERE ct.course_id=c.id AND ct.user_id=?)) ORDER BY a.created_at,a.title",u?.role||'',u?.role||'',u?.id||'');
 const links=await rows('SELECT * FROM assignment_competencies');
 return {courses,assignments:assignments.map(a=>({...a,competencies:links.filter(l=>l.assignment_id===a.id).map(l=>l.competency_id)})),modules,competencies,rubricVersion:RUBRIC_VERSION};
}
function teacherFilter(u:Actor,alias='a'){return u.role==='admin'?{sql:'1=1',params:[]}:{sql:`EXISTS(SELECT 1 FROM course_teachers ct WHERE ct.course_id=${alias}.course_id AND ct.user_id=?)`,params:[u.id]};}
async function evidenceFor(u:Actor,teacher=false){
 const scope=teacher?teacherFilter(u):{sql:'w.user_id=?',params:[u.id]};
 return rows<Evidence>(`SELECT e.*,w.user_id,w.version current_version,a.course_id,sw.version source_current_version FROM competency_evidence e JOIN learning_works w ON w.id=e.work_id JOIN assignments a ON a.id=w.assignment_id LEFT JOIN learning_works sw ON sw.id=e.transfer_source WHERE ${scope.sql} ORDER BY e.created_at DESC,e.id DESC LIMIT 10000`,...scope.params);
}
async function workState(u:Actor,a:Assignment,w:Work){
 const r=a.module_id==='umnik'?await first<{version:number;payload:string;created_at:string}>('SELECT version,payload,created_at FROM revisions WHERE user_id=? AND work_key=? ORDER BY version DESC LIMIT 1',w.user_id,workKey(a.id)):await first<{version:number;payload:string;created_at:string}>('SELECT version,payload,created_at FROM learning_revisions WHERE work_id=? ORDER BY version DESC LIMIT 1',w.id);
 const enrollment=await first<{status:string}>('SELECT status FROM enrollments WHERE user_id=? AND course_id=?',w.user_id,a.course_id);
 return {...w,editable:u.role==='student'&&u.id===w.user_id&&enrollment?.status==='active'&&a.active===1&&a.course_status==='published',version:r?.version||0,payload:r?JSON.parse(r.payload):a.module_id==='umnik'?blank():{},savedAt:r?.created_at||null,assignment:a,
  revisions:a.module_id==='umnik'?await rows('SELECT version,changes,created_at FROM revisions WHERE user_id=? AND work_key=? ORDER BY version DESC LIMIT 100',w.user_id,workKey(a.id)):await rows('SELECT version,changes,created_at FROM learning_revisions WHERE work_id=? ORDER BY version DESC LIMIT 100',w.id),
  evidence:await rows('SELECT e.*,u.name actor FROM competency_evidence e JOIN users u ON u.id=e.actor_id WHERE e.work_id=? ORDER BY e.created_at DESC,e.id DESC LIMIT 100',w.id),
 };
}
async function metrics(u:Actor,teacher=false){
 const scope=teacher?teacherFilter(u):{sql:'w.user_id=?',params:[u.id]},eventScope=teacher?teacherFilter(u):{sql:'e.user_id=?',params:[u.id]};
 const works=await rows(`SELECT w.*,a.title assignment_title,a.course_id,a.module_id,c.title course_title,u.name,u.login FROM learning_works w JOIN assignments a ON a.id=w.assignment_id JOIN courses c ON c.id=a.course_id JOIN users u ON u.id=w.user_id WHERE ${scope.sql} ORDER BY w.updated_at DESC LIMIT 3000`,...scope.params);
 const events=await rows(`SELECT e.user_id,e.assignment_id,e.event,e.source,COUNT(*) count,SUM(e.seconds) seconds FROM learning_events e JOIN assignments a ON a.id=e.assignment_id WHERE ${eventScope.sql} GROUP BY e.user_id,e.assignment_id,e.event,e.source`,...eventScope.params);
 const evidence=await evidenceFor(u,teacher);
 return {works,events,evidence,competencies:teacher?[]:competencySummary(evidence),analytics:teacher?cohortSummary(evidence):[],rubricVersion:RUBRIC_VERSION,notice:'Баллы компетенций выставляет преподаватель. Активное время — оценка по действиям в видимой вкладке; это не оценка знаний. Старые версии не считаются текущими итоговыми доказательствами. Выгрузка оценок ограничена 10 000 записями, работ — 3 000.'};
}
function csv(values:Record<string,unknown>[]){const keys=Object.keys(values[0]||{Сообщение:'Нет записей'});const cell=(v:unknown)=>{let s=typeof v==='object'?JSON.stringify(v):String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return '\uFEFF'+[keys.map(cell).join(';'),...values.map(r=>keys.map(k=>cell(r[k])).join(';'))].join('\r\n');}
async function exportReport(u:Actor,url:URL){
 requireTeacher(u);const kind=url.searchParams.get('kind')||'progress',from=url.searchParams.get('from')||'2000-01-01',to=url.searchParams.get('to')||'2100-01-01';
 let interval:ReturnType<typeof reportInterval>;try{interval=reportInterval(from,to);}catch{throw new LearningError('Проверьте период отчета');}
 const scope=teacherFilter(u),course=url.searchParams.get('course')||'';if(course)await teachingCourse(u,course);
 const condition=scope.sql+(course?' AND a.course_id=?':''),params=[...scope.params,...course?[course]:[]];let data:Record<string,unknown>[];
 if(kind==='archive'){
  requireAdmin(u);const tables=['users','courses','course_teachers','enrollments','learning_modules','competencies','assignments','assignment_competencies','learning_works','learning_revisions','learning_events','competency_evidence','revisions','evaluations','reviews','news','audit'];
  const result=await db().batch(tables.map(t=>stmt(t==='users'?'SELECT id,name,login,role,active,must_change,created_at,last_login FROM users':`SELECT * FROM ${t}`)));await audit(u,'learning_archive',null,{tables}).run();
  return Response.json({format:'learning-laboratory-archive-v1',createdAt:now(),notice:'Полная учебная выгрузка без паролей, сессий и серверных секретов. Не заменяет резервную копию БД. Период и фильтр дисциплины не применяются.',tables:Object.fromEntries(tables.map((t,i)=>[t,result[i].results]))},{headers:{'Cache-Control':'no-store','Content-Disposition':'attachment; filename="learning-archive.json"'}});
 }
 if(kind==='progress')data=await rows(`SELECT u.name ФИО,u.login Логин,c.title Дисциплина,a.title Задание,a.module_id Симулятор,w.version Версия,w.submitted_version Отправленная_версия,w.updated_at Изменено_UTC FROM learning_works w JOIN users u ON u.id=w.user_id JOIN assignments a ON a.id=w.assignment_id JOIN courses c ON c.id=a.course_id WHERE ${condition} ORDER BY c.title,u.name LIMIT 10000`,...params);
 else if(kind==='enrollments')data=await rows(`SELECT u.name ФИО,u.login Логин,c.title Дисциплина,e.status Статус,e.created_at Дата_UTC FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id WHERE ${teacherFilter(u,'e').sql}${course?' AND e.course_id=?':''} ORDER BY c.title,u.name LIMIT 10000`,...params);
 else if(kind==='events')data=await rows(`SELECT u.name ФИО,c.title Дисциплина,a.title Задание,e.event Событие,e.version Версия,e.module_version Версия_симулятора,e.source Источник,e.seconds Активные_секунды,e.created_at Дата_UTC FROM learning_events e JOIN users u ON u.id=e.user_id JOIN assignments a ON a.id=e.assignment_id JOIN courses c ON c.id=a.course_id WHERE ${condition} AND e.created_at>=? AND e.created_at<? ORDER BY e.created_at DESC LIMIT 10000`,...params,interval.start,interval.end);
 else if(['competencies','research'].includes(kind)){
  const entries=await rows(`SELECT e.*,w.user_id,w.version current_version,a.course_id,a.id assignment_id,a.title assignment_title,c.title course_title,cp.title competency_title,u.name,u.login,actor.name teacher FROM competency_evidence e JOIN learning_works w ON w.id=e.work_id JOIN assignments a ON a.id=w.assignment_id JOIN courses c ON c.id=a.course_id JOIN competencies cp ON cp.id=e.competency_id JOIN users u ON u.id=w.user_id JOIN users actor ON actor.id=e.actor_id WHERE ${condition} AND e.created_at>=? AND e.created_at<? ORDER BY e.created_at DESC,e.id DESC LIMIT 10000`,...params,interval.start,interval.end);
  const ids=new Map<string,string>();if(kind==='research')for(const r of entries)for(const [prefix,id] of [['participant',r.user_id],['work',r.work_id],['teacher',r.actor_id]])if(!ids.has(prefix+id))ids.set(prefix+id,(await digest('learning-research:'+prefix+id)).slice(0,24));
  data=entries.map(r=>({...kind==='research'?{Участник:ids.get('participant'+r.user_id),Работа:ids.get('work'+r.work_id),Оценщик:ids.get('teacher'+r.actor_id)}:{ФИО:r.name,Логин:r.login,Преподаватель:r.teacher},Дисциплина:r.course_title,Код_задания:r.assignment_id,Задание:r.assignment_title,Компетенция:r.competency_title,Этап:r.phase,Балл:r.score,Версия:r.version,Текущая_версия:r.current_version,Шкала:r.rubric_version,Симулятор:r.module_version,Связь_дисциплин:r.transfer_source?'Проверена преподавателем':'Не отмечена',Версия_источника:r.source_version,Дата_UTC:r.created_at,...kind==='research'?{}:{Комментарий:r.comment}}));
 }else throw new LearningError('Неизвестный отчет');
 await audit(u,'learning_report',course||null,{kind,from,to,rows:data.length,limit:10000,timeZone:'Europe/Moscow',pseudonymized:kind==='research'}).run();
 return new Response(csv(data),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="learning-${kind}.csv"`,'Cache-Control':'no-store','X-Report-Limit':'10000'}});
}
export async function learningGet(req:Request,user:Actor|null){
 try{await ensureLearning();const path=new URL(req.url).pathname.slice('/api/platform/'.length),url=new URL(req.url);
  if(path==='catalog')return json(await courseCatalog(user));
  const u=requireActor(user);
  if(path==='me')return json({...await courseCatalog(u),enrollments:await rows('SELECT * FROM enrollments WHERE user_id=?',u.id),...await metrics(u)});
  if(path==='metrics')return json(await metrics(u));
  if(path==='work'){
   if(u.role!=='student')throw new LearningError('Для проверки студента откройте кабинет преподавателя',403);
   const a=await assignmentFor(u,url.searchParams.get('assignment')||'',false),w=await getWork(u,a);return json(await workState(u,a,w));
  }
  if(path==='teacher'){
   requireTeacher(u);const scope=teacherFilter(u,'c');const courses=await rows(`SELECT c.* FROM courses c WHERE ${u.role==='admin'?'1=1':'EXISTS(SELECT 1 FROM course_teachers ct WHERE ct.course_id=c.id AND ct.user_id=?)'} ORDER BY c.title`,...scope.params);
   const ids=courses.map(c=>c.id),catalog=await courseCatalog(u);
   return json({...await metrics(u,true),courses,assignments:catalog.assignments.filter((a:any)=>ids.includes(a.course_id)),enrollments:await rows(`SELECT e.*,u.name,u.login FROM enrollments e JOIN users u ON u.id=e.user_id WHERE ${teacherFilter(u,'e').sql} ORDER BY e.created_at DESC`,...scope.params),teachers:u.role==='admin'?await rows("SELECT id,name,login,role,active,must_change FROM users ORDER BY name"):[],courseTeachers:u.role==='admin'?await rows('SELECT ct.*,u.name FROM course_teachers ct JOIN users u ON u.id=ct.user_id'):[],modules,competencyDefinitions:competencies});
  }
  if(path==='teacher/work'){
   requireTeacher(u);const w=await first<Work>('SELECT * FROM learning_works WHERE id=?',url.searchParams.get('id')||'');if(!w)throw new LearningError('Работа не найдена',404);const a=await assignmentFor(u,w.assignment_id,false);const author=await first('SELECT name,login FROM users WHERE id=?',w.user_id);const source=w.source_work?await first('SELECT w.id,w.version,a.course_id,c.title course_title,a.title assignment_title FROM learning_works w JOIN assignments a ON a.id=w.assignment_id JOIN courses c ON c.id=a.course_id WHERE w.id=? AND w.user_id=?',w.source_work,w.user_id):null;
   const links=await rows('SELECT competency_id FROM assignment_competencies WHERE assignment_id=?',a.id);return json({...await workState(u,a,w),author,sourceWork:source,competencies:links.map(x=>x.competency_id)});
  }
  if(path==='report')return await exportReport(u,url);
  throw new LearningError('Не найдено',404);
 }catch(e){return json({error:e instanceof LearningError?e.message:'Не удалось загрузить данные платформы'},e instanceof LearningError?e.status:500);}
}
export async function learningPost(req:Request,user:Actor|null,body:Record<string,any>){
 try{
  const u=requireActor(user);if(req.headers.get('origin')!==new URL(req.url).origin)throw new LearningError('Запрос должен поступить с сайта',403);
  await ensureLearning();const path=new URL(req.url).pathname.slice('/api/platform/'.length);
  if(path==='enroll'){
   if(u.role!=='student')throw new LearningError('Выбор дисциплин доступен студенту',403);
   const c=await first<{id:string}>('SELECT id FROM courses WHERE id=? AND status=?',body.course,'published');if(!c||typeof body.active!=='boolean')throw new LearningError('Выберите доступную дисциплину');
   await db().batch([stmt('INSERT INTO enrollments(id,course_id,user_id,status,created_at) VALUES(?,?,?,?,?) ON CONFLICT(course_id,user_id) DO UPDATE SET status=excluded.status',crypto.randomUUID(),c.id,u.id,body.active?'active':'withdrawn',now()),audit(u,body.active?'course_selected':'course_withdrawn',c.id,{})]);return json({ok:true});
  }
  if(['save','submit','activity'].includes(path)){
   if(u.role!=='student')throw new LearningError('Работу выполняет студент',403);
   const a=await assignmentFor(u,String(body.assignment||'')),w=await getWork(u,a);
   if(path==='activity'){
    await rate('learning-activity:'+u.id+':'+body.event,120,3600);
    if(!['active','hint'].includes(body.event)||typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id))throw new LearningError('Некорректное учебное событие');
    const seconds=body.event==='active'?body.seconds:0;if(!Number.isInteger(seconds)||seconds<0||seconds>30)throw new LearningError('Некорректный интервал активности');
    await learningEvent(u,a,w,body.event,w.version,{field:typeof body.field==='string'?body.field.slice(0,80):null},seconds,'client_estimate',body.id).run();return json({ok:true});
   }
   if(path==='save'){
    if(a.module_id!=='experiment')throw new LearningError('Для УМНИК используйте рабочую тетрадь');await rate('learning-save:'+u.id,180,3600);
    let payload:Record<string,string>;try{payload=validateExperiment(body.payload);}catch(e){throw new LearningError((e as Error).message);}
    if(body.version!==w.version)throw new LearningError('Работа изменена в другой вкладке. Загрузите актуальную версию.',409);
    const source=typeof body.sourceWork==='string'&&body.sourceWork?body.sourceWork:null;
    if(source){const sw=await first<{course_id:string;version:number}>('SELECT a.course_id,w.version FROM learning_works w JOIN assignments a ON a.id=w.assignment_id WHERE w.id=? AND w.user_id=?',source,u.id);if(!sw||sw.course_id===a.course_id||sw.version<1)throw new LearningError('Выберите свою сохраненную работу из другой дисциплины');}
    const previous=await first<{payload:string}>('SELECT payload FROM learning_revisions WHERE work_id=? ORDER BY version DESC LIMIT 1',w.id),old=previous?JSON.parse(previous.payload):{},full={...payload,_sourceWork:source};
    const changes=Object.keys(full).filter(k=>JSON.stringify(old[k]??(k==='_sourceWork'?null:''))!==JSON.stringify(full[k as keyof typeof full])).map(k=>({field:k,before:old[k]??'',after:full[k as keyof typeof full]}));
    if(!changes.length)return json({version:w.version,savedAt:w.updated_at,feedback:experimentFeedback(payload)});
    const timestamp=now(),next=w.version+1;
    try{await db().batch([stmt('INSERT INTO learning_revisions(id,work_id,version,payload,changes,created_at) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),w.id,next,JSON.stringify(full),JSON.stringify(changes),timestamp),stmt('UPDATE learning_works SET version=?,source_work=?,updated_at=? WHERE id=? AND version=?',next,source,timestamp,w.id,w.version),learningEvent(u,a,w,'saved',next,{fields:changes.map(c=>c.field)}),audit(u,'learning_saved',w.id,{version:next,fields:changes.map(c=>c.field)})]);}catch{throw new LearningError('Конфликт сохранения. Загрузите актуальную версию.',409);}
    return json({version:next,savedAt:timestamp,feedback:experimentFeedback(payload)});
   }
   if(body.version!==w.version||w.version<1)throw new LearningError('Сохраните актуальную версию перед отправкой',409);
   if(a.module_id==='experiment'){const r=await first<{payload:string}>('SELECT payload FROM learning_revisions WHERE work_id=? AND version=?',w.id,w.version);if(!r)throw new LearningError('Версия не найдена',409);const feedback=experimentFeedback(JSON.parse(r.payload));if(feedback.length)throw new LearningError('Заполните содержательно обязательные пункты: '+feedback.map(f=>f.label).join(', '));}
   if(w.submitted_version===w.version)return json({ok:true,version:w.version});
   try{await db().batch([versionGuard(w),stmt('UPDATE learning_works SET submitted_version=?,updated_at=? WHERE id=? AND version=?',w.version,now(),w.id,w.version),learningEvent(u,a,w,'submitted',w.version),audit(u,'learning_submitted',w.id,{version:w.version})]);}catch{throw new LearningError('Версия изменилась во время отправки. Обновите работу.',409);}return json({ok:true,version:w.version});
  }
  if(path==='assessment'){
   requireTeacher(u);await rate('learning-assessment:'+u.id,120,3600);
   const w=await first<Work>('SELECT * FROM learning_works WHERE id=?',String(body.work||''));if(!w)throw new LearningError('Работа не найдена',404);const a=await assignmentFor(u,w.assignment_id,false);
   if(body.version!==w.version||!w.version||w.submitted_version!==w.version)throw new LearningError('Студент должен отправить актуальную версию. Обновите работу.',409);
   if(!['baseline','final'].includes(body.phase)||!Array.isArray(body.scores)||!body.scores.length||body.scores.length>6)throw new LearningError('Укажите этап и оценки');
   const allowed=await rows('SELECT competency_id FROM assignment_competencies WHERE assignment_id=?',a.id),seen=new Set<string>(),batch=[];
   let source:Work|null=null;if(body.transfer===true){if(body.phase!=='final'||!w.source_work)throw new LearningError('Для переноса нужна связанная работа из другой дисциплины');source=await first<Work>('SELECT * FROM learning_works WHERE id=? AND user_id=?',w.source_work,w.user_id);const sa=source?await first<{course_id:string}>('SELECT course_id FROM assignments WHERE id=?',source.assignment_id):null;if(!source||!source.version||source.submitted_version!==source.version||sa?.course_id===a.course_id)throw new LearningError('Связанная работа должна быть отправлена и относиться к другой дисциплине');await teachingCourse(u,sa!.course_id);}
   for(const s of body.scores){if(!allowed.some(c=>c.competency_id===s.competency)||seen.has(s.competency)||!Number.isInteger(s.score)||s.score<0||s.score>4||typeof s.comment!=='string'||s.comment.trim().length<20||s.comment.length>3000)throw new LearningError('Для каждой компетенции укажите балл 0–4 и конкретное обоснование от 20 символов');if(body.transfer===true&&s.score<3)throw new LearningError('Перенос отмечается для обоснованного решения с баллом не ниже 3');seen.add(s.competency);batch.push(stmt('INSERT INTO competency_evidence(id,work_id,actor_id,competency_id,phase,score,version,rubric_version,module_version,comment,transfer_source,source_version,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),w.id,u.id,s.competency,body.phase,s.score,w.version,a.rubric_version,a.module_version,s.comment.trim(),source?.id||null,source?.version||null,now()));}
   batch.unshift(versionGuard(w,true));if(source)batch.unshift(versionGuard(source,true));batch.push(learningEvent({...u,id:w.user_id},a,w,'assessed',w.version,{actor:u.id,phase:body.phase,rubric:a.rubric_version}),audit(u,'competency_assessment',w.id,{version:w.version,phase:body.phase,scores:body.scores,transferSource:source?.id||null}));try{await db().batch(batch);}catch{throw new LearningError('Версия изменилась во время оценки. Обновите работу.',409);}return json({ok:true});
  }
  if(path==='course'){
   requireAdmin(u);const id=typeof body.id==='string'&&body.id?body.id:crypto.randomUUID(),title=value(body,'title',5,200),slug=value(body,'slug',3,80),description=value(body,'description',15,3000),category=value(body,'category',2,80),semester=value(body,'semester',2,100);
   if(!/^[a-z][a-z0-9-]+$/.test(slug)||!['published','draft','archived'].includes(body.status))throw new LearningError('Проверьте адрес и статус дисциплины');
   const before=await first('SELECT * FROM courses WHERE id=?',id),after={id,title,slug,description,category,semester,status:body.status};
   await db().batch([stmt('INSERT INTO courses(id,slug,title,description,category,semester,status,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,description=excluded.description,category=excluded.category,semester=excluded.semester,status=excluded.status',id,slug,title,description,category,semester,body.status,now()),audit(u,'course_updated',id,{before,after})]);return json({id});
  }
  if(path==='assignment'){
   requireTeacher(u);const course=String(body.course||'');await teachingCourse(u,course);if(!await first('SELECT id FROM courses WHERE id=?',course))throw new LearningError('Дисциплина не найдена');
   const id=typeof body.id==='string'&&body.id?body.id:crypto.randomUUID(),before=await first<Assignment>('SELECT * FROM assignments WHERE id=?',id);if(before&&before.course_id!==course)throw new LearningError('Нельзя переносить существующее задание в другую дисциплину');
   const title=value(body,'title',5,200),instruction=value(body,'instruction',20,10000);if(!modules.some(m=>m.id===body.module)||typeof body.active!=='boolean'||body.deadline&&!isCalendarDate(body.deadline)||!Array.isArray(body.competencies)||!body.competencies.length||body.competencies.length>6||new Set(body.competencies).size!==body.competencies.length||body.competencies.some((id:string)=>!competencies.some(c=>c.id===id)))throw new LearningError('Проверьте симулятор, дату и компетенции');
   if(before&&(before.module_id!==body.module||before.instruction!==instruction||JSON.stringify((await rows('SELECT competency_id FROM assignment_competencies WHERE assignment_id=? ORDER BY competency_id',id)).map(c=>c.competency_id))!==JSON.stringify([...body.competencies].sort()))&&await first('SELECT id FROM learning_works WHERE assignment_id=? AND version>0',id))throw new LearningError('Для изменения инструкции, симулятора или набора компетенций после начала работ создайте новое задание');
   const after={id,course_id:course,module_id:body.module,title,instruction,deadline:body.deadline||null,active:body.active?1:0,rubric_version:RUBRIC_VERSION};
   await db().batch([stmt('INSERT INTO assignments(id,course_id,module_id,title,instruction,deadline,rubric_version,active,created_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,instruction=excluded.instruction,deadline=excluded.deadline,active=excluded.active,module_id=excluded.module_id',id,course,body.module,title,instruction,after.deadline,RUBRIC_VERSION,after.active,now()),stmt('DELETE FROM assignment_competencies WHERE assignment_id=?',id),...body.competencies.map((c:string)=>stmt('INSERT INTO assignment_competencies(assignment_id,competency_id) VALUES(?,?)',id,c)),audit(u,'assignment_updated',id,{before,after})]);return json({id});
  }
  if(path==='teacher-access'){
   requireAdmin(u);const teacher=await first<Actor>('SELECT id,name,login,role,must_change FROM users WHERE id=? AND active=1',body.user);if(!teacher||!['teacher','admin'].includes(teacher.role)||!await first('SELECT id FROM courses WHERE id=?',body.course)||typeof body.active!=='boolean')throw new LearningError('Выберите преподавателя и дисциплину');
   await db().batch([body.active?stmt('INSERT OR IGNORE INTO course_teachers(course_id,user_id) VALUES(?,?)',body.course,teacher.id):stmt('DELETE FROM course_teachers WHERE course_id=? AND user_id=?',body.course,teacher.id),audit(u,'teacher_access_changed',body.course,{teacher:teacher.id,active:body.active})]);return json({ok:true});
  }
  if(path==='user'){
   requireAdmin(u);const name=value(body,'name',5,200);if(!['student','teacher'].includes(body.role))throw new LearningError('Выберите роль студента или преподавателя');
   const id=crypto.randomUUID(),login=(body.role==='teacher'?'teacher-':'student-')+id.slice(0,8),password=token().slice(0,20)+'!aA';
   await db().batch([stmt('INSERT INTO users(id,name,login,password_hash,role,must_change,active,created_at) VALUES(?,?,?,?,?,1,1,?)',id,name,login,await passwordHash(password),body.role,now()),audit(u,'learning_user_created',id,{name,login,role:body.role})]);return json({id,login,password});
  }
  throw new LearningError('Не найдено',404);
 }catch(e){return json({error:e instanceof LearningError?e.message:'Операция не выполнена. Проверьте данные и повторите.'},e instanceof LearningError?e.status:400);}
}
