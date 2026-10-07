const decode=value=>{try{const id=decodeURIComponent(value);return id&&!id.includes('/')?id:null;}catch{return null;}};
const collections=new Set(['sessions','cohorts','compare','annotations','benchmarks','blind','runs','data-quality','longitudinal','evaluation','errors','hypotheses','anomalies','corpus']);
export function canonicalScientificPath(path){return path==='/research'?'/scientific':path;}
export function resolveScientificRoute(path){
 const route=String(path||'').split('?')[0].replace(/\/+$/,'')||'/';
 if(route==='/scientific')return{type:'dashboard'};
 if(!route.startsWith('/scientific/'))return null;
 const tail=route.slice('/scientific/'.length),parts=tail.split('/');
 if(parts.length===1&&collections.has(parts[0]))return{type:parts[0]};
 if(parts.length===3&&parts[0]==='corpus'&&parts[1]==='dog'){const id=decode(parts[2]);return id&&/^DOG-\d{3}$/.test(id)?{type:'corpus-dog',id}:{type:'not-found'};}
 if(parts.length===2&&['session','cohort'].includes(parts[0])){const id=decode(parts[1]);return id?{type:parts[0],id}:{type:'not-found'};}
 return{type:'not-found'};
}
