const decode=value=>{try{return decodeURIComponent(value);}catch{return null;}};

export function resolveCommunityRoute(pathname=''){
 const path=String(pathname).split(/[?#]/,1)[0].replace(/\/+$/,'')||'/';
 if(path==='/community')return {type:'feed'};
 if(path==='/community/new')return {type:'new'};
 if(path==='/community/search')return {type:'search'};
 if(path==='/community/contacts')return {type:'contacts'};
 const profile=path.match(/^\/community\/profile\/([^/]+)$/);
 if(profile){const id=decode(profile[1]);return id?{type:'profile',id:id==='me'?'self':id}:null;}
 const post=path.match(/^\/community\/post\/([^/]+)$/);
 if(post){const id=decode(post[1]);return id?{type:'post',id}:null;}
 return null;
}
