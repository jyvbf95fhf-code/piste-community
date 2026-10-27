const PREFIX='piste-v2-report-draft:';
export function normalizeReportDraft(input={}){
 const text=(v,n)=>String(v??'').slice(0,n);
 const photos=(Array.isArray(input.photos)?input.photos:[]).slice(0,4).filter(p=>/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p?.dataUrl||'')&&p.dataUrl.length<=500000).map(p=>({dataUrl:p.dataUrl,caption:text(p.caption,240)}));
 return {version:1,title:text(input.title,180),sections:(Array.isArray(input.sections)?input.sections:[]).slice(0,20).map(s=>({title:text(s.title,120),text:text(s.text,12000),enabled:s.enabled!==false})),photos,updatedAt:Date.now()};
}
export function createReportDraftStore({storage,ownerId,sessionId}={}){
 if(!ownerId||!sessionId)throw Error('Compte et dossier requis.');const key=PREFIX+encodeURIComponent(ownerId)+':'+encodeURIComponent(sessionId);
 return {read(){try{const raw=JSON.parse(storage.getItem(key)||'null');return raw?.ownerId===ownerId&&raw?.sessionId===sessionId?normalizeReportDraft(raw.draft):null;}catch{return null;}},save(draft){const value=normalizeReportDraft(draft);storage.setItem(key,JSON.stringify({ownerId,sessionId,draft:value}));return value;},remove(){storage.removeItem(key);}};
}
