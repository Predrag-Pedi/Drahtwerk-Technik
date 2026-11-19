import bands from './terminal-bands.mjs?v=20261119-4';

export const terminalSideOptions=[['original','Aus Vorlage'],['top','Oben – Balken oben'],['bottom','Unten – Balken unten']];
export function terminalBands(t){
 const entry=bands[t?.id];
 return entry&&entry.viewWidth===t.viewWidth&&entry.viewHeight===t.viewHeight?entry.bands:[];
}
export function validateTerminalSide(value,fail){
 if(value===undefined)return {};
 if(!terminalSideOptions.some(([key])=>key===value))return fail();
 return {terminalSide:value};
}
export function applyTerminalSide(e,side='original'){
 validateTerminalSide(side,()=>{throw Error('Ungültige Klemmenkennzeichnung.');});
 if(terminalBands(e.template).length)e.terminalSide=side;
 return e;
}
// Only the solid marker is replaced. Wires, terminal cells, ports and labels
// keep their original coordinates; this is not a terminal-placement command.
export function terminalMarker(t,side){
 if(!['top','bottom'].includes(side))return {hidden:[],markup:''};
 const tables=terminalBands(t);
 return {hidden:tables.flatMap(b=>b.hashes),markup:tables.map(b=>`<rect data-terminal-side="${side}" x="${b.left}" y="${side==='top'?b.top:b.bottom-b.barHeight}" width="${b.right-b.left}" height="${b.barHeight}" fill="#000000" stroke="none" pointer-events="none"/>`).join('')};
}
