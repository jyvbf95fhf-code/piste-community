import {projectCoachingLiveForObserver} from './coaching-live-projection.mjs';
import {projectOpsLiveForObserver} from './operational-live-projection.mjs';

export function resolveCommunityLiveProjection({type,id,viewerId,liveStore,coaching={},mission}={}){
 if(!liveStore?.canViewSession(type,id,viewerId))return null;
 if(type==='coaching')return projectCoachingLiveForObserver({...coaching,session:coaching.session,viewerId});
 if(type==='ops')return projectOpsLiveForObserver(mission,liveStore.getSessionPolicy('ops',id));
 return null;
}
