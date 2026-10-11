import {sections,allFields,admissionIds,type Payload} from './workbook';
export const RULESET='учебная редакция УМНИК 2026 / v1';
export type Issue={field:string;section:number;severity:'blocker'|'major'|'advice';message:string;action:string;source:string};
const text=(v:unknown)=>typeof v==='string'?v.trim():Array.isArray(v)?v.map(x=>Object.values(x).join(' ')).join(' '):'';
export function hasContent(v:unknown) {
 const str=text(v); return str.length>=18 && !/^\s*(?:требует проверки|не знаю|нет|пока не|предстоит|не выбран|заполнить|test|тест)\s*$/i.test(str) && !/\[.*\]/.test(str);
}
function fieldContent(id:string,v:unknown){
 const s=text(v);if(id==='initialResult'&&/^пока не измерено[.\s]*$/i.test(s))return true;
 if(['group','challenge','nptl','fasttrack','admissionQuestions','consultant','initialResult','import','support','realStatus'].includes(id))return s.length>=5&&!/\[.*\]/.test(s);
 return hasContent(v);
}
export function evaluate(payload:Payload) {
 const issues:Issue[]=[];
 const add=(field:string,severity:Issue['severity'],message:string,action:string)=>{
  const section=Math.max(0,sections.findIndex(s=>s.fields.some(f=>f.id===field)));
  issues.push({field,section,severity,message,action,source:`Тетрадь, раздел ${section+1}, с. ${sections[section].page}. Пособие: ${sections[section].handbook}.`});
 };
 for(const id of admissionIds) {
  const label=allFields.find(f=>f.id===id)!.label;
  if(payload[id]==='Нет') add(id,'blocker',`Не выполнено условие «${label}».`,'Проверьте применимую редакцию и уточните ситуацию у Фонда. Учебные правки не устраняют формальный запрет.');
  else if(payload[id]!=='Да') add(id,'major',`Не подтверждено условие «${label}».`,'Проверьте условие, зафиксируйте источник и задайте конкретный вопрос ответственному.');
 }
 for(const field of allFields.filter(f=>f.required&&!admissionIds.includes(f.id))) {
  const v=payload[field.id];
  if(field.type==='table') {
   const rows=Array.isArray(v)?v:[]; const min=['analogs','risks','expertQuestions','metrics'].includes(field.id)?3:field.id==='tasks'?5:field.id==='stages'?2:field.id==='defense'?7:['milestones','attachments'].includes(field.id)?6:field.id==='tzParameters'?4:1;
   if(rows.length<min || rows.some(r=>field.columns!.some(c=>typeof r[c]!=='string'||r[c].trim().length<3)))
    add(field.id,'major',`Таблица «${field.label}» требует заполнения: минимум ${min} строк и все смысловые колонки.`, 'Добавьте конкретные записи. Пометки «требует проверки» должны сопровождаться действием и сроком.');
  } else if(field.type==='select') {
   if(!field.options?.includes(String(v)) || v==='Требует проверки') add(field.id,'major',`Не определено поле «${field.label}».`,'Выберите достоверный вариант и уточните неизвестные сведения.');
  } else if(!fieldContent(field.id,v)) add(field.id,'major',`Поле «${field.label}» пока не содержит достаточного ответа.`,field.hint);
 }
 if(!/^Разработка\b/u.test(text(payload.title))&&!/^Разработка\s/u.test(text(payload.title))) add('title','major','Название должно начинаться со слова «Разработка».','Назовите продукт и поддерживаемый сценарий.');
 const hyp=text(payload.hypothesis);
 if(!/[0-9]/.test(hyp)||!/(сравнен|baseline|относител|по сравнению|превз|базов)/i.test(hyp)) add('hypothesis','major','Гипотезе не хватает измеримой цели или сравнения.','Укажите механизм, метрику, числовую цель, baseline и одинаковые условия испытания.');
 if(!/(http|doi|arxiv)/i.test(text(payload.analogs))) add('analogs','major','Ссылки на аналоги не указаны.','Добавьте проверяемые источники; содержание внешних ссылок проверяет преподаватель.');
 if(!/(http|doi)/i.test(text(payload.dataSource))&&!/(разрешен|договор|лиценз)/i.test(text(payload.dataSource))) add('dataSource','major','Доступ и источник данных не подтверждены.','Укажите точную ссылку, лицензию или основание разрешения и законный резерв.');
 if(/(аналогов нет|лучше всех|гарантирован|100% успех|уникальная нейросеть)/i.test(Object.values(payload).map(text).join(' '))) add('novelty','major','Обнаружено бездоказательное абсолютное утверждение.','Замените его проверяемым сравнением и источником.');
 if(/случайн/i.test(text(payload.split))&&/(времен|выгруз|репозит|автор)/i.test(text(payload.scope)+' '+text(payload.dataUnit))) add('split','advice','Случайное разбиение может не соответствовать структуре данных.','Проверьте независимость временных, авторских или репозиторных групп и опишите защиту от утечки.');
 const words=text(payload.annotation).split(/\s+/).filter(Boolean).length;
 if(words<120||words>180) add('annotation','advice',`Аннотация: ${words} слов; учебный ориентир 120–180.`, 'Уточните лимит реальной формы. Ориентир тетради не является формальным запретом конкурса.');
 if(text(payload.initialResult)&&!/(не измерен|план|гипотез)/i.test(text(payload.initialResult))&&!/\d{2}[.\/-]\d{2}/.test(text(payload.initialResult))) add('initialResult','advice','Заявленный результат требует протокола.','Приведите дату, конфигурацию, измерение и ссылку на артефакт либо честно укажите, что измерений нет.');
 const groups=[['Научная часть',['problem','hypothesis','novelty','analogs','dataSource','split','baseline','metrics','tzParameters','contribution']],['Коммерциализация',['segment','benefit','demand','businessModel','market','advantage']],['Квалификация и выполнение',['qualification','evidence','resources','stages','risks','load']]] as const;
 const dimensions=groups.map(([name,ids])=>({name,score:Math.round(ids.filter(id=>hasContent(payload[id])&&!issues.some(i=>i.field===id&&i.severity==='major')).length/ids.length*10),max:10}));
 const completed=allFields.filter(f=>f.type==='table'?Array.isArray(payload[f.id])&&(payload[f.id] as unknown[]).length>0:f.type==='select'?f.options?.includes(String(payload[f.id]))&&payload[f.id]!=='Требует проверки':fieldContent(f.id,payload[f.id])).length;
 const blockers=issues.filter(i=>i.severity==='blocker').length, majors=issues.filter(i=>i.severity==='major').length;
 return {ruleset:RULESET,completion:Math.round(completed/allFields.length*100),dimensions,issues,status:blockers?'Формальные препятствия':majors?'Требуется доработка':'Готово к проверке преподавателем',
  conclusion:blockers?'По самооценке обнаружены условия, препятствующие участию.':majors?'В учебном пакете есть существенные пробелы. Исправьте замечания и повторите проверку.':'Автоматические проверки пройдены. Новизну, достоверность источников и реализуемость должен подтвердить преподаватель.',
  limitation:'Учебная оценка не является решением Фонда и не показывает вероятность получения гранта. Заполненность полей не доказывает качество проекта.'};
}
export function validatePayload(value:unknown):Payload {
 if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error('Некорректная форма');
 const raw=value as Record<string,unknown>, out:Payload={};
 for(const f of allFields) {
  const v=raw[f.id];
  if(f.type==='table') {
   if(v!==undefined&&(!Array.isArray(v)||v.length>30)) throw new Error('В таблице допускается до 30 строк');
   out[f.id]=(Array.isArray(v)?v:[]).map(row=>Object.fromEntries(f.columns!.map(c=>{
    const x=row&&typeof row==='object'?(row as Record<string,unknown>)[c]:'';
    if(typeof x!=='string'||x.length>5000) throw new Error('Некорректное значение таблицы'); return [c,x];
   })));
  } else {
   if(v!==undefined&&(typeof v!=='string'||v.length>15000)) throw new Error('Поле слишком длинное');
   const val=typeof v==='string'?v:'';
   if(f.type==='select'&&val&&!f.options!.includes(val)) throw new Error('Недопустимый вариант');
   out[f.id]=val;
  }
 }
 if(JSON.stringify(out).length>250000) throw new Error('Пакет слишком большой'); return out;
}
