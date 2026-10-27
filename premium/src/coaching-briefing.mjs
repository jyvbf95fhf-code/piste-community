export function normalizeCoachingBriefing(input={}){
 if(typeof input.text!=='string'||input.text.length>6000)throw Error('Briefing limité à 6 000 caractères.');
 if(!Array.isArray(input.photos)||input.photos.length>2)throw Error('Deux photos maximum.');
 const photos=input.photos.map(value=>{if(typeof value!=='string'||value.length>70000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('Photo JPEG compressée requise (70 ko maximum).');return value;});
 return {text:input.text.trim(),photos};
}
export async function briefingPhotos(files){
 if(files.length>2)throw Error('Deux photos maximum.');const out=[];
 for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw Error('Photo JPEG, PNG ou WebP requise (10 Mo maximum).');const bitmap=await createImageBitmap(file);try{let dataUrl;for(const size of [720,500,320]){const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);dataUrl=canvas.toDataURL('image/jpeg',.55);if(dataUrl.length<=70000)break;}if(dataUrl.length>70000)throw Error('Photo encore trop volumineuse.');out.push(dataUrl);}finally{bitmap.close();}}
 return out;
}
