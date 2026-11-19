import {resolve} from 'node:path';

export function runtimeConfig(root,env=process.env){
 const port=Number(env.PORT||4173);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT muss zwischen 1 und 65535 liegen.');
 const codespace=env.CODESPACE_NAME&&env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
 const address=env.APP_ORIGIN||(codespace?`https://${env.CODESPACE_NAME}-${port}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`:`http://127.0.0.1:${port}`);
 const url=new URL(address);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('APP_ORIGIN muss eine Adresse ohne Pfad, Zugangsdaten oder Parameter sein.');
 if((env.NODE_ENV==='production'||codespace)&&url.protocol!=='https:')throw Error('APP_ORIGIN muss in Produktion und Codespaces HTTPS verwenden.');
 return {port,host:env.HOST||'127.0.0.1',origin:url.origin,database:env.DATABASE_PATH||resolve(root,'runtime/platform.sqlite')};
}
