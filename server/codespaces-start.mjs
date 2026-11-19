import {spawn} from 'node:child_process';
import {mkdir,open,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import http from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
import {runtimeConfig} from './runtime-config.mjs';

// This hook starts only inside Codespaces. It never changes port visibility,
// creates a user or exposes a database through GitHub Pages.
if(process.env.CODESPACES!=='true'){console.log('Autostart ist nur für GitHub Codespaces vorgesehen. Lokal: npm start');process.exit(0);}
const root=fileURLToPath(new URL('..',import.meta.url)),config=runtimeConfig(root);
if(!['127.0.0.1','localhost','::1'].includes(config.host))throw Error('Der Codespaces-Testserver muss auf Loopback gebunden bleiben.');
function healthy(){return new Promise(resolve=>{const req=http.get({host:config.host,port:config.port,path:'/health',headers:{Host:new URL(config.origin).host},timeout:1000},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>{try{resolve(res.statusCode===200&&JSON.parse(text).service==='company-planning-platform');}catch{resolve(false);}});});req.on('timeout',()=>req.destroy());req.on('error',()=>resolve(false));});}
function ready(){console.log(`Testportal läuft: ${config.origin}/login.html\nErstes Entwicklerkonto einmalig anlegen: npm run admin:init\nDie Portfreigabe wird nicht geändert. Mitarbeiterfreigabe siehe docs/GITHUB-TESTPHASE.md.`);}
if(await healthy()){ready();process.exit(0);}
await mkdir(resolve(root,'runtime'),{recursive:true,mode:0o700});
const log=resolve(root,'runtime/server.log'),fd=await open(log,'a',0o600);await chmod(log,0o600);
const child=spawn(process.execPath,[resolve(root,'server/start.mjs')],{cwd:root,env:process.env,detached:true,stdio:['ignore',fd.fd,fd.fd]});
let launchError;child.on('error',error=>{launchError=error;});child.unref();await fd.close();
for(let i=0;i<60;i++){
 if(launchError)throw launchError;
 if(await healthy()){ready();process.exit(0);}
 await delay(150);
}
throw Error('Testportal konnte nicht gestartet werden. Details in runtime/server.log.');
