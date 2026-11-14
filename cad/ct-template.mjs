import {pathHash} from './template-text.mjs?v=20261114-05';
// The original small CT is drawn across the page. Mount it upright without
// stretching it: three 43.7 mm wide originals fit beside one another.
export function uprightCT(original){
 const t=structuredClone(original),hashes=new Map(),height=t.viewHeight;
 for(const p of t.paths){const old=pathHash(p.d);p.d=p.d.replace(/([MLCQZmlcqz])([^MLCQZmlcqz]*)/g,(_,cmd,args)=>{
  if(cmd.toUpperCase()==='Z')return cmd;
  const ns=args.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)?.map(Number)||[];
  if(ns.length%2)throw Error('Stromwandler-Vorlage enthält unvollständige Koordinaten.');
  const out=[];for(let i=0;i<ns.length;i+=2)out.push(cmd===cmd.toUpperCase()?height-ns[i+1]:-ns[i+1],ns[i]);return cmd+out.join(' ');
 });hashes.set(old,pathHash(p.d));}
 for(const l of t.details?.texts||[]){l.hashes=l.hashes.map(h=>hashes.get(h)||h);for(const r of l.runs){const [a,b,c,d,e,f]=r.matrix;r.matrix=[-b,a,-d,c,height-f,e];}}
 [t.width,t.height]=[t.height,t.width];[t.viewWidth,t.viewHeight]=[t.viewHeight,t.viewWidth];return t;
}
