export function createJumolfLearningStore({clock=()=>new Date().toISOString()}={}){
 let events=[];
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 return Object.freeze({append(event){const record=freeze({...structuredClone(event),id:`jumolf-learning-event-${events.length+1}`,created_at:event.created_at||clock(),synthetic:true});events=[...events,record];return record;},snapshot(){return freeze(structuredClone(events));}});
}
