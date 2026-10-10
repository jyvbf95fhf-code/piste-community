// Pure policy for an explicit trusted model context. No UI, recording or IO.
// This module decides only reference.read; it does not authenticate callers.
const isId=value=>typeof value==='string'&&value.trim().length>0;
const oneOf=(value,values)=>values.includes(value);
const decision=(allowed,reason)=>({allowed,reason});

export function decideCoachingPermission(context,request){
 if(!context||typeof context!=='object')return decision(false,'INVALID_CONTEXT');
 if(!request||typeof request!=='object')return decision(false,'INVALID_REQUEST');
 if(request.permission!=='reference.read')return decision(false,'UNKNOWN_PERMISSION');
 const {session,requester,reference}=context;
 if(!session||!isId(session.id))return decision(false,'INVALID_SESSION');
 if(request.sessionId!==session.id)return decision(false,'SESSION_MISMATCH');
 if(!oneOf(session.mode,['normal','simple_blind','full_blind']))return decision(false,'UNKNOWN_MODE');
 if(!oneOf(session.phase,['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF','ARCHIVED']))return decision(false,'UNKNOWN_PHASE');
 if(!requester||!isId(requester.id))return decision(false,'UNKNOWN_REQUESTER');
 if(!Array.isArray(session.participantIds)||!session.participantIds.length||!session.participantIds.every(isId))return decision(false,'INVALID_MEMBERSHIP');
 if(!session.participantIds.includes(requester.id))return decision(false,'NOT_SESSION_PARTICIPANT');
 const assigned=requester.assignedFunctions,role=requester.actingFunction;
 if(!Array.isArray(assigned)||!assigned.length||!assigned.every(value=>oneOf(value,['driver','traceur','coach','observer'])))return decision(false,'INVALID_FUNCTIONS');
 if(!assigned.includes(role))return decision(false,'FUNCTION_NOT_ASSIGNED');
 if(!reference||!isId(reference.id))return decision(false,'INVALID_REFERENCE');
 if(request.referenceId!==reference.id)return decision(false,'REFERENCE_MISMATCH');
 if(reference.sessionId!==session.id)return decision(false,'REFERENCE_SESSION_MISMATCH');
 if(!oneOf(reference.provenance,['prepared','gpx','recorded-mock','recorded-gps']))return decision(false,'INVALID_REFERENCE_PROVENANCE');
 const owner=reference.ownerParticipantId,poser=reference.poserParticipantId;
 // null/undefined mean unknown, never evidence of ownership or pose.
 if(owner==null&&poser==null)return decision(false,'INVALID_REFERENCE_IDENTITY');
 for(const id of [owner,poser])if(id!=null&&(!isId(id)||!session.participantIds.includes(id)))return decision(false,'INVALID_REFERENCE_IDENTITY');
 if(oneOf(session.phase,['DEBRIEF','ARCHIVED']))return decision(true,'POST_SESSION_REFERENCE_VISIBLE');
 if(session.mode==='normal')return decision(true,'REFERENCE_VISIBLE');
 // Identity-level blind restrictions cannot be bypassed by a function switch.
 if(assigned.includes('driver'))return decision(false,role==='driver'?'BLIND_REFERENCE_DENIED':'BLIND_DRIVER_REFERENCE_DENIED');
 if(role==='traceur')return owner===requester.id||poser===requester.id?decision(true,'REFERENCE_VISIBLE'):decision(false,'REFERENCE_NOT_OWNED');
 if(session.mode==='simple_blind'&&oneOf(role,['coach','observer']))return decision(true,'REFERENCE_VISIBLE');
 if(session.mode==='full_blind'&&role==='coach'&&assigned.includes('traceur')&&poser===requester.id)return decision(true,'COACH_POSER_REFERENCE_VISIBLE');
 return decision(false,'BLIND_REFERENCE_DENIED');
}
