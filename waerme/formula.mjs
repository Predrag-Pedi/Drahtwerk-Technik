// Restricted arithmetic evaluator for the template's loss sheets. No eval or script execution.
export function shiftFormula(formula,from,to){
 const col=s=>[...s].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),letters=n=>{let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;};
 const a=from.match(/([A-Z]+)(\d+)/),b=to.match(/([A-Z]+)(\d+)/),dx=col(b[1])-col(a[1]),dy=+b[2]-+a[2];
 return formula.replace(/(\$?)([A-Z]+)(\$?)(\d+)/g,(_,ac,c,ar,r)=>ac+(ac?c:letters(col(c)+dx))+ar+(ar?r:+r+dy));
}
export function calculateCell(sheets,sheet,address,overrides=new Map()){
 const memo=new Map(),visiting=new Set();
 const value=(s,a)=>{a=a.replace(/\$/g,'');const key=s+'!'+a;if(overrides.has(key))return overrides.get(key);if(memo.has(key))return memo.get(key);if(visiting.has(key))throw Error('Zirkelbezug: '+key);const c=sheets.get(s)?.cells.get(a);if(!c)return 0;visiting.add(key);let v=c.formula?formula(c.formula,s):c.value??0;visiting.delete(key);memo.set(key,v);return v;};
 const numeric=v=>{if(typeof v!=='number'||!Number.isFinite(v))throw Error('Nicht numerischer Vorlagenwert');return v;};
 function formula(src,s){
  const tokens=src.replace(/^=/,'').match(/'(?:[^']|'')+'!\$?[A-Z]+\$?\d+|\$?[A-Z]+\$?\d+|\d+(?:\.\d+)?|SUM|[()+\-*/,:]/g)||[];
  if(tokens.join('')!==src.replace(/^=/,'').replace(/\s+(?=(?:[^']*'[^']*')*[^']*$)/g,''))throw Error('Nicht unterstützte Excel-Formel: '+src);
  let pos=0;const peek=()=>tokens[pos],take=()=>tokens[pos++];
  function ref(t){const m=t.match(/^(?:'((?:[^']|'')+)'!)?(\$?[A-Z]+\$?\d+)$/);if(!m)throw Error('Ungültiger Zellbezug '+t);return [m[1]?.replace(/''/g,"'")||s,m[2].replace(/\$/g,'')];}
  function primary(){const t=take();if(t==='('){const v=expr();if(take()!==')')throw Error('Klammer fehlt');return v;}if(t==='-')return -numeric(primary());if(t==='+')return numeric(primary());if(t==='SUM'){
   if(take()!=='(')throw Error('SUM-Klammer fehlt');let total=0;while(peek()!==')'){
    if(tokens[pos+1]===':'){const [ss,start]=ref(take());take();let end=ref(take());while(peek()===':'){take();end=ref(take());}if(ss!==end[0])throw Error('Blattübergreifender Bereich');const a=start.match(/([A-Z]+)(\d+)/),b=end[1].match(/([A-Z]+)(\d+)/);if(a[1]!==b[1])throw Error('Mehrspaltiger Bereich nicht unterstützt');for(let i=Math.min(+a[2],+b[2]);i<=Math.max(+a[2],+b[2]);i++){const v=value(ss,a[1]+i);if(typeof v==='number')total+=v;}}
    else{const v=expr();if(typeof v==='number')total+=v;}
    if(peek()===',')take();else if(peek()!==')')throw Error('SUM-Trennzeichen fehlt');
   }take();return total;}
   if(/^\d/.test(t||''))return Number(t);const [ss,aa]=ref(t||'');return value(ss,aa);
  }
  function product(){let v=primary();while(['*','/'].includes(peek())){const op=take(),b=numeric(primary());v=op==='*'?numeric(v)*b:numeric(v)/b;}return v;}
  function expr(){let v=product();while(['+','-'].includes(peek())){const op=take(),b=numeric(product());v=op==='+'?numeric(v)+b:numeric(v)-b;}return v;}
  const result=expr();if(pos!==tokens.length)throw Error('Formel nicht vollständig verarbeitet: '+src);return numeric(result);
 }
 return value(sheet,address);
}
