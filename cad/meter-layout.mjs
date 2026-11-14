// Drahtwerk references: Sihlhallenstrasse 5/7 sheets 2–3 and Forchstrasse
// sheet 9. Start at the lower left, use further rows above, keep only a
// transformer meter and its measurement bay inseparable. EW rules may differ;
// this is the workshop default, not a utility approval check.
export function meterPriority(d){
 if(/\bRSE\b|Rundsteuer|\bTRE\b/i.test(d.name||''))return 0;
 if(/\ballgemein\b/i.test(d.circuitName||''))return 1;
 return 2;
}
export function meterCells(meters,cols,maxRows=3){
 if(!meters.length)return {rows:0,cells:new Map(),occupied:new Set()};
 const ordered=meters.map((d,i)=>({d,i})).sort((a,b)=>meterPriority(a.d)-meterPriority(b.d)||a.i-b.i).map(x=>x.d);
 for(let rows=Math.max(1,Math.ceil((meters.length+meters.filter(d=>d.measurementOwner).length)/cols));rows<=maxRows;rows++){
  const cells=new Map(),occupied=new Set();let failed=false;
  // Reserve tall pairs before singles, otherwise a late CT meter would
  // unnecessarily force another row after singles filled the bottom row.
  for(const d of [...ordered.filter(d=>d.measurementOwner),...ordered.filter(d=>!d.measurementOwner)]){let found=false;
   for(let row=rows-(d.measurementOwner?2:1);row>=0&&!found;row--)for(const col of Array.from({length:cols},(_,i)=>i).sort((a,b)=>d.measurementOwner?Math.abs(a-Math.min(ordered.indexOf(d),cols-1))-Math.abs(b-Math.min(ordered.indexOf(d),cols-1)):a-b)){
    const cell=row*cols+col;if(occupied.has(cell)||d.measurementOwner&&occupied.has(cell+cols))continue;
    cells.set(d,cell);occupied.add(cell);if(d.measurementOwner)occupied.add(cell+cols);found=true;break;
   }
   if(!found){failed=true;break;}
  }
  if(!failed)return {rows,cells:new Map(ordered.map(d=>[d,cells.get(d)])),occupied};
 }
 throw Error('Die Zähler und Messmodule passen nicht in höchstens drei Zählerreihen.');
}
// Lower meter left of the column centre, upper meter right. Three feeders
// form one contiguous bank centred on the column, in bottom-to-top order.
export function feederOffset(widths,index){return widths.length<=2?(index===0?-widths[0]:0):-widths.reduce((a,b)=>a+b,0)/2+widths.slice(0,index).reduce((a,b)=>a+b,0);}
