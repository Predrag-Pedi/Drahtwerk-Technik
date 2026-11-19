import {resolve} from 'node:path';

export function runtimeConfig(root,env=process.env){
 const port=Number(env.PORT||4173);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT muss zwischen 1 und 65535 liegen.');
 const codespace=env.CODESPACE_NAME&&env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
 const address=env.APP_ORIGIN||(codespace?`https://${env.CODESPACE_NAME}-${port}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`:`http://127.0.0.1:${port}`);
 const url=new URL(address);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('APP_ORIGIN muss eine Adresse ohne Pfad, Zugangsdaten oder Parameter sein.');
 if((env.NODE_ENV==='production'||codespace)&&url.protocol!=='https:')throw Error('APP_ORIGIN muss in Produktion und Codespaces HTTPS verwenden.');
 const host=env.HOST||'127.0.0.1';
 const codespaceProxyPort=env.CODESPACES==='true'&&codespace&&url.origin===`https://${env.CODESPACE_NAME}-${port}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`?port:null;
 if(codespaceProxyPort&&!['127.0.0.1','localhost','::1'].includes(host))throw Error('Der Codespaces-Proxy benötigt einen lokalen Listen-Host.');
 return {port,host,origin:url.origin,codespaceProxyPort,database:env.DATABASE_PATH||resolve(root,'runtime/platform.sqlite')};
}
