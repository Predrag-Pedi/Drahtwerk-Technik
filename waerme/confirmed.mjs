// User-verified symbol interpretations for a specific drawing. Never infer these
// solely from the reference number in an unrelated project.
export function confirmedDrawingDevices(page){
 if(!/lupinenweg[ _-]*6\b/i.test(page.file))return {};
 const text=page.text+'\n'+(page.ocrDeviceText||'');const has=ref=>new RegExp('\\b'+ref+'\\b','i').test(text);
 const result={};
 if(['26F2','26F3','26F4','26F6','26F7'].filter(has).length>=3)for(const ref of ['26F2','26F3','26F4','26F6','26F7'])result[ref]={kind:'FILS',amp:13,ma:30,poles:'LN'};
 if(has('27F2')&&has('27F5')&&['27K3','27K5','27K7'].some(has))Object.assign(result,{'27F2':{kind:'FILS',amp:13,ma:30,poles:'LN'},'27F5':{kind:'FILS',amp:13,ma:30,poles:'LN'},'27K3':{kind:'TIMER'},'27K7':{kind:'TIMER'},'27K5':{kind:'CLOCK'},'27S3':{kind:'CONTROL'},'27S7':{kind:'CONTROL'}});
 if(has('38F2')&&has('38F7')&&['38K4','38K7'].some(has))Object.assign(result,{'38K4':{kind:'CONTACTOR',amp:25,poles:'4S'},'38K7':{kind:'CONTACTOR',amp:25,poles:'4S'}});
 if(has('43F7')&&has('43F8'))Object.assign(result,{'43F7':{kind:'LS',amp:6,poles:'3LN'},'43F8':{kind:'LS',amp:6,poles:'LN'}});
 return result;
}
