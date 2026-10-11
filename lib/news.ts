import {moscowDay} from './calendar';
export const newsSources=[
 {url:'https://fsimp.ru/rss.xml',name:'Региональное представительство ФСИ · Саратовская область',kind:'rss'},
 {url:'https://fasie.ru/programs/programma-umnik/',name:'Фонд · программа УМНИК',kind:'page'},
 {url:'https://fasie.ru/press/fund/umnik-2026/',name:'Фонд · объявление УМНИК-2026',kind:'page'},
] as const;
export type NewsCandidate={source:string;title:string;summary:string;publishedAt:string;publicationDate:string};
function decodeXml(s:string) {
 return s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity:string)=>{
  const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  if(!entity.startsWith('#'))return named[entity.toLowerCase()]||'';
  const code=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
  return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'';
 });
}
function tag(item:string,name:string) {
 const raw=item.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>','i'))?.[1]||'';
 return decodeXml(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').trim());
}
export function plainText(html:string) {
 return decodeXml(html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
}
export function pageContent(html:string) {
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||html;
 return plainText(main.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi,''));
}
/** Fixed host/path allowlist; no arbitrary feed links or external entity loading. */
export function parseUmnikFeed(xml:string):NewsCandidate[] {
 if(xml.length>1000000||!/<rss\b/i.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Некорректный RSS источника');
 const found=new Map<string,NewsCandidate>();
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
  const item=match[1],title=plainText(tag(item,'title')).slice(0,200),summary=plainText(tag(item,'description')).slice(0,700),source=tag(item,'link');
  if(!/умник/iu.test(title+' '+summary))continue;
  let url:URL;try{url=new URL(source);}catch{continue;}
  if(url.protocol!=='https:'||url.hostname!=='fsimp.ru'||url.port||url.username||url.password||url.search||url.hash||!/^\/news\/[a-z0-9-]+\/?$/.test(url.pathname))continue;
  const rawDate=tag(item,'pubDate');
  // Feed timestamps must carry their own offset, not depend on the server's zone.
  if(!/(?:[+-]\d{4}|GMT|Z)$/i.test(rawDate.trim()))continue;
  const date=new Date(rawDate);if(!Number.isFinite(date.getTime()))continue;
  found.set(url.href,{source:url.href,title,summary,publishedAt:date.toISOString(),publicationDate:moscowDay(date)});
 }
 return [...found.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,20);
}
/** Reviewed factual summary; date is the representative's publication date. */
export const reviewedNews=[{
 id:'umnik-2026-results-reviewed',title:'УМНИК-2026: опубликованы итоги очереди 1',
 body:'В сообщении регионального представительства ФСИ от 14 августа 2026 года указано: 500 заявок рекомендованы к финансированию на общую сумму 250 млн рублей. Прием этой очереди проходил с 27 апреля по 27 мая 2026 года и завершен. Дата карточки — дата публикации сообщения представительства, а не новый срок приема. Ссылки на итоговые перечни размещены в источнике. Следующий прием в тренажере не подтвержден; учебную заявку готовим по графику преподавателя.',
 source:'https://fsimp.ru/news/197',eventDate:'2026-08-14',
}];
