// Each dropdown uses all other filters, but not its own selection.
// One catalogue pass keeps the large VSAS catalogue responsive.
export function filterCatalog(catalog,filters={},search='',text=p=>[p.article,p.supplierArticle,p.orderNumber,p.name,p.brand,p.type,p.category].join(' ').toLocaleLowerCase()){
 const words=search.toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const sets={category:new Set(),brand:new Set(),type:new Set()},found=[];
 for(const p of catalog){
  if(filters.source&&p.source!==filters.source)continue;
  if(words.length&&!words.every(w=>text(p).includes(w)))continue;
  const type=p.type||'Artikel',category=!filters.category||p.category===filters.category,brand=!filters.brand||p.brand===filters.brand,kind=!filters.type||type===filters.type;
  if(brand&&kind&&p.category)sets.category.add(p.category);
  if(category&&kind&&p.brand)sets.brand.add(p.brand);
  if(category&&brand)sets.type.add(type);
  if(category&&brand&&kind)found.push(p);
 }
 return {found,facets:Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,[...v].sort((a,b)=>a.localeCompare(b,'de-CH'))]))};
}
