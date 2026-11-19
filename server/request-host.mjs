const loopback=address=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);

export function validRequestHost(req,allowed,codespaceProxyPort=null){
 if(req.headers.host===allowed.host)return true;
 // GitHub's tunnel rewrites Host. Trust only the explicitly enabled local
 // Codespaces proxy, the exact public hostname and HTTPS, never a header chain.
 return Boolean(codespaceProxyPort&&allowed.protocol==='https:'&&loopback(req.socket.remoteAddress)
  &&[`localhost:${codespaceProxyPort}`,`127.0.0.1:${codespaceProxyPort}`,`[::1]:${codespaceProxyPort}`].includes(req.headers.host)
  &&req.headers['x-forwarded-host']===allowed.host&&req.headers['x-forwarded-proto']==='https');
}
