// Drahtwerk references: Sihlhallenstrasse 5/7 sheets 2–3 and Forchstrasse
// sheet 9. Start at the lower left, use further rows above, keep only a
// transformer meter and its measurement bay inseparable. EW rules may differ;
// this is the workshop default, not a utility approval check.
export function meterPriority(d){
 if(/\bRSE\b|Rundsteuer|\bTRE\b/i.test(d.name||''))return 0;
 if(/\ballgemein\b/i.test(d.circuitName||''))return 1;
 if(/\bRes(?:erve)?(?:\b|\.)/i.test((d.name||'')+' '+(d.circuitName||'')))return 3;
 return 2;
}
export function compareMeters(a,b){return meterPriority(a)-meterPriority(b)||(a.pageNumber||0)-(b.pageNumber||0)||(a.tag&&b.tag?a.tag.localeCompare(b.tag,'de-CH',{numeric:true}):0);}
export function meterCells(meters,cols,maxRows=3){
 if(!meters.length)return {rows:0,cells:new Map(),occupied:new Set()};
 const ordered=meters.map((d,i)=>({d,i})).sort((a,b)=>compareMeters(a.d,b.d)||a.i-b.i).map(x=>x.d);
 for(let rows=Math.max(meters.some(d=>d.measurementOwner)?2:1,Math.ceil((meters.length+meters.filter(d=>d.measurementOwner).length)/cols));rows<=maxRows;rows++){
  const cells=new Map(),occupied=new Set();let failed=false;
  // Reference order is bottom-to-top within a column, then the next column.
  // A measurement module occupies the lower cell of its two-cell pair.
  let col=0;
  for(const d of ordered){const span=d.measurementOwner?2:1;let row;
   while(col<cols){
    // CT meter above its bay, preferably in the first two rows.
    const candidates=span===2?Array.from({length:rows-1},(_,i)=>i):Array.from({length:rows},(_,i)=>rows-1-i);
    row=candidates.find(r=>!occupied.has(r*cols+col)&&(span===1||!occupied.has((r+1)*cols+col)));
    if(row!==undefined)break;col++;
   }
   if(col>=cols){failed=true;break;}
   const cell=row*cols+col;cells.set(d,cell);occupied.add(cell);if(span===2)occupied.add(cell+cols);
  }
  if(!failed)return {rows,cells:new Map(ordered.map(d=>[d,cells.get(d)])),occupied};
 }
 throw Error('Die Zähler und Messmodule passen nicht in höchstens drei Zählerreihen.');
}
// Lower meter left of the column centre, upper meter right. Three feeders
// form one contiguous bank centred on the column, in bottom-to-top order.
export function feederOffset(widths,index){return widths.length<=2?(index===0?-widths[0]:0):-widths.reduce((a,b)=>a+b,0)/2+widths.slice(0,index).reduce((a,b)=>a+b,0);}

// Keep bank order and preferred centres where possible, but allow lateral
// compression around fixed supply blocks. Each NH bank includes all poles.
export function packFeederBanks(banks,left,right,obstacles=[]){
 const spans=obstacles.map(b=>({x:Math.max(left,b.x),end:Math.min(right,b.x+b.width)})).filter(b=>b.end>b.x).sort((a,b)=>a.x-b.x),gaps=[];let edge=left;
 for(const b of spans){if(b.x>edge)gaps.push({left:edge,right:b.x});edge=Math.max(edge,b.end);}if(edge<right)gaps.push({left:edge,right});
 const result=new Map();let index=0;
 for(const gap of gaps){const group=[];let used=0;while(index<banks.length&&used+banks[index].width<=gap.right-gap.left+.001){const b=banks[index++];group.push(b);used+=b.width;}
  let x=gap.left,remaining=used;
  for(const b of group){remaining-=b.width;const pos=Math.max(x,Math.min(b.preferred,gap.right-remaining-b.width));result.set(b.key,pos);x=pos+b.width;}
 }
 return index===banks.length?result:null;
}
