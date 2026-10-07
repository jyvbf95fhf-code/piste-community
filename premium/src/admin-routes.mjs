const ROUTES=new Map([['/admin','dashboard'],['/admin/members','members'],['/admin/premium','premium'],['/admin/codes','codes'],['/admin/scientific','scientific'],['/admin/services','services'],['/admin/deployments','deployments'],['/admin/errors','errors'],['/admin/audit','audit']]);
export function resolveAdminRoute(pathname='/admin'){
 const url=new URL(pathname,'https://piste.invalid'),path=url.pathname.replace(/\/$/,'')||'/';
 const memberMatch=path.match(/^\/admin\/member\/([^/]+)$/);
 if(memberMatch){try{return {type:'member',id:decodeURIComponent(memberMatch[1]),path,query:Object.fromEntries(url.searchParams)};}catch{return {type:'unknown',id:null,path,query:Object.fromEntries(url.searchParams)};}}
 if(path==='/admin/member'||path.startsWith('/admin/member/'))return {type:'unknown',id:null,path,query:Object.fromEntries(url.searchParams)};
 if(!path.startsWith('/admin'))return null;
 return {type:ROUTES.get(path)||'unknown',id:null,path,query:Object.fromEntries(url.searchParams)};
}
export const ADMIN_ROUTE_LINKS=Object.freeze([{path:'/admin',label:'Vue générale'},{path:'/admin/members',label:'Membres'},{path:'/admin/premium',label:'Premium & JUMOLF'},{path:'/admin/codes',label:'Codes JUMOLF'},{path:'/admin/scientific',label:'Scientifique'},{path:'/admin/services',label:'Services'},{path:'/admin/deployments',label:'Déploiements'},{path:'/admin/errors',label:'Erreurs'},{path:'/admin/audit',label:'Audit'}]);
