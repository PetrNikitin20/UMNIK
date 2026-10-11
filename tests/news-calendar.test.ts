import test from 'node:test';
import assert from 'node:assert/strict';
import {isCalendarDate,moscowDay,reportInterval} from '../lib/calendar';
import {parseUmnikFeed,pageContent} from '../lib/news';
const item=(title='УМНИК-2026',link='https://fsimp.ru/news/197',pubDate='Fri, 14 Aug 2026 23:30:00 +0400')=>`<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${pubDate}</pubDate><description>Фонд &quot;ФСИ&quot; &amp; конкурс</description></item>`;
const feed=(...items:string[])=>'<rss><channel>'+items.join('')+'</channel></rss>';
test('RSS converts an explicit source offset to the Moscow publication date',()=>{
 const [n]=parseUmnikFeed(feed(item()));assert.equal(n.publicationDate,'2026-08-14');assert.equal(n.publishedAt,'2026-08-14T19:30:00.000Z');assert.equal(n.summary,'Фонд "ФСИ" & конкурс');
 const [m]=parseUmnikFeed(feed(item(undefined,undefined,'Sat, 15 Aug 2026 00:30:00 +0400')));assert.equal(m.publicationDate,'2026-08-14');
});
test('RSS ignores unrelated publications',()=>assert.equal(parseUmnikFeed(feed(item('Студенческий стартап'))).length,0));
test('RSS rejects external, credentialed, query and non-news URLs',()=>{
 for(const url of ['https://evil.example/news/197','https://fsimp.ru.evil.example/news/197','http://fsimp.ru/news/197','https://user@fsimp.ru/news/197','https://fsimp.ru:8443/news/197','https://fsimp.ru/news/197?x=y','https://fsimp.ru/news/197#x','https://fsimp.ru/admin'])assert.equal(parseUmnikFeed(feed(item(undefined,url))).length,0,url);
});
test('RSS rejects invalid or timezone-less timestamps',()=>{
 for(const date of ['bad','2026-08-14','Fri, 14 Aug 2026 23:30:00'])assert.equal(parseUmnikFeed(feed(item(undefined,undefined,date))).length,0);
});
test('RSS accepts news slugs and deduplicates repeated links',()=>{
 const xml=feed(item(),item(),item('УМНИК · преакселерация','https://fsimp.ru/news/preakseleratsiya-umnik'));assert.equal(parseUmnikFeed(xml).length,2);
});
test('RSS never processes DTDs or external entities',()=>assert.throws(()=>parseUmnikFeed('<!DOCTYPE rss SYSTEM "https://evil.example">'+feed(item())),/RSS/));
test('Page comparison excludes navigation, scripts and footer within main content',()=>{
 assert.equal(pageContent('<nav>Меню</nav><main><h1>УМНИК</h1><script>nonce</script><p>Прием</p><footer>счетчик</footer></main>'),'УМНИК Прием');
});
test('Calendar dates validate real days and leap years',()=>{
 assert.ok(isCalendarDate('2028-02-29'));for(const d of ['2026-02-29','2026-02-30','2026-13-01','2026-1-01','x'])assert.equal(isCalendarDate(d),false);
});
test('Report interval covers Moscow days inclusively and excludes the next midnight',()=>{
 const {start,end}=reportInterval('2026-10-01','2026-10-01');assert.equal(start,'2026-09-30T21:00:00.000Z');assert.equal(end,'2026-10-01T21:00:00.000Z');
 const contains=(d:string)=>d>=start&&d<end;
 assert.equal(contains('2026-09-30T20:59:59.999Z'),false);assert.equal(contains(start),true);assert.equal(contains('2026-10-01T20:59:59.999Z'),true);assert.equal(contains(end),false);
});
test('Report interval rejects impossible dates and reversed ranges',()=>{
 assert.throws(()=>reportInterval('2026-02-30','2026-03-01'));assert.throws(()=>reportInterval('2026-10-02','2026-10-01'));
});
test('Moscow today rolls over at 21:00 UTC',()=>{
 assert.equal(moscowDay(new Date('2026-10-11T20:59:59Z')),'2026-10-11');assert.equal(moscowDay(new Date('2026-10-11T21:00:00Z')),'2026-10-12');
});
