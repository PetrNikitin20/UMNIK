// Exercise the compiled production handlers over stdin; this opens no network listener.
import {createRequire} from 'node:module';
import {createInterface} from 'node:readline';
const require=createRequire(import.meta.url);
const api=require('../.next/server/app/api/[...path]/route.js').routeModule.userland;
const mcp=require('../.next/server/app/mcp/route.js').routeModule.userland;
const input=createInterface({input:process.stdin});
input.on('line',async line=>{
 let message;
 try{
  message=JSON.parse(line);const headers=new Headers(message.headers);
  const url=new URL(message.url);if(!headers.has('host'))headers.set('host',url.host);
  const req=new Request(url,{method:message.method,headers,body:message.body??undefined});
  const handler=(url.pathname==='/mcp'?mcp:api)[message.method];
  const response=await handler(req);
  process.stdout.write(JSON.stringify({id:message.id,status:response.status,headers:[...response.headers],body:await response.text()})+'\n');
 }catch{process.stdout.write(JSON.stringify({id:message?.id,error:'Handler test bridge failed'})+'\n');}
});
