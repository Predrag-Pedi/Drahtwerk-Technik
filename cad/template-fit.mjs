import {size} from './model.mjs?v=20261119-3';
import {DRAW} from './geometry.mjs?v=20261119-3';

// A schema graphic may be resized explicitly; a physical part keeps its mm.
export function templateFit(t,page,percent=100){
 const schematic=t.category==='Schema',factor=schematic?percent/100:1;
 const [width,height]=size({kind:'template',template:t,width:t.width*factor,height:t.height*factor},page);
 const ratio=Math.min((DRAW.right-DRAW.left)/width,(DRAW.bottom-DRAW.top)/height);
 const fits=Number.isFinite(ratio)&&ratio>=1-1e-9;
 const suggestedPercent=Math.max(1,Math.min(100,Math.floor(percent*ratio*.985)));
 const requiredScale=page.scale/ratio/0.985;
 const suggestedScale=[1,2,5,10,15,20,25,50,75,100].find(n=>n>=requiredScale);
 return {fits,width,height,schematic,suggestedPercent,suggestedScale};
}
