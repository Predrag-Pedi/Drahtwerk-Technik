import {companyProfile,addressLines} from '../platform/client.mjs';
import {neutralArtwork,safeLogo} from '../platform/branding.mjs';
import {localizeSheet} from './sheet-language.mjs';
import {cadTerm,drawingPageTitle,validLanguage} from './template-language.mjs';
import artwork from './standard-pages.mjs?v=20261119-7';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(x,y,value,size=8)=>`<text x="${x}" y="${y}" fill="#000" stroke="none" font-family="Arial" font-size="${size}">${esc(value)}</text>`;
const backgrounds=new Map();
export function standardFrame(d,p,brand=companyProfile()){
 const kind=p.standardType||(p.type==='cover'?'cover':p.type==='index'?'index':'');
 const language=validLanguage(d.drawingLanguage),cacheKey=(kind||'symbols')+'-'+language;
 if(!backgrounds.has(cacheKey)){const clean=neutralArtwork(artwork[kind]||artwork.symbols,kind==='cover').replaceAll('#ff0000','#000000');backgrounds.set(cacheKey,localizeSheet(clean,language));}
 const inner=backgrounds.get(cacheKey);
 const clip=kind?'':`<defs><clipPath id="frameOnly"><path d="M0 0H842V595H0Z M42 51V548H795V51Z" clip-rule="evenodd"/></clipPath></defs>`;
 let body=clip+`<g fill="#000" stroke="none" ${kind?'':'clip-path="url(#frameOnly)"'}>${inner}</g>`;
 const logo=safeLogo(brand.logo),cover=kind==='cover',companyLines=[...addressLines(brand),[brand.email,brand.phone].filter(Boolean).join(' · ')];
 const bx=cover?287:391,by=cover?494:559,step=cover?12:4.5,fs=cover?8:3.6;
 body+=`<defs><clipPath id="companyBrand"><rect x="${cover?65:326}" y="${cover?474:550}" width="${cover?390:126}" height="${cover?80:28}"/></clipPath></defs><g clip-path="url(#companyBrand)">`;
 if(logo)body+=`<image x="${cover?71:328}" y="${cover?476:551}" width="${cover?194:57}" height="${cover?77:25}" preserveAspectRatio="xMidYMid meet" href="${esc(logo)}"/>`;
 body+=companyLines.slice(0,5).map((line,i)=>t(bx,by+i*step,line,fs)).join('')+'</g>';
 if(kind==='cover'){
  body+=t(348,150,d.name,12)+t(348,213,d.address,12)+t(348,305,d.customer,12)+t(348,404,d.order,12)+t(348,451,d.schema,12)+t(714,497,d.date,8)+t(714,527,p.number,8)+t(598,556,d.pages.length,8);
 }else{
  const idx=d.pages.indexOf(p);body+=t(185,560,d.name,8)+t(459,558,drawingPageTitle(p,language),7)+t(644,560,d.order,8)+t(644,575,d.schema,8)+t(784,560,p.number,8)+t(143,563,d.author,5)+t(143,577,d.date,5)+t(736,574,d.pages[idx-1]?.number||'',5)+t(786,574,d.pages[idx+1]?.number||'',5);
  if(p.type==='dispo')body+=t(459,574,`${cadTerm('Massstab',language)} 1:${p.scale} · ${cadTerm('Masse in mm',language)}`,6);
  if(kind==='index')d.pages.forEach((q,i)=>{const columns=Math.ceil(d.pages.length/29),rows=Math.ceil(d.pages.length/columns),col=Math.floor(i/rows),y=120+(i%rows)*13.9,x=70+col*700/columns;body+=t(x,y,q.number,columns===1?8:6)+t(x+47/columns,y,drawingPageTitle(q,language).slice(0,columns===1?65:20),columns===1?8:5);if(columns===1)body+=t(616,y,d.date,7)+t(678,y,d.author,7);});
  if(kind==='conditions')body+=t(267,210,d.ratedCurrent||'',9);
 }
 return `<g transform="translate(-35.85 -51.65) scale(1.52116 1.53307)">${body}</g>`;
}
