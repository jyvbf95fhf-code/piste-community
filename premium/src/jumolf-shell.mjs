import {premiumFeatureBadge} from './premium-feature-catalog.mjs';
import {RexDemoEntry} from './jumolf-rex-screen.mjs';
import {escapeHTML as e} from './components.mjs';
import {Icon} from './icons.mjs';
import {jumolfV3Link} from './jumolf-v3-screen.mjs';
const nav=[['/jumolf','home','Accueil'],['/jumolf/prepare','route','Préparer'],['/jumolf/train','route','S’entraîner'],['/jumolf/analyze','twin','Analyser'],['/jumolf/progress','chart','Progresser']];
function activeSection(route){
 if(route==='/jumolf/prepare'||route==='/jumolf/learn'||route.startsWith('/jumolf/learn/'))return '/jumolf/prepare';
 if(['/jumolf/rex','/jumolf/onboarding'].includes(route))return '/jumolf';
 if(['/jumolf/train','/jumolf/exercises'].includes(route)||/^\/jumolf\/(targeted|verification)/.test(route))return '/jumolf/train';
 if(route==='/jumolf/progress'||route==='/jumolf/team'||route.startsWith('/jumolf/dog/'))return '/jumolf/progress';
 if(['/jumolf/analyze','/jumolf/compare','/jumolf/compare/demo','/jumolf/dataset','/jumolf/discoveries','/jumolf/journal'].includes(route)||/^\/jumolf\/(session|discovery)/.test(route))return '/jumolf/analyze';
 return '/jumolf';
}
export function JumolfShell(route,content,{realMode=false,dogId='',journey='discovery'}={}){
 const query=new URLSearchParams(route.split('?')[1]||'');route=route.split('?')[0];
 const rex=route==='/jumolf/rex',demo=rex||route==='/jumolf/dataset'||route==='/jumolf/compare/demo'||query.get('demo')==='1',context={dogId,journey},advanced=route==='/jumolf/dashboard';
 return `<div class="jumolf-shell jumolf-v3-shell" ${rex?'data-rex-shell':''} data-jumolf-data="${realMode&&!demo?'account':'demo'}"><header class="jumolf-header"><div><a class="v3-return" href="/">← PISTE Community</a><a class="jumolf-brand" href="${e(jumolfV3Link('/jumolf',context))}" aria-label="JUMOLF, accueil"><span class="jumolf-mark" aria-hidden="true">${Icon('twin')}</span><span><strong>JUMOLF</strong>${premiumFeatureBadge('jumolf')}<small>L’INTELLIGENCE DU BINÔME</small></span></a></div><span class="jumolf-header-state">${demo?'DÉMONSTRATION · FICTIF':realMode?'VOTRE ESPACE · DONNÉES AUTORISÉES':'DÉMONSTRATION · DONNÉES FICTIVES'}</span></header>
 <nav class="jumolf-subnav v3-nav" aria-label="Navigation JUMOLF">${nav.map(([path,icon,label])=>`<a href="${e(jumolfV3Link(path,context))}" ${activeSection(route)===path&&!advanced?'aria-current="page"':''}><span aria-hidden="true">${Icon(icon)}</span><span>${e(label)}</span></a>`).join('')}</nav>
 ${['/jumolf','/jumolf/dashboard'].includes(route)&&!content.includes('data-jumolf-v3-home')?RexDemoEntry():''}${content}
 <details class="jumolf-panel v3-tools"><summary>Outils avancés</summary><nav aria-label="Tous les outils JUMOLF"><a href="${e(jumolfV3Link('/jumolf/dashboard?view=advanced',context))}">Tableau complet et historique</a><a href="${e(jumolfV3Link('/jumolf/compare',context))}">Comparer des séances</a>${dogId?`<a href="/jumolf/dog/${encodeURIComponent(dogId)}">Profil scientifique du chien</a>`:''}<a href="/scientific">Espace Science · selon vos droits</a><a href="/jumolf/settings">Consentements et réglages</a></nav><details><summary>Démonstrations · données fictives</summary><nav><a href="/jumolf/rex">Découvrir JUMOLF avec Rex</a><a href="/jumolf/session/demo-nox-search?demo=1">Analyse fictive détaillée</a><a href="/jumolf/compare/demo">Comparaison fictive</a><a href="/jumolf/dataset?demo=1">Dataset synthétique et profils</a></nav></details></details>
 <footer class="jumolf-footnote">${rex?'Rex : données fictives, sans enregistrement dans votre compte.':'Mesures, estimations et hypothèses restent distinctes. Les analyses JUMOLF restent en mémoire pendant cette visite.'}</footer></div>`;
}
