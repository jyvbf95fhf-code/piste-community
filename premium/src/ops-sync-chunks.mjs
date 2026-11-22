// Lossless transport primitive for future OPS cloud fragments.
// This module does NOT change existing persistence or mark a mission synchronized.
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
export const OPS_CHUNK_BYTES=96_000;
const toBase64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);};
const fromBase64=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function splitOpsPayload(payload,{chunkBytes=OPS_CHUNK_BYTES}={}){
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||!Number.isSafeInteger(chunkBytes)||chunkBytes<1024||chunkBytes>OPS_CHUNK_BYTES)throw Error('Dossier ou taille de fragment invalide.');
 const bytes=encoder.encode(JSON.stringify(payload));const hash=await digest(bytes),total=Math.max(1,Math.ceil(bytes.length/chunkBytes));
 if(total>2000)throw Error('Dossier trop volumineux pour une sauvegarde sûre.');
 const chunks=[];for(let i=0;i<total;i++){const slice=bytes.subarray(i*chunkBytes,(i+1)*chunkBytes);chunks.push({index:i,total,bytes:slice.length,data:toBase64(slice)});}
 return {version:1,encoding:'utf8-json-base64',totalBytes:bytes.length,sha256:hash,chunks};
}
export async function joinOpsPayload(bundle){
 if(bundle?.version!==1||bundle.encoding!=='utf8-json-base64'||!Number.isSafeInteger(bundle.totalBytes)||bundle.totalBytes<0||typeof bundle.sha256!=='string'||!/^[0-9a-f]{64}$/.test(bundle.sha256)||!Array.isArray(bundle.chunks)||!bundle.chunks.length||bundle.chunks.length>2000)throw Error('Sauvegarde OPS fragmentée invalide.');
 const sorted=[...bundle.chunks].sort((a,b)=>a.index-b.index);const parts=[];let size=0;
 for(let i=0;i<sorted.length;i++){const c=sorted[i];if(c.index!==i||c.total!==sorted.length||!Number.isSafeInteger(c.bytes)||c.bytes<0||c.bytes>OPS_CHUNK_BYTES||typeof c.data!=='string')throw Error('Fragment OPS manquant ou invalide.');let bytes;try{bytes=fromBase64(c.data);}catch{throw Error('Encodage du fragment OPS invalide.');}if(bytes.length!==c.bytes)throw Error('Taille de fragment OPS incompatible.');size+=bytes.length;parts.push(bytes);}
 if(size!==bundle.totalBytes)throw Error('Sauvegarde OPS incomplète.');
 const joined=new Uint8Array(size);let offset=0;for(const bytes of parts){joined.set(bytes,offset);offset+=bytes.length;}
 if(await digest(joined)!==bundle.sha256)throw Error('Intégrité du dossier OPS non vérifiée.');
 const result=JSON.parse(decoder.decode(joined));if(!result||typeof result!=='object'||Array.isArray(result))throw Error('Dossier OPS récupéré invalide.');
 return result;
}
