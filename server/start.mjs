import {fileURLToPath} from 'node:url';
import {openDatabase} from './db.mjs';
import {createApp} from './app.mjs';
import {runtimeConfig} from './runtime-config.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),{port,host,origin,database,codespaceProxyPort}=runtimeConfig(root);
const db=openDatabase(database);
const app=createApp({db,root,origin,codespaceProxyPort});app.listen(port,host,()=>console.log(`Firmenportal: ${origin} · ${db.prepare('SELECT COUNT(*) n FROM users').get().n?'Benutzer vorhanden':'Entwicklerkonto mit npm run admin:init anlegen'}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>app.close(()=>{db.close();process.exit(0);}));
