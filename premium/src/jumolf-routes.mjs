const decode=value=>{try{const id=decodeURIComponent(value);return id&&!id.includes('/')?id:null;}catch{return null;}};
export function resolveJumolfRoute(path){
 const route=String(path||'').split('?')[0].replace(/\/+$/,'')||'/';
 if(route==='/jumolf')return {type:'entry'};
 if(route==='/jumolf/dashboard')return {type:'dashboard'};
 if(route==='/jumolf/dataset')return {type:'dataset'};
 if(route==='/jumolf/discoveries')return {type:'discoveries'};
 if(route==='/jumolf/progress')return {type:'progress'};
 if(route==='/jumolf/journal')return {type:'journal'};
 if(route==='/jumolf/activate')return {type:'activate'};
 if(route==='/jumolf/premium')return {type:'premium'};
 if(route==='/jumolf/access-code')return {type:'access-code'};
 if(route==='/jumolf/onboarding')return {type:'onboarding'};
 if(route==='/jumolf/compare')return {type:'compare'};
 if(route==='/jumolf/compare/demo')return {type:'compare',demo:true};
 if(route==='/jumolf/settings')return {type:'settings'};
 const match=route.match(/^\/jumolf\/(session|dog|discovery|targeted|verification)\/([^/]+)$/);
 if(!match)return null;
 const id=decode(match[2]);
 return id?{type:match[1],id}:null;
}
