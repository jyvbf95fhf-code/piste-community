import {detectJumolfPatterns} from './jumolf-pattern-detector.mjs';
import {buildJumolfRecommendation} from './jumolf-recommendations.mjs';
export function buildJumolfDiscoveries(sessions=[]){return detectJumolfPatterns(sessions).map((item,index)=>({...item,rank:index+1,recommendation_detail:buildJumolfRecommendation(item)}));}
export function getJumolfPriorityDiscoveries(discoveries=[],limit=3){return discoveries.filter(item=>item.priority!=='Données insuffisantes').slice(0,limit);}
const median=values=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:null;};
export function buildJumolfTemporalLearning(sessions=[],{metric='resumptionDelaySeconds',windowSize=30}={}){
 const rows=sessions.filter(item=>item?.synthetic===true).slice().sort((a,b)=>String(a.startedAt).localeCompare(String(b.startedAt))),early=rows.slice(0,windowSize).map(item=>item[metric]).filter(Number.isFinite),recent=rows.slice(-windowSize).map(item=>item[metric]).filter(Number.isFinite);
 if(early.length<8||recent.length<8)return {metric,before:null,after:null,status:'Données insuffisantes',sample_before:early.length,sample_after:recent.length,period_start:rows[0]?.startedAt||null,period_end:rows.at(-1)?.startedAt||null};
 const before=median(early),after=median(recent),delta=after-before;
 return {metric,before,after,delta,status:delta<=-10?'Tendance en amélioration':delta>=10?'Tendance dégradée':'Tendance stable',sample_before:early.length,sample_after:recent.length,period_start:rows[0].startedAt,period_end:rows.at(-1).startedAt,synthetic:true};
}
