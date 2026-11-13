import {buildAutomaticDispo} from './dispo-auto.mjs?v=20261113-16';
// The page properties hold frame dimensions. Generating a disposition needs no dialog.
export async function editAutomaticDispo(doc,p,apply){
 const generated=await buildAutomaticDispo(doc,p);
 apply(generated);
 return generated;
}
