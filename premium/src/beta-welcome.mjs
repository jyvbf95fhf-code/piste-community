import {escapeHTML as e} from './components.mjs';
export const BETA_WELCOME_VERSION='terrain-1';
export function BetaNotice(){return '<aside class="beta-notice" data-beta-notice aria-label="Information bêta"><strong>Bêta terrain</strong><p>Vous testez une version en cours d’amélioration. Des erreurs ou interruptions peuvent survenir. Vos retours nous aident à fiabiliser PISTE Community.</p></aside>';}
const features=[
 ['Mes chiens','Créez le profil de vos chiens et choisissez votre binôme pour chaque séance.'],
 ['Créateur de tracé','Dessinez une piste, suivez les routes et chemins ou importez un GPX. Les propositions intelligentes sont réservées à Premium.'],
 ['Pistage OPS','Enregistrez votre piste GPS, ajoutez vos observations, faites une pause puis terminez votre dossier opérationnel.'],
 ['Coaching','Préparez un entraînement avec Conducteur, Traceur, Coach ou Observateur, en mode Normal, Simple aveugle ou Double aveugle.'],
 ['Live','Partagez une séance avec vos observateurs autorisés. Les accès et les modes aveugles limitent les informations visibles.'],
 ['Mes pistes et bilans','Retrouvez vos tracés et séances, consultez les bilans et replays, puis exportez les données disponibles.'],
 ['Communauté et notifications','Ajoutez vos contacts, gérez les autorisations et retrouvez vos invitations et notifications.'],
 ['JUMOLF et progression','Avec Premium et après activation, explorez vos séances et des pistes de travail adaptées aux données disponibles. Les indications restent à confronter au terrain.'],
 ['Science','Cet espace nécessite une autorisation distincte. La participation à la recherche dépend de vos choix de contribution.']
];
export function BetaGuide({page=false,ownerId=null}={}){const tag=page?'h1':'h2';return `${page?'<a class="back-link" href="/profile">← Profil</a>'+BetaNotice():''}<section class="beta-guide card" data-beta-guide><span class="eyebrow">VOS PREMIERS PAS</span><${tag}>Découvrir PISTE Community</${tag}><p>Un binôme, une piste, puis un bilan pour progresser. Voici les fonctions que vous pourrez explorer selon vos accès.</p><ul class="beta-feature-grid">${features.map(([title,text])=>`<li><h3>${e(title)}</h3><p>${e(text)}</p></li>`).join('')}</ul><section class="beta-field-check"><h3>Avant votre première sortie</h3><ol><li>Ajoutez votre chien et commencez par une courte séance d’essai.</li><li>Autorisez la localisation quand vous démarrez le GPS. Après une interruption ou un verrouillage, vérifiez l’enregistrement et reprenez explicitement le GPS si demandé.</li><li>Vérifiez la sauvegarde dans Profil → Mon compte en ligne. Sans réseau, les enregistrements conservés localement attendent leur envoi.</li></ol><p>Si un problème survient, notez la version, la page et l’action réalisée ; une capture aide à le reproduire.</p></section><p>Premium inclut JUMOLF ; un code cadeau peut vous être transmis par l’administrateur. Aucun accès supplémentaire n’est activé par cette présentation.</p>${page?'<a class="button button-dark" href="/">Retour à l’accueil</a>':`<button type="button" class="button button-gold" data-beta-dismiss data-beta-owner="${e(ownerId||'')}">J’ai compris, commencer</button><p class="beta-guide-revisit">Retrouvez cette présentation dans Profil → Découvrir l’application.</p>`}</section>`;}
export function createBetaWelcome({storage=null,getOwnerId,version=BETA_WELCOME_VERSION}={}){const seen=new Set(),key=id=>'piste-v2-beta-welcome:'+encodeURIComponent(id);return {
 visible(){const id=getOwnerId();if(!id||seen.has(id))return false;try{return JSON.parse(storage?.getItem(key(id))||'null')?.version!==version;}catch{return true;}},
 dismiss(id){if(!id||getOwnerId()!==id)return false;seen.add(id);try{storage?.setItem(key(id),JSON.stringify({version}));}catch{}return true;}
};}
