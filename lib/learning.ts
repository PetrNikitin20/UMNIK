export const LAB_NAME='Образовательная лаборатория Петра Никитина';
export const RUBRIC_VERSION='competencies-v1';
export const levels=['Не продемонстрировано','С существенной помощью','Базовое решение','Самостоятельное обоснованное решение','Обоснованный перенос в новую задачу'];
export const competencies=[
 {id:'research',title:'Постановка исследовательской задачи',description:'Проблема, проверяемый вопрос, гипотеза и границы исследования.'},
 {id:'data',title:'Работа с данными',description:'Происхождение данных, качество, разделение выборки и ограничения.'},
 {id:'experiment',title:'Планирование эксперимента',description:'Baseline, метрика, протокол сравнения и критерий подтверждения гипотезы.'},
 {id:'code',title:'Воспроизводимое программирование',description:'Алгоритм, среда, версии, параметры и воспроизводимость результата.'},
 {id:'interpretation',title:'Интерпретация результатов',description:'Обоснованный вывод, неопределенность и пределы применимости.'},
 {id:'product',title:'Ценность исследовательского продукта',description:'Потребитель, проверка потребности и измеримый полезный эффект.'},
];
export const modules=[
 {id:'umnik',title:'УМНИК · исследовательская заявка',version:'umnik-2026-v1',description:'Восемь разделов рабочей тетради, история версий, проверка и рекомендации.',competencies:['research','data','experiment','product']},
 {id:'experiment',title:'Планирование эксперимента',version:'experiment-v1',description:'От гипотезы до воспроизводимого протокола. Используйте проект УМНИК или самостоятельную задачу.',competencies:['research','data','experiment','code','interpretation']},
];
export const starterCourses=[
 {id:'research-seminar',slug:'research-seminar',title:'Учебный научный семинар',description:'Исследовательская задача, новизна и подготовка заявки. Первый модуль — УМНИК.',category:'Исследования',semester:'2026/27 · учебный практикум'},
 {id:'data-analysis',slug:'data-analysis',title:'Анализ данных: исследовательский практикум',description:'Выборка, метрики, честное сравнение методов и интерпретация результата.',category:'Данные',semester:'2026/27 · учебный практикум'},
 {id:'python-research',slug:'python-research',title:'Python для исследовательского проекта',description:'Воспроизводимый эксперимент: код, среда, параметры и проверка результата.',category:'Программирование',semester:'2026/27 · учебный практикум'},
];
export const starterAssignments=[
 {id:'research-umnik',course:'research-seminar',module:'umnik',title:'Подготовка исследовательской заявки УМНИК',instruction:'Заполните рабочую тетрадь. Проверьте применимые условия конкурса. Сохраните версию, выполните учебную проверку и отправьте работу преподавателю. Учебные сроки задает преподаватель отдельно от конкурса.',competencies:['research','data','experiment','product']},
 {id:'data-experiment',course:'data-analysis',module:'experiment',title:'Разработка протокола проверки гипотезы',instruction:'Выберите гипотезу своего проекта УМНИК или отдельного исследования. Опишите данные, baseline, метрики, разделение выборки и критерий принятия решения. Для связи дисциплин укажите сохраненную работу из другого курса.',competencies:['research','data','experiment','interpretation']},
 {id:'python-experiment',course:'python-research',module:'experiment',title:'План воспроизводимого вычислительного эксперимента',instruction:'Опишите реализацию протокола: среду, версии библиотек, параметры, seed и порядок запуска. Приложите HTTPS-ссылку на код, если он уже подготовлен. Не объявляйте эксперимент проведенным без измерений.',competencies:['data','experiment','code','interpretation']},
];
export const experimentFields=[
 {id:'question',label:'Исследовательский вопрос',hint:'Что именно сравниваете и в каких границах?',example:'Как меняется F1 при добавлении признаков длины текста к TF-IDF на фиксированном наборе обращений?'},
 {id:'hypothesis',label:'Проверяемая гипотеза',hint:'Назовите изменение, метрику и условие подтверждения.',example:'План: F1 выше baseline минимум на 0,03. Число — целевой порог, результат пока не измерен.'},
 {id:'data',label:'Данные и ограничения',hint:'Источник, единица наблюдения, размер, разрешение на использование, ограничения.',example:'Обезличенные открытые обращения; ссылка и лицензия проверяются до загрузки. Единица наблюдения — одно обращение.'},
 {id:'split',label:'Разделение и защита от утечки',hint:'Как получаете train/validation/test? Что делаете с дубликатами и связанными наблюдениями?',example:'Разделение по времени. Дубликаты удаляются до разбиения; test фиксируется и не используется для подбора параметров.'},
 {id:'baseline',label:'Baseline и предлагаемый метод',hint:'Один и тот же набор данных и условия для обоих подходов.',example:'Baseline: TF-IDF + логистическая регрессия. Метод: те же признаки плюс длина текста; бюджет подбора одинаковый.'},
 {id:'metric',label:'Метрика и критерий решения',hint:'Что измеряете, почему эта метрика подходит, как учитываете неопределенность?',example:'Macro-F1 на test, результаты по классам, доверительный интервал разности с bootstrap. Критерий задается до эксперимента.'},
 {id:'protocol',label:'Протокол и воспроизводимость',hint:'Шаги, параметры, seed, среда и фиксация версий.',example:'Зафиксировать хеш данных, версии Python и библиотек, seed=42, конфигурацию и скрипт запуска. Сохранить предсказания и журнал.'},
 {id:'interpretation',label:'Вывод и ограничения',hint:'Если измерений нет — укажите план анализа, а не выдуманный результат.',example:'Результат пока не измерен. Сопоставлю разность F1 с порогом, проверю ошибки по классам; вывод ограничен данным корпусом.'},
 {id:'codeUrl',label:'Ссылка на код — при наличии',hint:'Только HTTPS. Отсутствие ссылки допустимо на этапе планирования.',example:''},
];
export function blankExperiment(){return Object.fromEntries(experimentFields.map(f=>[f.id,''])) as Record<string,string>;}
export function validateExperiment(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Проверьте форму эксперимента');
 const object=value as Record<string,unknown>,result=blankExperiment();
 for(const f of experimentFields){const v=object[f.id]??'';if(typeof v!=='string'||v.length>12000)throw new Error('Проверьте поле «'+f.label+'»');result[f.id]=v;}
 if(result.codeUrl){try{if(new URL(result.codeUrl).protocol!=='https:')throw new Error();}catch{throw new Error('Ссылка на код должна начинаться с HTTPS');}}
 return result;
}
export function experimentFeedback(payload:Record<string,string>){return experimentFields.filter(f=>f.id!=='codeUrl'&&payload[f.id].trim().length<35).map(f=>({field:f.id,label:f.label,message:'Раскройте этот пункт: '+f.hint}));}
export type Evidence={id:string;work_id:string;user_id:string;course_id:string;competency_id:string;phase:string;score:number;version:number;current_version:number;rubric_version:string;created_at:string;transfer_source:string|null;source_current_version?:number;source_version?:number;comment:string};
export function competencySummary(rows:Evidence[]){
 return competencies.map(c=>{
  const matching=rows.filter(r=>r.competency_id===c.id&&r.rubric_version===RUBRIC_VERSION);
  const final=matching.filter(r=>r.phase==='final'&&r.version===r.current_version);
  const latestByCourse=new Map<string,Evidence>();
  for(const r of [...final].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)))latestByCourse.set(r.course_id,r);
  const current=[...latestByCourse.values()];
  const deltas=current.flatMap(r=>{const baseline=matching.filter(b=>b.work_id===r.work_id&&b.phase==='baseline'&&b.created_at<=r.created_at).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0];return baseline?[{courseId:r.course_id,baseline:baseline.score,final:r.score,delta:r.score-baseline.score}]:[];});
  return {...c,evidenceCount:current.length,level:current.length?Math.max(...current.map(r=>r.score)):null,courseIds:current.map(r=>r.course_id),transferCount:current.filter(r=>r.transfer_source&&r.source_current_version===r.source_version&&r.score>=3).length,deltas};
 });
}
export function cohortSummary(rows:Evidence[]){
 const latest=new Map<string,Evidence>();
 for(const r of [...rows].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)))if(r.phase==='final'&&r.version===r.current_version&&r.rubric_version===RUBRIC_VERSION)latest.set(r.user_id+':'+r.course_id+':'+r.competency_id,r);
 const grouped=new Map<string,{courseId:string;competencyId:string;students:number;levels:number[];paired:number;improved:number;unchanged:number;decreased:number;transfers:number}>();
 for(const r of latest.values()){
  const key=r.course_id+':'+r.competency_id,g=grouped.get(key)||{courseId:r.course_id,competencyId:r.competency_id,students:0,levels:[0,0,0,0,0],paired:0,improved:0,unchanged:0,decreased:0,transfers:0};
  g.students++;g.levels[r.score]++;if(r.transfer_source&&r.source_version===r.source_current_version&&r.score>=3)g.transfers++;
  const baseline=rows.filter(b=>b.work_id===r.work_id&&b.competency_id===r.competency_id&&b.phase==='baseline'&&b.rubric_version===r.rubric_version&&b.created_at<=r.created_at).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0];
  if(baseline){g.paired++;if(r.score>baseline.score)g.improved++;else if(r.score===baseline.score)g.unchanged++;else g.decreased++;}grouped.set(key,g);
 }
 return [...grouped.values()];
}
