import {importVSAS} from './vsas.mjs?v=20261110-9';
self.onmessage=async({data})=>{try{const result=await importVSAS(data.file,data.options,(percent,records)=>self.postMessage({kind:'progress',percent,records}));self.postMessage({kind:'done',...result});}catch(error){self.postMessage({kind:'error',message:error.message});}};
