import {scrypt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);let hashing=0;
export const token=()=>randomBytes(32).toString('base64url');
export const digest=s=>createHash('sha256').update(s).digest('hex');
export function fail(status,message){throw Object.assign(Error(message),{status});}
export function passwordPolicy(p){if(typeof p!=='string'||p.length<12||p.length>256)fail(400,'Das Passwort muss 12 bis 256 Zeichen lang sein.');}
async function key(password,salt){if(hashing>=2)fail(429,'Bitte kurz warten und erneut versuchen.');hashing++;try{return await derive(password,salt,64,{N:131072,r:8,p:1,maxmem:256*1024*1024});}finally{hashing--;}}
export async function passwordHash(password){passwordPolicy(password);const salt=randomBytes(16).toString('hex');return `scrypt$${salt}$${(await key(password,salt)).toString('hex')}`;}
export async function passwordMatches(password,stored){if(typeof password!=='string'||password.length>256)return false;const [,salt,hash]=String(stored).split('$');const result=await key(password,salt||'00000000000000000000000000000000');return Boolean(hash&&hash.length===128&&timingSafeEqual(result,Buffer.from(hash,'hex')));}
export function text(v,max=200){if(typeof v!=='string'||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))fail(400,'Ungültiger Text.');return v.trim();}
export function email(v){const e=text(v,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))fail(400,'Gültige E-Mail-Adresse eingeben.');return e;}
export function rateLimit(db,key,limit=10,window=15*60*1000){const now=Date.now(),r=db.prepare('SELECT * FROM login_attempts WHERE key=?').get(key);if(r&&r.until>now&&r.count>=limit)fail(429,'Zu viele Versuche. Bitte später erneut versuchen.');db.prepare('INSERT INTO login_attempts VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,until=excluded.until').run(key,r&&r.until>now?r.count+1:1,r&&r.until>now?r.until:now+window);db.prepare('DELETE FROM login_attempts WHERE until<?').run(now);}
