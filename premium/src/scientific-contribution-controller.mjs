import { resolveScientificContributionRoute } from './scientific-contribution-routes.mjs';
import { renderScientificContributionScreen } from './scientific-contribution-screen.mjs';

export function createScientificContributionController({store,fixtures={sessions:[]},actor,navigate=()=>{},render=()=>{},confirm=()=>false}={}){
 if(!store)throw new TypeError('Store de consentement requis.');
 const eligibility=()=>fixtures.sessions.filter(session=>session.contributorKey===actor?.contributorKey).map(session=>({sessionId:session.sourceKey,type:session.type,state:store.sessionInclusionState(session.sourceKey)}));
 const screen=path=>{const route=resolveScientificContributionRoute(path);return route?renderScientificContributionScreen(route,{consent:store.snapshot(),history:store.history(),eligibility:eligibility(),actor}):'';};
 const handleClick=event=>{
  const node=event.target?.closest?.('[data-scientific-contribution-action]');if(!node)return false;
  const action=node.dataset.scientificContributionAction;
  try{
   if(action==='participate')store.setParticipation(actor,true);
   else if(action==='decline')store.setParticipation(actor,false);
   else if(action==='withdraw'){
    if(!confirm('Retirer votre participation ? Les contributions futures et les nouvelles projections seront arrêtées. Les analyses locales déjà produites pourront conserver leur trace historique, marquée comme révoquée.'))return true;
    store.withdraw(actor);
   }else if(action==='show-data'){navigate('/profile/research/data');return true;}
   else if(action==='show-settings'){navigate('/profile/research');return true;}
   else if(action==='toggle-session')store.setSessionInclusion(actor,node.dataset.sessionId,node.dataset.nextState);
   else return false;
   render();return true;
  }catch(error){node.dataset.error=error.message;return true;}
 };
 const handleChange=event=>{
  const field=event.target;if(!field?.matches?.('[data-scientific-category]'))return false;
  const category=field.dataset.scientificCategory;
  try{if(category.startsWith('ops:'))store.setOpsCategory(actor,category.slice(4),field.checked);else store.setCategory(actor,category,field.checked);render();}
  catch(error){field.checked=!field.checked;field.setAttribute('aria-invalid','true');field.title=error.message;}
  return true;
 };
 return {screen,handleClick,handleChange,handleSubmit:()=>false};
}
