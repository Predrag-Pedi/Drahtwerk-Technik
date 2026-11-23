import {backup,DatabaseSync} from 'node:sqlite';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,chmod,access} from 'node:fs/promises';
process.umask(0o077);
const root=fileURLToPath(new URL('..',import.meta.url));
const source=process.env.DATABASE_PATH||resolve(root,'runtime/platform.sqlite');
await access(source);
const target=resolve(process.argv[2]||resolve(root,'runtime/backups',`platform-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`));
if(target===resolve(source))throw Error('Sicherung darf nicht die aktive Datenbank überschreiben.');
try{await access(target);throw Error('Zieldatei existiert bereits.');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(dirname(target),{recursive:true,mode:0o700});
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,target);await chmod(target,0o600);console.log('Sicherung erstellt: '+target);}finally{db.close();}
