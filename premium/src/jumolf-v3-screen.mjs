import {JumolfHistoryHome} from './jumolf-history-home.mjs';
import {escapeHTML as e} from './components.mjs';
import {Icon} from './icons.mjs';
import {DogPhotoMarkup} from './dogs-screen.mjs';
import {RexDemoEntry} from './jumolf-rex-screen.mjs';
import {realLearningMetricLabels} from './jumolf-real-learning.mjs';

export const JUMOLF_JOURNEYS=[['discovery','Découverte'],['coaching','Coaching'],['expert','Expert / Opérationnel']];
// Legacy journey values stay exported for compatibility with stored URLs; new links carry only canine context.
export const jumolfV3Link=(path,{dogId=''}={})=>{const [pathname,search='']=path.split('?'),query=new URLSearchParams(search);query.delete('journey');if(dogId)query.set('dog',dogId);return pathname+(query.size?'?'+query.toString():'');};
const link=(path,label,context,primary=false)=>`<a class="jumolf-button ${primary?'primary':'secondary'}" href="${e(jumolfV3Link(path,context))}">${e(label)}</a>`;
const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'Date indisponible';
const card=(icon,title,body)=>`<section class="jumolf-panel v3-card"><span class="v3-card-icon" aria-hidden="true">${Icon(icon)}</span><h2>${e(title)}</h2>${body}</section>`;
export function JumolfV3DogChooser(dogs,dog,consents,attribute='data-jumolf-dog'){
 if(!consents?.dog_history)return '<p class="v3-empty">Historique du chien désactivé. Vos séances autorisées restent consultables dans Analyser.</p><a class="jumolf-text-link" href="/jumolf/settings">Gérer mes consentements</a>';
 if(!dogs.length)return '<p class="v3-empty">Aucun chien personnel disponible. Retrouvez votre identité canine commune à PISTE Community.</p><a class="jumolf-button secondary" href="/dogs">Mes chiens</a>';
 return `<label class="v3-dog-chooser">Choisir mon chien<select ${attribute} aria-label="Choisir mon chien"><option value="">Choisir un chien</option>${dogs.map(d=>`<option value="${e(d.id)}" ${d.id===dog?.id?'selected':''}>${e(d.name||'Chien')} · ${e(d.breed||d.id)}</option>`).join('')}</select></label>`;
}
export function JumolfV3Home({sources={},state={},dog=null,report=null,viewer={},journey='discovery',realMode=true}={}){
 const context={dogId:dog?.id||'',journey};
 if(!realMode)return `<section class="jumolf-v3" data-jumolf-v3-home><header class="v3-hero"><div><span class="jumolf-eyebrow">DÉMONSTRATION · DONNÉES FICTIVES</span><h1>Un regard nouveau<br>sur votre binôme.</h1><p>Découvrez les possibilités de JUMOLF avec Rex, puis retrouvez vos propres séances depuis votre compte.</p></div><div class="v3-hero-symbol" aria-hidden="true">${Icon('dog')}</div></header>${RexDemoEntry()}<a class="jumolf-button secondary" href="/jumolf/dashboard?view=advanced">Explorer les fonctions avancées de démonstration</a></section>`;
 return JumolfHistoryHome({dog,report,chooser:JumolfV3DogChooser(sources.dogs||[],dog,state.consents),portrait:DogPhotoMarkup(dog||{name:'Mon chien'},'v3-dog-portrait')});
}

export {AcademyScreen as JumolfV3Learn} from './jumolf-academy-screen.mjs';
export function JumolfV3Prepare({dogs=[],dog=null,state={}}={}){
 const context={dogId:dog?.id||''};
 return `<section class="jumolf-v3" data-jumolf-v3-prepare><header class="v3-page-title"><span class="jumolf-eyebrow">DU BINÔME À LA PISTE</span><h1>Préparer la prochaine piste.</h1><p>Choisissez votre chien et votre objectif, puis ajustez la piste sur la carte. Une préparation reste distincte d’une séance réalisée.</p></header><section class="v3-context">${JumolfV3DogChooser(dogs,dog,state.consents)}</section><div class="v3-grid">${card('route','Générateur et Mission Control',`<p>Initiation, Consolidation, Diversification ou Complexité opérationnelle : quatre niveaux pédagogiques ajustables. Préparez les paramètres, comparez les propositions et ajustez le tracé dans Mission Control.</p><a class="jumolf-button primary" href="/track-builder?tool=smart&amp;canine=1${dog?.id?'&amp;dog='+encodeURIComponent(dog.id):''}">Préparer ma piste sur la carte</a><small>Accès Premium existant requis. Niveau choisi par vous, sans certification officielle. Accès et surfaces à vérifier sur place.</small>`)}${card('twin','Un objectif documenté',`<p>Retrouvez les exercices conseillés avec leurs observations justificatives, protocoles et limites. Sans données suffisantes, les propositions restent générales.</p>${link('/jumolf/exercises','Choisir un exercice',context)}`)}${card('dog','Votre chien et votre binôme',`<p>Consultez les profils du chien, du conducteur et du binôme pour préparer vos axes de travail.</p>${link('/jumolf/team','Ouvrir les profils',context)}`)}${card('route','Prêt pour le terrain ?',`<p>Retrouvez Coaching, vos pistes préparées et les outils opérationnels.</p>${link('/jumolf/train','S’entraîner',context)}`)}</div></section>`;
}
export function JumolfV3Train({dogs=[],dog=null,state={}}={}){
 const context={dogId:dog?.id||''};
 return `<section class="jumolf-v3" data-jumolf-v3-train><header class="v3-page-title"><span class="jumolf-eyebrow">DU PLAN AU TERRAIN</span><h1>S’entraîner avec votre chien.</h1><p>Retrouvez votre préparation, lancez votre séance dans Coaching et recueillez les observations utiles au débrief.</p></header><section class="v3-context">${JumolfV3DogChooser(dogs,dog,state.consents)}</section><div class="v3-grid">${card('route','Une séance Coaching','<p>Retrouvez les invitations, les rôles et les modes aveugles de votre séance.</p><a class="jumolf-button primary" href="/coaching/session">Ouvrir Coaching</a>')}${card('route','Vos pistes préparées','<p>Retrouvez vos tracés et vos pistes enregistrées avant de les utiliser sur le terrain.</p><a class="jumolf-button secondary" href="/tracks">Retrouver mes pistes</a>')}${card('route','Préparer ou ajuster une piste',`<p>Générateur à quatre niveaux, paramètres et Mission Control : préparez la suite sur la carte.</p>${link('/jumolf/prepare','Préparer une piste',context)}`)}${card('route','Pistage opérationnel','<p>Retrouvez le cockpit OPS existant et ses contrôles de partage.</p><a class="jumolf-button secondary" href="/operational">Accéder à OPS</a>')}</div><p class="v3-footnote">Une préparation ou un exercice conseillé n’est pas une réalisation. Relisez ensuite les séances disponibles dans Analyser.</p></section>`;
}

