// Visit-scoped snapshots of the existing Coaching flow. This catalogue owns no transitions.
const clone=value=>structuredClone(value);

export function createSessionCatalog(){
 const records=new Map();
 return Object.freeze({
  capture(snapshot){
   const id=snapshot?.session?.id;
   if(!id)return null;
   const record=clone({
    session:snapshot.session,
    searchState:snapshot.searchState,
    preparationState:snapshot.preparationState,
    tracerState:snapshot.tracerState
   });
   records.set(id,record);
   return clone(record);
  },
  list(){return [...records.values()].map(clone);},
  get(id){const record=records.get(id);return record?clone(record):null;},
  clear(){records.clear();}
 });
}
