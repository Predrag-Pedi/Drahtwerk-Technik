// Numbered working sheets follow their actual sheet number. Project-specific
// names and the standard introductory sheets keep their existing titles.
export function defaultPageTitle(type,number){return number>=10&&['schema','dispo'].includes(type)?`Seite ${number}`:({schema:'Elektroschema',dispo:'Disposition',cover:'Deckblatt',index:'Inhaltsverzeichnis'})[type];}
export function normalizePageTitle(p){
 if(p.number>=10&&!p.standardType&&['schema','dispo'].includes(p.type)&&/^(?:Elektroschema|Neue Seite|Seite\s+\d+)(?:\s*[–—-]\s*Kopie)*$/i.test(p.title.trim()))p.title=`Seite ${p.number}`;
 return p;
}
