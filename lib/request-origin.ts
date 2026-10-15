import {env} from '@/lib/runtime-env';
export function requestOrigin(req:Request){
 const url=new URL(req.url);
 if(env.DEPLOYMENT_MODE!=='standalone')return url.origin;
 // The container is reachable only through our reverse proxy, which replaces forwarding headers.
 const protocol=(req.headers.get('x-forwarded-proto')||url.protocol.slice(0,-1)).split(',')[0].trim().toLowerCase();
 if(!['http','https'].includes(protocol))throw new Error('Invalid proxy protocol');
 const origin=new URL(protocol+'://'+(req.headers.get('host')||url.host)).origin;
 const allowed=(env.APP_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!allowed.includes(origin))throw new Error('Host is not configured for this application');
 return origin;
}
export function clientAddress(req:Request){
 return env.DEPLOYMENT_MODE==='standalone'?(req.headers.get('x-real-ip')||'local'):(req.headers.get('cf-connecting-ip')||'local');
}
