const TYPES=Object.freeze({
 '/profile':'home','/profile/account':'account','/profile/dogs':'dogs','/profile/premium':'premium',
 '/profile/access':'access','/profile/notifications':'notifications','/profile/preferences':'preferences','/profile/about':'about'
});
export function resolveProfileRoute(path){
 const normalized=String(path||'').split(/[?#]/,1)[0].replace(/\/+$/,'')||'/';
 const type=TYPES[normalized];return type?{type}:null;
}
