import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function publicSEO(root,origin){
 const paths=['/',...readdirSync(resolve(root,'produkte')).filter(name=>/^[a-z0-9-]+\.html$/.test(name)).sort().map(name=>'/produkte/'+name)];
 const urls=new Set(paths);
 return {
  isPublic:path=>urls.has(path)||path==='/home.html',
  sitemap:'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+escape(new URL(path,origin).href)+'</loc></url>').join('')+'</urlset>',
  robots:'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+new URL('/sitemap.xml',origin).href+'\n',
  markup:path=>'<link rel="canonical" href="'+escape(new URL(path==='/home.html'?'/':path,origin).href)+'"><meta name="robots" content="index,follow"><meta property="og:site_name" content="SchaltBase"><meta property="og:url" content="'+escape(new URL(path==='/home.html'?'/':path,origin).href)+'">'
 };
}
