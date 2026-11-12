import {selectHistoricalWeather} from './session-weather-history.mjs';
import {buildGpsCorridor} from './coaching-corridor-model.mjs';

// Use only the already-authorized recorded pose and weather captured for it.
// Archives and shared debriefs must make the same visibility decision.
export function coachingCorridorReview({pose,mode,role,weatherHistory=[]}={}){
 const allowed=!!pose?.segments?.some(segment=>segment.length>=2)&&(mode==='normal'||(mode==='simple_blind'&&['traceur','coach'].includes(role)));
 const at=pose?.segments?.flat().at(-1)?.timestamp;
 const weather=allowed?selectHistoricalWeather(weatherHistory,at):null;
 const available=buildGpsCorridor({pose,weather,allowed,now:Number.isFinite(at)?at+1000:Date.now()}).state==='available';
 const status=available?'Couloir historique estimé · météo enregistrée pendant la séance.':'Couloir historique indisponible : aucun relevé de vent exploitable à la date de cette pose.';
 return {allowed,weather,available,status};
}
