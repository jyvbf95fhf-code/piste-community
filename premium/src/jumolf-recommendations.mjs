export function buildJumolfRecommendation(discovery){if(!discovery?.recommendation||discovery.priority==='Données insuffisantes')return null;return {id:`recommendation-${discovery.id}`,discovery_id:discovery.id,priority:discovery.priority,title:`${discovery.priority} — ${discovery.conditions}`,summary:discovery.recommendation.summary,justification:discovery.observation,synthetic:true};}

// Account recommendations are descriptive rules, never synthetic discoveries.
export function buildAccountJumolfRecommendation({dogId,key,title,objective,evidence=[],protocol,limits=[],personalized=true}={}){
 return {id:`account:${dogId}:${key}`,dogId,key,title,objective,evidence:structuredClone(evidence),protocol:structuredClone(protocol),limits:[...limits],personalized,dataOrigin:'account',synthetic:false,status:'suggested',linkedSessions:[]};
}

import {buildAccountJumolfProtocol} from './jumolf-training-plan.mjs';
import {canineOptions,CANINE_LEVELS,CANINE_SKILLS} from './track-canine.mjs';
// Editorial adaptation of existing Lot B exercises; no predictive model.
export function adaptAccountJumolfRecommendations(recommendations,{level='initiation',skill='',declarations=[],handlerId=null}={}){
 const o=canineOptions({level}),definition=CANINE_LEVELS.find(l=>l.id===o.level);
 const skills={interruptions:'continuity',reference:'angles',regularity:'regularity','track-age':'track-age',conditions:'surfaces',general:'motivation'};
 if(skill&&!CANINE_SKILLS.some(s=>s.id===skill))throw Error('Compétence ciblée indisponible.');
 const relevant=skill?recommendations.filter(r=>skills[r.key]===skill):recommendations;
 const selected=relevant.length?relevant:[buildAccountJumolfRecommendation({dogId:recommendations[0]?.dogId,key:'general',title:'Séance exploratoire générale',objective:'Documenter la compétence choisie sans diagnostic personnalisé.',evidence:[],protocol:recommendations.find(r=>r.key==='general')?.protocol||buildAccountJumolfProtocol('general'),limits:['Aucune observation suffisante ne justifie une personnalisation pour cette priorité.'],personalized:false})];
 return selected.map(rec=>{const target=skill||skills[rec.key]||'motivation';return {...rec,adaptation:{level:o.level,levelLabel:definition.label,handlerId,rule:'editorial-canine-2026-10-20',why:[rec.personalized?`${rec.evidence.length} séance(s) autorisée(s) documentent cet objectif.`:'Historique insuffisant ou personnalisation désactivée : exploration générale.',`Niveau choisi : ${definition.label}. Aucun niveau de maîtrise n’est déduit.`,...(skill?['La compétence prioritaire est votre choix déclaré.']:[]),...declarations.map(d=>'Objectif déclaré pour cette visite : '+d)],sources:rec.evidence.map(e=>({sessionId:e.sessionId,date:e.date,observations:e.observations,context:e.context})),generator:canineOptions({level:o.level,skill:target}),limits:[definition.limits,'Les paramètres restent ajustables après examen du terrain ; aucune performance n’est prédite.']}};});
}
