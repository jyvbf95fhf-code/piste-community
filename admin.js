// V10.44: presentation only. Every privileged request is authorized again by PostgreSQL.
export const ADMIN_TABS=Object.freeze({dashboard:'Tableau de bord',users:'Utilisateurs',activity:'Activité',statistics:'Statistiques',feedback:'Retours'});
export const FEEDBACK_STATUSES=Object.freeze({new:'Nouveau',read:'Lu',todo:'À traiter',done:'Traité'});
const TYPES={ops:'OPS',training:'Entraînement',coaching:'Coaching',account:'Compte',feedback:'Retour'};
const ACCOUNT={confirmed:'Confirmé',pending:'À confirmer',suspended:'Suspendu'};
export const adminEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=adminEscape;
const number=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value).toLocaleString('fr-FR',{maximumFractionDigits:2}):'—';
const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'}):'Aucune activité connue';
const name=user=>user.display_name||'Utilisateur sans pseudo';
const badge=(text,kind='')=>`<span class="admin-badge ${e(kind)}">${e(text)}</span>`;
const empty=text=>`<p class="admin-empty">${e(text)}</p>`;
const profileButton=user=>`<button class="secondary" type="button" data-admin-user="${e(user.user_id)}">Voir le profil admin</button>`;
const stat=(label,value)=>`<div class="admin-kpi"><strong>${number(value)}</strong><span>${e(label)}</span></div>`;
const section=(title,body)=>`<section class="admin-card"><h3>${e(title)}</h3>${body}</section>`;
export function adminUserCards(items=[]){return items.length?items.map(u=>`<article class="admin-row"><div><h4>${e(name(u))}</h4><p>Inscrit le ${e(date(u.created_at))}</p><p>Activité : ${e(date(u.last_activity))}</p>${badge(ACCOUNT[u.account_status]||'Compte')} ${badge(`${number(u.sessions_count)} pistes`)}</div>${profileButton(u)}</article>`).join(''):empty('Aucun utilisateur pour ces critères.');}
export function adminEvents(items=[]){return items.length?`<ol class="admin-timeline">${items.map(item=>`<li><time>${e(date(item.occurred_at))}</time><h4>${e(item.title)}</h4><p>${e(item.display_name||'Utilisateur sans pseudo')} · ${e(TYPES[item.kind]||item.kind)}</p>${profileButton(item)}</li>`).join('')}</ol>`:empty('Aucun événement enregistré sur cette période.');}
export function adminFeedbackCards(items=[],expanded=false){return items.length?items.map(f=>`<article class="admin-row admin-feedback"><div>${badge(FEEDBACK_STATUSES[f.status]||'Statut inconnu',f.status)}<h4>${e(f.subject)}</h4><p>${e(f.display_name||'Utilisateur sans pseudo')} · ${e(date(f.created_at))}</p></div>${expanded?`<details><summary>Ouvrir le retour</summary><p class="admin-message">${e(f.message)}</p>${f.context?`<p>Contexte : ${e(f.context)}</p>`:''}<label>Statut<select data-feedback-status="${e(f.id)}" data-revision="${e(f.revision)}">${Object.entries(FEEDBACK_STATUSES).map(([key,label])=>`<option value="${key}"${key===f.status?' selected':''}>${label}</option>`).join('')}</select></label><button class="primary" type="button" data-feedback-save="${e(f.id)}">Mettre à jour le statut</button>${profileButton(f)}</details>`:''}</article>`).join(''):empty('Aucun retour pour ces critères.');}
export function renderAdmin(sectionName,data={}){
 const k=data.kpis||{};
 if(sectionName==='dashboard'||sectionName==='statistics'){
  let html=`<div class="admin-kpis">${stat('Utilisateurs',k.users_total)}${stat('Nouveaux · 7 jours',k.new_7)}${stat('Nouveaux · 30 jours',k.new_30)}${stat('Actifs · 30 jours',k.active_30)}${stat('Pistes enregistrées',k.sessions_total)}${stat('Retours nouveaux',k.feedback_new)}</div>`;
  html+=section('Répartition des pistes',`<div class="admin-kpis">${stat('OPS',k.ops)}${stat('Entraînement',k.training)}${stat('Coaching',k.coaching)}</div>`);
  if(sectionName==='dashboard')return html+section('Nouveaux utilisateurs',adminUserCards(data.new_users))+section('Activité récente',adminEvents(data.events))+section('Derniers retours / idées',adminFeedbackCards(data.feedback))+`<p class="admin-note">Actualisé le ${e(date(data.generated_at))}. Les pistes sont comptées par créateur.</p>`;
  return html+section('Activité mesurée',`<div class="admin-kpis">${stat('Actifs · 7 jours',k.active_7)}${stat('Coaching terminés',k.coaching_ended)}${stat('Distance déclarée OPS + entraînement · km',k.distance_km)}</div><p class="admin-note">Distance issue de ${number(k.distance_records)} valeurs stockées, sans recalcul GPS. Coaching exclu : aucune distance consolidée fiable. Les clôtures ne sont comptabilisées que pour Coaching.</p>`)+section('Évolution par période',`<div class="admin-periods">${(data.periods||[]).map(p=>`<article><h4>${number(p.days)} jours</h4><p>${number(p.new_users)} nouveaux comptes</p><p>${number(p.active_users)} actifs</p><p>${number(p.sessions)} pistes créées</p></article>`).join('')}</div>`)+section('Définition des indicateurs','<p class="admin-note">Actif : dernière connexion Auth connue, création d’une piste OPS, d’un entraînement ou d’une session Coaching, ou envoi d’un retour durant la période. Ce n’est pas une mesure de présence en ligne. Les archives sont incluses ; les données supprimées ne sont pas reconstituées.</p>');
 }
 if(sectionName==='users')return adminUserCards(data.items);
 if(sectionName==='activity')return adminEvents(data.items);
 if(sectionName==='feedback')return adminFeedbackCards(data.items,true);
 if(sectionName==='profile'){
  const u=data.user||{};
  return `<button class="secondary" type="button" data-admin-back-users>‹ Utilisateurs</button>`+section(name(u),`<p class="admin-note">${e(u.user_id)}</p>${badge(ACCOUNT[u.account_status]||'Compte')}<p>Inscription : ${e(date(u.created_at))}</p><p>Dernière activité : ${e(date(u.last_activity))}</p><p>Dernière piste créée : ${e(date(u.latest_session_at))}</p><div class="admin-kpis">${stat('Pistes créées',u.sessions_count)}${stat('OPS',u.ops_count)}${stat('Entraînement',u.training_count)}${stat('Coaching',u.coaching_count)}${stat('Distance déclarée OPS + entraînement · km',u.distance_km)}${stat('Retours',u.feedback_count)}</div>`)+section('Dernières pistes',data.sessions?.length?data.sessions.map(s=>`<div class="admin-row"><span>${e(TYPES[s.kind]||s.kind)}</span><time>${e(date(s.created_at))}</time>${badge(s.kind==='coaching'?(s.status==='ended'?'Terminé':s.status==='live'?'En cours':s.status):'Enregistrée')}</div>`).join(''):empty('Aucune piste enregistrée.'))+section('Retours de cet utilisateur',adminFeedbackCards((data.feedback||[]).map(f=>({...f,display_name:u.display_name})),true))+section('Activité récente',adminEvents((data.events||[]).map(item=>({...item,display_name:u.display_name}))))+`<p class="admin-note">Les 20 éléments les plus récents de chaque rubrique. Aucune trace GPS ni contribution de débrief privée n’est chargée.</p>`;
 }
 return empty('Rubrique indisponible.');
}
const FILTERS={users:{all:'Tous',active:'Actifs',inactive:'Inactifs',new:'Nouveaux inscrits',feedback:'Avec retour',recent_session:'Piste récente',ops:'Usage OPS dominant',training:'Usage entraînement dominant',coaching:'Usage Coaching dominant'},activity:{all:'Tous',account:'Comptes',ops:'OPS',training:'Entraînement',coaching:'Coaching',feedback:'Retours'},feedback:{all:'Tous',...FEEDBACK_STATUSES}};
export function createAdminCentre({client,getUserId,navigate,document:doc=globalThis.document,crypto:cryptoApi=globalThis.crypto}){
 const $=id=>doc.getElementById(id);
 let authorized=false,identity=null,generation=0,sequence=0,current='dashboard',offset=0,userId=null,opened=false,saving=false,feedbackRequest=null,feedbackBusy=false;
 const message=text=>{$('adminMessage').textContent=text;};
 function clear(){generation++;sequence++;authorized=false;identity=null;opened=false;$('openAdminCentre').hidden=true;$('adminContent').innerHTML='';$('adminPager').innerHTML='';message('');$('adminPage').classList.remove('active');$('adminSearch').value='';}
 function reset(){clear();feedbackRequest=null;feedbackBusy=false;$('ideaForm').reset();$('ideaSubmit').disabled=false;$('ideaMessage').textContent='';}
 async function refreshAccess(){
  const uid=getUserId(),stamp=generation;
  $('openAdminCentre').hidden=true;
  if(!uid){clear();return false;}
  try{const {data,error}=await client.rpc('piste_admin_access_v1044');if(stamp!==generation||uid!==getUserId())return false;authorized=!error&&data===true;identity=authorized?uid:null;$('openAdminCentre').hidden=!authorized;return authorized;}catch{if(stamp===generation&&uid===getUserId()){authorized=false;identity=null;$('openAdminCentre').hidden=true;}return false;}
 }
 function toolbar(){
  $('adminTabs').innerHTML=Object.entries(ADMIN_TABS).map(([key,label])=>`<button type="button" data-admin-tab="${key}" aria-pressed="${current===key}">${label}</button>`).join('');
  const filters=FILTERS[current];$('adminControls').hidden=!filters;
  $('adminFilter').innerHTML=Object.entries(filters||{}).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
  $('adminSearchLabel').hidden=current==='activity';$('adminSortLabel').hidden=current!=='users';$('adminPeriodLabel').hidden=current==='feedback';
 }
 async function load(){
  if(!opened||!authorized||identity!==getUserId())return;
  const request=++sequence,stamp=generation,uid=getUserId();
  $('adminContent').innerHTML='';$('adminPager').innerHTML='';$('adminContent').setAttribute('aria-busy','true');message('Chargement…');
  const args={p_section:current,p_search:current==='users'||current==='feedback'?$('adminSearch').value.trim():'',p_filter:FILTERS[current]?$('adminFilter').value:'all',p_period:Number($('adminPeriod').value)||30,p_offset:offset,p_user_id:userId,p_sort:current==='users'?$('adminSort').value:'recent'};
  try{
   const {data,error}=await client.rpc('piste_admin_query_v1044',args);
   if(request!==sequence||stamp!==generation||uid!==getUserId()||!opened)return;
   if(error)throw error;
   $('adminContent').innerHTML=renderAdmin(current,data||{});
   const total=Number(data?.total)||0;
   if(FILTERS[current])$('adminPager').innerHTML=`<span>${number(total)} résultat${total>1?'s':''}</span><button class="secondary" type="button" data-admin-page="-1" ${offset===0?'disabled':''}>Précédent</button><button class="secondary" type="button" data-admin-page="1" ${offset+50>=total?'disabled':''}>Suivant</button>`;
   message(total||!FILTERS[current]?'':'Aucun résultat.');
  }catch(error){
   if(request!==sequence||stamp!==generation||uid!==getUserId()||!opened)return;
   if(error.code==='42501'||error.code==='PGRST301'){clear();navigate('profilePage');$('adminAccessMessage').textContent='Accès Admin refusé.';}
   else message('Chargement indisponible. Réessayez avec Actualiser.');
  }finally{if(request===sequence)$('adminContent').setAttribute('aria-busy','false');}
 }
 async function open(){
  leave();const stamp=generation,opening=sequence;
  if(!await refreshAccess()){if(stamp===generation&&opening===sequence){navigate('profilePage');$('adminAccessMessage').textContent='Accès Admin indisponible ou non autorisé.';}return;}
  if(stamp!==generation||opening!==sequence)return;
  opened=true;current='dashboard';offset=0;userId=null;$('adminSearch').value='';toolbar();navigate('adminPage',true);await load();
 }
 function leave(){opened=false;sequence++;$('adminContent').innerHTML='';$('adminPager').innerHTML='';}
 async function select(tab){if(!ADMIN_TABS[tab])return;current=tab;offset=0;userId=null;$('adminSearch').value='';toolbar();await load();}
 async function profile(id){current='profile';userId=id;offset=0;toolbar();await load();}
 async function changeStatus(id,button){
  if(saving||!opened||!authorized)return;
  const field=Array.from($('adminContent').querySelectorAll('[data-feedback-status]')).find(el=>el.dataset.feedbackStatus===id);if(!field)return;
  const stamp=generation,uid=getUserId(),request=sequence;
  saving=true;button.disabled=true;message('Enregistrement du statut…');
  try{const {error}=await client.rpc('piste_admin_feedback_status_v1044',{p_id:id,p_status:field.value,p_revision:Number(field.dataset.revision)});if(error)throw error;if(stamp===generation&&uid===getUserId()&&opened&&request===sequence)await load();}
  catch(error){if(stamp===generation&&uid===getUserId()&&opened){if(error.code==='42501'){clear();navigate('profilePage');$('adminAccessMessage').textContent='Accès Admin refusé.';}else{if(error.code==='40001'&&request===sequence)await load();message(error.code==='40001'?'Ce retour a changé. La version actuelle est affichée ; choisissez à nouveau le statut.':'Statut non enregistré. Réessayez.');}}}
  finally{saving=false;button.disabled=false;}
 }
 function openIdea(){if(!getUserId())return;$('ideaMessage').textContent='';navigate('ideaPage');}
 async function submitIdea(event){
  event.preventDefault();if(feedbackBusy||!getUserId()||!$('ideaForm').reportValidity())return;
  const uid=getUserId(),stamp=generation,payload={p_subject:$('ideaSubject').value.trim(),p_message:$('ideaText').value.trim(),p_context:$('ideaContext').value};
  if(!payload.p_subject||!payload.p_message){$('ideaMessage').textContent='Complétez le sujet et le message.';return;}
  const signature=JSON.stringify(payload);
  if(!feedbackRequest||feedbackRequest.signature!==signature)feedbackRequest={signature,id:cryptoApi.randomUUID()};
  feedbackBusy=true;$('ideaSubmit').disabled=true;$('ideaMessage').textContent='Envoi…';
  try{const {error}=await client.rpc('piste_feedback_submit_v1044',{p_id:feedbackRequest.id,...payload});if(error)throw error;if(stamp!==generation||uid!==getUserId())return;$('ideaForm').reset();feedbackRequest=null;$('ideaMessage').textContent='Merci, votre retour a été envoyé.';}
  catch(error){if(stamp===generation&&uid===getUserId())$('ideaMessage').textContent=error.code==='54000'?'Limite de 5 retours par heure atteinte. Votre texte est conservé.':'Envoi indisponible. Votre texte est conservé ; vous pouvez réessayer.';}
  finally{if(stamp===generation){feedbackBusy=false;$('ideaSubmit').disabled=false;}}
 }
 $('openAdminCentre').addEventListener('click',open);$('openIdeaForm').addEventListener('click',openIdea);$('ideaForm').addEventListener('submit',submitIdea);
 $('adminTabs').addEventListener('click',event=>{const button=event.target.closest('[data-admin-tab]');if(button)void select(button.dataset.adminTab);});
 $('adminControls').addEventListener('submit',event=>{event.preventDefault();offset=0;void load();});
 for(const id of ['adminFilter','adminSort','adminPeriod'])$(id).addEventListener('change',()=>{offset=0;void load();});
 $('adminRefresh').addEventListener('click',()=>{void load();});
 $('adminContent').addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;if(target.dataset.adminUser)void profile(target.dataset.adminUser);if(target.hasAttribute('data-admin-back-users'))void select('users');if(target.dataset.feedbackSave)void changeStatus(target.dataset.feedbackSave,target);});
 $('adminPager').addEventListener('click',event=>{const target=event.target.closest('[data-admin-page]');if(target&&!target.disabled){offset=Math.max(0,offset+Number(target.dataset.adminPage)*50);void load();}});
 return{open,leave,reset,refreshAccess};
}
