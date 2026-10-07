import { resolveScientificRoute } from './scientific-routes.mjs';
import { renderScientificCorpusDogScreen, renderScientificCorpusScreen } from './scientific-corpus-screen.mjs';

const allowedFilters=new Set(['type','environment','trackAgeBand','weatherBand','quality','category']);
const clone=value=>structuredClone(value);
const formValues=form=>{
 if(form?.values)return {...form.values};
 const data=new FormData(form);return Object.fromEntries(data.entries());
};

export function createScientificCorpusController({access,corpusService,navigate=()=>{},render=()=>{}}={}){
 if(!corpusService)throw new TypeError('Service corpus pseudonymisé requis.');
 let currentAccess=access,currentService=corpusService;
 let cohorts=[],comparison=null;
 const screen=path=>{
  const url=new URL(path,'https://local.invalid'),route=resolveScientificRoute(url.pathname);
  if(!currentAccess?.authorized||!['corpus','corpus-dog'].includes(route?.type))return '';
  const filters={};for(const key of allowedFilters)if(url.searchParams.has(key)&&url.searchParams.get(key)!=='all')filters[key]=url.searchParams.get(key);
  if(route.type==='corpus-dog')return renderScientificCorpusDogScreen({dogId:route.id,corpusView:currentService.view({...filters,dogId:route.id})});
  const corpusView=currentService.view(filters);
  return renderScientificCorpusScreen({access:clone(currentAccess),summary:currentService.summary(),categories:currentService.categories?.()||{},corpusView,filters,cohorts:clone(cohorts),comparison:clone(comparison)});
 };
 const handleSubmit=event=>{
  const form=event.target?.closest?.('[data-scientific-corpus-form]');if(!form)return false;
  event.preventDefault?.();const values=formValues(form),kind=form.dataset.scientificCorpusForm;
  if(currentAccess?.readOnly)return true;
  try{
   if(kind==='filters'){
    const params=new URLSearchParams();for(const key of allowedFilters)if(values[key]&&values[key]!=='all')params.set(key,values[key]);navigate(`/scientific/corpus${params.size?`?${params}`:''}`);render();
   }else if(kind==='cohort'){
    let criteria={};try{criteria=JSON.parse(values.criteria||'{}');}catch{}
    for(const key of Object.keys(criteria))if(!allowedFilters.has(key))delete criteria[key];
    const cohort={id:`contribution-cohort-${String(cohorts.length+1).padStart(3,'0')}`,name:String(values.name||'Cohorte sans nom').trim(),criteria,analysis:currentService.cohort(criteria),createdAt:new Date().toISOString(),synthetic:true};
    if(cohort.name)cohorts=[...cohorts,cohort];render();
   }else if(kind==='compare-cohorts'){
    const first=cohorts.find(item=>item.id===values.first),second=cohorts.find(item=>item.id===values.second);
    comparison=first&&second?currentService.compare(first.analysis,second.analysis):null;render();
   }else if(kind==='rename-cohort'){
    cohorts=cohorts.map(cohort=>cohort.id===values.cohortId?{...cohort,name:String(values.name||cohort.name).trim()}:cohort);render();
   }else return false;
  }catch{return true;}
  return true;
 };
 const handleClick=event=>{
  const node=event.target?.closest?.('[data-scientific-corpus-action]');if(!node)return false;
  if(currentAccess?.readOnly)return true;
  if(node.dataset.scientificCorpusAction==='delete-cohort')cohorts=cohorts.filter(cohort=>cohort.id!==node.dataset.cohortId);
  else if(node.dataset.scientificCorpusAction==='duplicate-cohort'){
   const cohort=cohorts.find(row=>row.id===node.dataset.cohortId);if(cohort)cohorts=[...cohorts,{...clone(cohort),id:`contribution-cohort-${String(cohorts.length+1).padStart(3,'0')}`,name:`${cohort.name} · copie`,createdAt:new Date().toISOString()}];
  }else return false;
  render();return true;
 };
 return {screen,handleClick,handleChange:()=>false,handleSubmit,authorized:()=>Boolean(currentAccess?.authorized),readOnly:()=>Boolean(currentAccess?.readOnly),setContext({access:nextAccess,corpusService:nextService}={}){if(nextAccess)currentAccess=nextAccess;if(nextService)currentService=nextService;},snapshot:()=>({cohortCount:cohorts.length})};
}
