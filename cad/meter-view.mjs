import {trimContinuationTails} from './line-edit.mjs?v=20261113-18';
// A reversible view of the original meter macro, with every outgoing phase ending
// at its own continuation junction. The original geometry remains in the project.
export function continuationCut(e){const ends=e.template?.details?.ends;if(!e.continuationOnly||e.rotation!==0||!e.template?.labels?.some(l=>l.letter==='P')||!ends?.length)return null;return Math.max(...ends.map(a=>a.y))+8;}
export function meterView(e,p){const cut=continuationCut(e);if(cut===null)return e;const copy={...e,template:{...e.template,paths:[...e.template.paths]}};const links=e.template.details.ends.map(a=>({a:{page:p.id,element:e.id,kind:'template',key:a.key},b:{}}));trimContinuationTails({links},p,copy);return copy;}
