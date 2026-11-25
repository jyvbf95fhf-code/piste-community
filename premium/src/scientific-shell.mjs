import {escapeHTML} from './components.mjs';
import {Icon} from './icons.mjs';
import {scientificAccessFor,scientificCorpusAccessFor} from './scientific-access.mjs';

const links=[
 ['/scientific','Accueil'],
 ['/scientific/sessions','Sessions'],
 ['/scientific/cohorts','Cohortes'],
 ['/scientific/corpus','Corpus']
];
export function ScientificShell(route,content,actor,{realMode=false}={}){
 const access=route==='/scientific/corpus'?scientificCorpusAccessFor(actor):scientificAccessFor(actor);
 if(!access.authorized)return`<section class="scientific-gate"><span class="scientific-eyebrow">ACCÈS RESTREINT</span><h1>Espace scientifique privé</h1><p>Accès restreint aux membres autorisés.</p><p>${realMode?'Les dossiers réels restent privés. Aucun droit supplémentaire n’est accordé par ce raccordement.':'Les analyses présentées dans cet espace sont locales et en mode démonstration.'}</p><a href="/">Retour à l’accueil</a></section>`;
 const selected=route.startsWith('/scientific/session/')?'/scientific/sessions':route.startsWith('/scientific/cohort/')?'/scientific/cohorts':route;
 return `<div class="scientific-shell" data-scientific-member="${escapeHTML(access.memberId)}">
  <header class="scientific-header">
   <a href="/scientific" class="scientific-brand">${Icon('science')}<strong>Laboratoire JUMOLF</strong></a>
   ${route==='/scientific/corpus'?'':`<span class="scientific-source-label">${realMode?'Dossiers du compte':'Données synthétiques'}</span>`}
  </header>
  <nav class="scientific-nav" aria-label="Navigation scientifique">${links.map(([href,label])=>`<a href="${href}" ${selected===href?'aria-current="page"':''}>${label}</a>`).join('')}</nav>
  ${content}
  ${realMode?`<details class="scientific-storage-note"><summary>Stockage de vos travaux</summary><p>Vos cohortes, annotations et analyses sont conservées sur cet appareil uniquement, pour ce compte.</p></details>`:''}
 </div>`;
}
