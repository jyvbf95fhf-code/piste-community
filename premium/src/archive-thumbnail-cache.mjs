// Private, best-effort raster cache. It is separate from the public offline shell.
const DB='piste-v2-archive-thumbnails-v1',STORE='images';
export async function thumbnailCacheKey(segments,width,height){
 if(!Array.isArray(segments)||!segments.length||!segments.every(s=>Array.isArray(s)&&s.length&&s.every(p=>Number.isFinite(p?.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p?.longitude)&&Math.abs(p.longitude)<=180))||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!globalThis.crypto?.subtle)return null;
 const bytes=new TextEncoder().encode(JSON.stringify(['ign-ortho-route-v1',width,height,segments.map(s=>s.map(p=>[p.latitude,p.longitude]))]));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export function createArchiveThumbnailCache({indexedDB=globalThis.indexedDB,dbName=DB,maxEntries=120,maxBytes=12*1024*1024}={}){
 let opening;
 function open(){if(!indexedDB)return Promise.resolve(null);if(!opening)opening=new Promise(resolve=>{
  let request,settled=false;const finish=db=>{if(settled){db?.close();return;}settled=true;clearTimeout(timer);resolve(db);};const timer=setTimeout(()=>finish(null),1500);
  try{request=indexedDB.open(dbName,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};finish(db);};request.onerror=request.onblocked=()=>finish(null);}catch{finish(null);}
 });return opening;}
 const id=(owner,key)=>JSON.stringify([owner,key]);
 const validOwner=owner=>typeof owner==='string'&&owner.length>0&&owner.length<=200;
 const validBlob=blob=>blob instanceof Blob&&blob.type==='image/jpeg'&&blob.size>0&&blob.size<=512*1024;
 async function run(mode,work){try{const db=await open();if(!db)return null;return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);let value=null;tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Thumbnail cache unavailable'));work(tx.objectStore(STORE),v=>{value=v;});});}catch{return null;}}
 return {
  async get(owner,key){if(!validOwner(owner)||!key)return null;return run('readonly',(store,done)=>{const req=store.get(id(owner,key));req.onsuccess=()=>{const row=req.result;done(row?.owner===owner&&validBlob(row.blob)?row.blob:null);};});},
  async put(owner,key,blob){if(!validOwner(owner)||!key||!validBlob(blob)||blob.size>maxBytes||maxEntries<1)return false;return !!await run('readwrite',(store,done)=>{const req=store.getAll();req.onsuccess=()=>{const next={id:id(owner,key),owner,blob,at:Date.now()},rows=req.result.filter(r=>r.id!==next.id).sort((a,b)=>a.at-b.at);let bytes=rows.reduce((n,r)=>n+(r.blob?.size||0),0);while(rows.length>=maxEntries||bytes+blob.size>maxBytes){const old=rows.shift();if(!old)break;bytes-=old.blob?.size||0;store.delete(old.id);}store.put(next);done(true);};});},
  async clear(owner){if(!validOwner(owner)||!indexedDB)return 0;return run('readwrite',(store,done)=>{const req=store.openCursor();let removed=0;req.onsuccess=()=>{const cursor=req.result;if(cursor){if(cursor.value?.owner===owner){cursor.delete();removed++;}cursor.continue();}else done(removed);};});},
  async remove(owner,key){if(validOwner(owner)&&key)await run('readwrite',store=>store.delete(id(owner,key)));}
 };
}
