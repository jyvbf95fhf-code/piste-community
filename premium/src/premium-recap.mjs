import {escapeHTML as e} from './components.mjs';
const safeRoutes=new Set(['/','/profile','/jumolf','/jumolf/activate','/jumolf/access-code']);
export function createPremiumWelcome({storage=null}={}){
 const dismissed=new Set(),key=owner=>'piste-v2-premium-welcome:1:'+encodeURIComponent(owner);
 return {
  visible({ownerId,access={},verified=false,route}={}){
   if(!verified||!ownerId||!access.entitlement_valid||access.entitlement!=='premium'||!safeRoutes.has(route)||dismissed.has(ownerId))return false;
   try{return storage?.getItem(key(ownerId))!=='seen';}catch{return true;}
  },
  dismiss(ownerId,currentOwnerId){
   if(!ownerId||ownerId!==currentOwnerId)return false;
   dismissed.add(ownerId);try{storage?.setItem(key(ownerId),'seen');}catch{/* Keep dismissal in memory if device storage is unavailable. */}return true;
  }
 };
}
export function PremiumRecap({welcome=false,ownerId=''}={}){
 return `<section class="premium-recap card" aria-labelledby="premium-recap-title" data-premium-recap>
 <header><span class="eyebrow">${welcome?'BIENVENUE EN PREMIUM':'VOS POSSIBILITÉS AVEC PISTE'}</span><h2 id="premium-recap-title">${welcome?'Votre accès Premium est actif.':'Le terrain en direct. La progression en plus.'}</h2><p>Voici les outils à retrouver dans votre application.</p></header>
 <article class="premium-recap-live"><span class="badge cyan">LIVE · OPS & COACHING</span><h3>Suivez la piste ensemble, en direct</h3><p>Partagez votre progression sur la carte avec vos amis autorisés. Retrouvez leurs diffusions depuis l’onglet Live ; un badge signale les pistes disponibles.</p><p>À la fin de la diffusion, le suivi indique « Live terminé ». Les modes aveugles conservent leurs règles de visibilité.</p><a class="button button-gold" href="/live">Découvrir le Live</a><small>Premium actif requis pour diffuser et regarder. Accès limité aux amis autorisés.</small></article>
 <div class="premium-recap-grid"><article><span class="eyebrow">PRÉPARER · PREMIUM</span><h3>Tracés intelligents</h3><p>Préparez des parcours avec suivi des routes et chemins, et explorez des propositions selon votre entraînement.</p><a class="button button-dark" href="/track-builder?tool=smart">Préparer une piste</a></article>
 <article><span class="eyebrow">PROGRESSER · PREMIUM</span><h3>JUMOLF</h3><p>Croisez vos séances OPS et Coaching, consultez les tendances et préparez des entraînements adaptés à votre chien.</p><a class="button button-dark" href="/jumolf">Découvrir JUMOLF</a><small>Activation et consentements à choisir dans JUMOLF. La participation scientifique reste un choix séparé.</small></article></div>
 <p>Vos séances, cartes, relectures et bilans restent accessibles dans Mes pistes.</p><a class="profile-text-link" href="/tracks">Retrouver mes pistes →</a>
 ${welcome?`<footer><button type="button" class="button button-gold" data-premium-dismiss data-premium-owner="${e(ownerId)}">C’est compris</button><small>Retrouvez ce récapitulatif dans Profil → Premium & JUMOLF.</small></footer>`:''}
 </section>`;
}
