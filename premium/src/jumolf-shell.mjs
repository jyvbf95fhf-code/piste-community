import {escapeHTML} from './components.mjs';
import {Icon} from './icons.mjs';
const e=escapeHTML;
const nav=[['/jumolf','Mon chien'],['/jumolf/compare','Comparer'],['/jumolf/settings','Réglages']];
export function JumolfShell(route,content,{realMode=false}={}){
 return `<div class="jumolf-shell" data-jumolf-data="${realMode?'account':'demo'}"><header class="jumolf-header"><a class="jumolf-brand" href="/jumolf" aria-label="JUMOLF, entrée du jumeau olfactif"><span class="jumolf-mark" aria-hidden="true">${Icon('twin')}</span><span><strong>JUMOLF</strong><small>JUMEAU OLFACTIF · MOTEUR D’ANALYSE</small></span></a><span class="jumolf-header-state"><i></i> ${realMode?'DOSSIERS RÉELS · LOCAL':'MODE LOCAL · MOCK'}</span></header><nav class="jumolf-subnav" aria-label="Navigation JUMOLF">${(realMode?[nav[0],['/jumolf/exercises','Exercices'],['/jumolf/progress','Progression'],...nav.slice(1)]:nav).map(([href,label])=>`<a href="${href}" ${route===href||(href==='/jumolf'&&route==='/jumolf/dashboard')?'aria-current="page"':''}>${e(label)}</a>`).join('')}</nav>${content}<footer class="jumolf-footnote">Analyse exploratoire · les estimations restent distinctes des mesures.</footer></div>`;
}
