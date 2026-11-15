import {pathHash} from './template-text.mjs?v=20261115-25';
// Keep the small original CT horizontal and at its original physical scale.
// Its 121.1 mm library envelope includes the BMK to the right; the actual
// drawing ends at x=6605 (about 80 mm). Move the editable caption above the
// body instead, so three bodies fit on the 250 mm measurement plate.
export function horizontalCT(original){
 const t=structuredClone(original),captionHashes=new Set((t.details?.texts||[]).flatMap(l=>l.hashes));
 t.paths=t.paths.filter(p=>!captionHashes.has(pathHash(p.d)));
 t.width=original.width*6606/original.viewWidth;t.viewWidth=6606;
 for(const l of t.details?.texts||[])for(const r of l.runs){r.matrix=[1,0,0,1,250,800];r.fontSize=400;}
 return t;
}
