const loopback=address=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);

function codespaceProxy(req,allowed,codespaceProxyPort){
 // GitHub's tunnel rewrites Host. Trust only the explicitly enabled local
 // Codespaces proxy, the exact public hostname and HTTPS, never a header chain.
 return Boolean(codespaceProxyPort&&allowed.protocol==='https:'&&loopback(req.socket.remoteAddress)
  &&[`localhost:${codespaceProxyPort}`,`127.0.0.1:${codespaceProxyPort}`,`[::1]:${codespaceProxyPort}`].includes(req.headers.host)
  &&req.headers['x-forwarded-host']===allowed.host&&req.headers['x-forwarded-proto']==='https');
}

export function validRequestHost(req,allowed,codespaceProxyPort=null){
 return req.headers.host===allowed.host||codespaceProxy(req,allowed,codespaceProxyPort);
}

export function validRequestOrigin(req,allowed,codespaceProxyPort=null){
 if(req.headers.origin===allowed.origin)return true;
 // The Codespaces tunnel also rewrites Origin to https://localhost:PORT.
 // Forwarded host alone identifies the destination, not the requesting site.
 // Require browser Fetch Metadata and an unchanged same-origin Referer as well.
 if(!codespaceProxy(req,allowed,codespaceProxyPort)
  ||req.headers.origin!==`https://${req.headers.host}`
  ||req.headers['sec-fetch-site']!=='same-origin')return false;
 try{
  const referer=new URL(req.headers.referer);
  return referer.origin===allowed.origin&&!referer.username&&!referer.password;
 }catch{return false;}
}
