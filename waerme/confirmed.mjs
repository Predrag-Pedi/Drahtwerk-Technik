// User-verified symbol interpretations for a specific drawing. Never infer these
// solely from the reference number in an unrelated project.
export function confirmedDrawingDevices(page,documentText=''){
 if(!/lupinenweg[ _-]*6\b/i.test(page.file)&&!(/Lupinenweg\s+6\b/i.test(documentText)&&/\b2582\b/.test(documentText)))return {};
 const text=page.text+'\n'+(page.ocrDeviceText||'');const has=ref=>new RegExp('\\b'+ref+'\\b','i').test(text);
 const result={};
 if(['26F2','26F3','26F4','26F6','26F7'].filter(has).length>=3)for(const ref of ['26F2','26F3','26F4','26F6','26F7'])result[ref]={kind:'FILS',amp:13,ma:30,poles:'LN'};
 if(has('27F2')&&has('27F5')&&['27K3','27K5','27K7'].some(has))Object.assign(result,{'27F2':{kind:'FILS',amp:13,ma:30,poles:'LN'},'27F5':{kind:'FILS',amp:13,ma:30,poles:'LN'},'27K3':{kind:'TIMER'},'27K7':{kind:'TIMER'},'27K5':{kind:'CLOCK'},'27S3':{kind:'CONTROL'},'27S7':{kind:'CONTROL'}});
 if(has('38F2')&&has('38F7')&&['38K4','38K7'].some(has))Object.assign(result,{'38K4':{kind:'CONTACTOR',amp:25,poles:'4S'},'38K7':{kind:'CONTACTOR',amp:25,poles:'4S'}});
 // A confirmed contactor must not depend on neighbouring fuse OCR succeeding.
 for(const ref of ['38K4','38K7','53K1','53K3','53K5','53K7','53K8'])if(has(ref))result[ref]={kind:'CONTACTOR',amp:25,poles:'4S'};
 const row53=['53K1','53K3','53K5','53K7','53K8'];if(row53.filter(has).length>=3||(/\b53\s*\/\s*56\b/.test(text)&&/WZ[U2]/i.test(text)&&row53.some(has)))for(const ref of row53)result[ref]={kind:'CONTACTOR',amp:25,poles:'4S'};
 if(has('43F7')&&has('43F8'))Object.assign(result,{'43F7':{kind:'LS',amp:6,poles:'3LN'},'43F8':{kind:'LS',amp:6,poles:'LN'}});
 return result;
}
