import {env} from 'cloudflare:workers';
import {syncNews} from '../api/[...path]/route';
export const dynamic='force-dynamic';
const tools=[
 {name:'check_competition_sources',description:'Проверить фиксированные страницы УМНИК Фонда и RSS регионального представительства ФСИ. Новые сообщения источников сохранить только как черновики. Региональные даты требуют проверки применимости для Москвы.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'read_news_status',description:'Прочитать результат последней проверки источников и число черновиков новостей.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
];
export async function POST(req:Request){
 let id:unknown=null;
 try{
  const text=await req.text();if(text.length>10000)return new Response('Request too large',{status:413});
  const rpc=JSON.parse(text);id=rpc.id??null;let result:unknown;
  if(rpc.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
  else if(rpc.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'umnik-news',version:'1.1.0'}};
  else if(rpc.method==='notifications/initialized')return new Response(null,{status:202});
  else if(rpc.method==='tools/list')result={tools};
  else if(rpc.method==='tools/call'){
   if(!env.DB)throw new Error('База недоступна');
   const owner=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind('cloudOwnerId').first<{value:string}>();
   const identity=req.headers.get('oai-authenticated-user-id');
   if(!identity||owner?.value!==identity)throw new Error('Облачные обновления не привязаны к этому владельцу. Администратор должен войти через ChatGPT и выполнить привязку в практикуме.');
   let value:unknown;
   if(rpc.params?.name==='check_competition_sources')value=await syncNews(null);
   else if(rpc.params?.name==='read_news_status')value={lastCheck:await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind('newsLastCheck').first(),drafts:await env.DB.prepare("SELECT COUNT(*) count FROM news WHERE status='draft'").first()};
   else throw new Error('Неизвестный инструмент');
   result={content:[{type:'text',text:JSON.stringify(value)}]};
  }else return Response.json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
  return Response.json({jsonrpc:'2.0',id,result});
 }catch(e){return Response.json({jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:e instanceof Error?e.message:'Ошибка'}]}});}
}
