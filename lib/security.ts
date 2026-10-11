const encoder=new TextEncoder();
const hex=(a:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(a instanceof ArrayBuffer?a:a.buffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
const unhex=(s:string)=>new Uint8Array(s.match(/.{2}/g)!.map(x=>parseInt(x,16)));
export const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(s)));
export function equal(a:string,b:string) {let mismatch=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++) mismatch|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return mismatch===0;}
export async function passwordHash(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)))) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-256'},key,256);
 return `pbkdf2-sha256$100000$${salt}$${hex(bits)}`;
}
export async function verify(password:string,stored:string) {const parts=stored.split('$');if(parts.length!==4||parts[0]!=='pbkdf2-sha256'||parts[1]!=='100000') return false;return equal(await passwordHash(password,parts[2]),stored);}
