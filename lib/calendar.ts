/** Calendar dates and report intervals use Moscow's current UTC+03:00 zone. */
export function isCalendarDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T00:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function moscowDay(date=new Date()) {
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function reportInterval(from:string,to:string) {
 if(!isCalendarDate(from)||!isCalendarDate(to)||from>to)throw new Error('Проверьте период отчета');
 const start=new Date(from+'T00:00:00+03:00');
 const end=new Date(new Date(to+'T00:00:00+03:00').getTime()+86400000);
 return {start:start.toISOString(),end:end.toISOString()};
}
