import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const child=spawn(process.execPath,[resolve('server.js')],{stdio:'inherit',env:process.env});
let stopping=false,failures=0;
function stop(code){
 if(stopping)return;
 stopping=true;clearInterval(timer);child.kill('SIGTERM');
 const force=setTimeout(()=>{child.kill('SIGKILL');process.exit(code);},10000);
 child.once('exit',()=>{clearTimeout(force);process.exit(code);});
 if(child.exitCode!==null)process.exit(code);
}
child.once('error',()=>{console.error('Application process could not start');stop(1);});
child.once('exit',(code)=>{if(!stopping){clearInterval(timer);process.exit(code||1);}});
process.once('SIGTERM',()=>stop(0));process.once('SIGINT',()=>stop(0));
const started=Date.now();let checking=false;
const timer=setInterval(async()=>{
 if(checking||stopping||Date.now()-started<45000)return;
 checking=true;
 try{const r=await fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',{signal:AbortSignal.timeout(7000)});if(!r.ok)throw new Error('unhealthy');failures=0;}
 catch{if(++failures>=3){console.error('Repeated readiness failure; exiting for container restart');stop(1);}}
 finally{checking=false;}
},30000);
