// Match catalogue attributes to one protection function in a template. Geometry
// and terminal positions are never changed when choosing another article.
const point=t=>t?.runs?.[0]?.matrix.slice(4)||t?.matrix?.slice(4)||[0,0];
export function protectionFields(t){
 if(t?.category!=='Schema')return [];
 const allLabels=[...new Map((t.labels||[]).map(l=>[l.key,l])).values()],labels=allLabels.filter(l=>['F','Q'].includes(l.letter)),texts=t.details?.texts||[],name=t.name.replaceAll('_',' '),result=[];
 const namedKind=/\bFI[\s/-]*LS\b/i.test(name)?'fils':/\bFI\b/i.test(name)?'fi':/\bLS\b/i.test(name)?'ls':'';
 const owner=text=>allLabels.reduce((best,l)=>!best||Math.hypot(...point(text).map((v,i)=>v-point(l)[i]))<Math.hypot(...point(text).map((v,i)=>v-point(best)[i]))?l:best,null);
 for(const l of labels){
  const local=texts.filter(x=>owner(x)?.key===l.key),read=x=>x.text.trim(),current=local.filter(x=>/^\d+(?:[.,]\d+)?\s*A$/i.test(read(x))),placeholder=local.find(x=>read(x)==='A');
  if(current.length>1)continue;
  const amp=current[0]||(labels.length===1&&namedKind?placeholder:null);if(!amp)continue;
  const residual=local.find(x=>/^\d+(?:[.,]\d+)?\s*mA$/i.test(read(x)))||local.find(x=>read(x)==='FI');
  const onRow=(x,y)=>Math.abs(point(x)[1]-point(y)[1])<Math.max(x.runs?.[0]?.fontSize||0,y.runs?.[0]?.fontSize||0)*.7;
  const curve=local.find(x=>read(x)==='CHARLS')||local.find(x=>/^[BCDKZ]$/.test(read(x))&&onRow(x,amp));
  const kind=labels.length===1&&namedKind?namedKind:residual?(curve?'fils':'fi'):curve?'ls':'';if(!kind)continue;
  const type=local.find(x=>read(x)==='CHARFI')||residual&&local.find(x=>x!==amp&&/^(?:A|AC|A[- ]SI|A HI|B\+?|B-SI|B-EV|F|F-SI)$/.test(read(x))&&onRow(x,residual));
  const pinTexts=local.filter(x=>point(x)[0]>point(amp)[0]).map(read),number=name.match(/\b([1234])(?:L|P|[- ]pol)/i)?.[1],phases=[...new Set((t.ports||[]).map(p=>p.phase).filter(p=>/^L\d$/.test(p)))];
  let count=/\bL[123]N/i.test(name)?1:number?Number(number):pinTexts.includes('5')&&pinTexts.includes('6')?3:pinTexts.includes('3')&&pinTexts.includes('4')?2:pinTexts.includes('1')&&pinTexts.includes('2')?1:phases.length||1;
  const neutral=/\b[123](?:L|P)N|\b[123]LNPE/i.test(name)||pinTexts.includes('N')||labels.length===1&&(t.ports||[]).some(p=>p.phase==='N');
  const poles=count===4?'4P':`${count}P${neutral?'+N':''}`;
  result.push({key:l.key,kind,poles,fields:{current:amp.key,...(curve&&kind!=='fi'?{curve:curve.key}:{}),...(residual&&kind!=='ls'?{residual:residual.key}:{}),...(type&&kind!=='ls'?{rcdType:type.key}:{}),...(labels.length===1&&local.find(x=>read(x)==='TYP')?{article:local.find(x=>read(x)==='TYP').key}:{}),...(local.find(x=>/^\d+\s*V(?:AC|DC)?$/.test(read(x)))?{voltage:local.find(x=>/^\d+\s*V(?:AC|DC)?$/.test(read(x))).key}:{})}});
 }
 return result;
}
