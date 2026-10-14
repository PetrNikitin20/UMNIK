'use client';
import {useEffect,useRef} from 'react';
export type LabUser={id:string;name:string;login:string;role:string;mustChange:boolean};
export async function labApi(path:string,body?:unknown):Promise<any>{const r=await fetch('/api/'+path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data:any=await r.json();if(!r.ok)throw new Error(data.error||'Не удалось выполнить запрос');return data;}
export const labDate=(s:string|null|undefined)=>s?new Date(s).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'short',timeStyle:'short'}):'—';
export function useLearningActivity(assignment:string,enabled:boolean){
 const last=useRef(Date.now());
 useEffect(()=>{if(!enabled)return;let previous=Date.now();const activity=()=>{last.current=Date.now();};const handlers=['pointerdown','keydown','input','scroll'];handlers.forEach(e=>window.addEventListener(e,activity,{passive:true}));
  const timer=setInterval(()=>{const current=Date.now(),seconds=Math.min(30,Math.floor((current-previous)/1000));previous=current;if(document.visibilityState==='visible'&&document.hasFocus()&&current-last.current<60000&&seconds>0)void labApi('platform/activity',{assignment,event:'active',id:crypto.randomUUID(),seconds}).catch(()=>{});},30000);
  return()=>{clearInterval(timer);handlers.forEach(e=>window.removeEventListener(e,activity));};
 },[assignment,enabled]);
}
export function trackHint(assignment:string,field:string){void labApi('platform/activity',{assignment,event:'hint',field,id:crypto.randomUUID(),seconds:0}).catch(()=>{});}
