export function authorizedCoachingContacts(communityStore){
 if(!communityStore)return [];
 return communityStore.getContacts().filter(person=>communityStore.getContactPermissions(person.id)?.quick_coaching_invite_authorized===true);
}

export function coachingDraftWithContacts(draft,communityStore){
 const participants=[...draft.participants];
 for(const person of authorizedCoachingContacts(communityStore)){
  const existing=participants.find(item=>item.id===person.id);
  if(existing)existing.name=person.displayName;
  else participants.push({id:person.id,name:person.displayName});
 }
 return participants.every((person,index)=>person.name===draft.participants[index]?.name)?draft:{...draft,participants};
}

export function ensureCoachingContactParticipant(draft,contactId,communityStore){
 const person=authorizedCoachingContacts(communityStore).find(item=>item.id===contactId);
 const existing=draft.participants.find(item=>item.id===contactId);
 if(!person)return draft;
 if(existing){if(existing.name===person.displayName)return draft;return {...draft,participants:draft.participants.map(item=>item.id===contactId?{...item,name:person.displayName}:item)};}
 return {...draft,participants:[...draft.participants,{id:person.id,name:person.displayName}]};
}
