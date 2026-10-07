const statuses={exploring:'À explorer',in_progress:'En cours',signal_observed:'Signal observé',not_confirmed:'Non confirmé',synthetic_confirmed:'Confirmé dans dataset synthétique',abandoned:'Abandonné'};
export function createResearchHypothesis(input={}){
 const title=String(input.title||'Hypothèse sans titre').trim(),id=input.id||`H-${title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'001'}`;
 const status=statuses[input.status]||statuses.exploring;
 return{id,title,description:String(input.description||''),status,criteria:structuredClone(input.criteria||{}),cohortIds:structuredClone(input.cohortIds||[]),observations:structuredClone(input.observations||[]),currentResult:String(input.currentResult||'À confirmer'),confidence:input.confidence??null,limitations:String(input.limitations||'Données synthétiques uniquement; pas une validation scientifique.'),synthetic:true};
}
export function cohortCriteriaFromHypothesis(hypothesis){return structuredClone(hypothesis?.criteria||{});}
export function saveResearchHypothesis(store,input){return store.appendHypothesis(createResearchHypothesis(input));}
export {statuses as scientificHypothesisStatuses};
