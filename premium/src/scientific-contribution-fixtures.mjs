import { SCIENTIFIC_CONSENT_VERSION } from './scientific-consent.mjs';

export const SCIENTIFIC_CONTRIBUTION_FIXTURE_VERSION = 'synthetic-contributors-2026.10';
export const SCIENTIFIC_CONTRIBUTION_DEFAULT_SEED = 'PISTE-SCIENTIFIC-CORPUS-2026';

function seededRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const stamp = index => `2026-${String(1 + Math.floor(index / 30)).padStart(2,'0')}-${String(1 + (index % 28)).padStart(2,'0')}T${String(7 + index % 10).padStart(2,'0')}:00:00.000Z`;

export function createScientificContributionFixtures(seed = SCIENTIFIC_CONTRIBUTION_DEFAULT_SEED) {
  const random = seededRandom(seed);
  const contributors = Array.from({length:10},(_,index)=>({
    sourceKey:`synthetic-contributor-${String(index+1).padStart(2,'0')}`,
    mockUserId:`contributor-${String(index+1).padStart(2,'0')}`,
    label:`Contributeur fictif ${String(index+1).padStart(2,'0')}`,
    experienceBand:['developing','experienced','advanced'][index%3],
    synthetic:true
  }));
  const dogs = Array.from({length:10},(_,index)=>({
    sourceKey:`synthetic-dog-${String(index+1).padStart(2,'0')}`,
    contributorKey:contributors[index%contributors.length].sourceKey,
    label:`Chien fictif ${String(index+1).padStart(2,'0')}`,
    synthetic:true
  }));
  const consentEvents=[];
  const inclusionEvents=[];
  const categoriesByContributor = [
    ['training_session','gps_trace','weather','dog_metrics','field_events','longitudinal_history','reference_trace'],
    ['training_session','weather','dog_metrics','field_events','longitudinal_history'],
    [],
    ['training_session','gps_trace','weather'],
    ['training_session','weather','dog_metrics','longitudinal_history'],
    ['training_session','gps_trace','weather','field_events','longitudinal_history'],
    ['training_session','weather','dog_metrics','jumolf_feedback','longitudinal_history'],
    ['weather','reference_trace'],
    ['training_session','gps_trace','weather','driver_annotations','longitudinal_history'],
    ['training_session','weather','dog_metrics','field_events','longitudinal_history']
  ];
  const opsByContributor = [
    ['tracking_metrics','pseudonymized_trace','weather','track_age','generic_environment'], [], [], [],
    ['tracking_metrics','non_sensitive_events','track_age','generic_environment'], [], [], [], [], []
  ];
  contributors.forEach((contributor,index)=>{
    if(index===2) return;
    const when=stamp(index);
    consentEvents.push({eventId:`fixture-consent-${index+1}-1`,consentId:`fixture-consent-${index+1}`,mockUserId:contributor.mockUserId,type:'participation_enabled',version:SCIENTIFIC_CONSENT_VERSION,source:'synthetic-fixture',actor:{userId:contributor.mockUserId,role:'contributor'},occurredAt:when,synthetic:true});
    for(const category of categoriesByContributor[index]) consentEvents.push({eventId:`fixture-consent-${index+1}-${consentEvents.length+1}`,consentId:`fixture-consent-${index+1}`,mockUserId:contributor.mockUserId,type:'category_enabled',category,version:SCIENTIFIC_CONSENT_VERSION,source:'synthetic-fixture',actor:{userId:contributor.mockUserId,role:'contributor'},occurredAt:when,synthetic:true});
    for(const category of opsByContributor[index]) consentEvents.push({eventId:`fixture-ops-${index+1}-${consentEvents.length+1}`,consentId:`fixture-consent-${index+1}`,mockUserId:contributor.mockUserId,type:'ops_category_enabled',category,version:SCIENTIFIC_CONSENT_VERSION,source:'synthetic-fixture',actor:{userId:contributor.mockUserId,role:'contributor'},occurredAt:when,synthetic:true});
    if(index===3) consentEvents.push({eventId:'fixture-consent-04-withdraw',consentId:'fixture-consent-4',mockUserId:contributor.mockUserId,type:'participation_withdrawn',version:SCIENTIFIC_CONSENT_VERSION,source:'synthetic-fixture',actor:{userId:contributor.mockUserId,role:'contributor'},occurredAt:'2026-04-20T12:00:00.000Z',synthetic:true});
  });
  const sessions=[];
  const environments=['forest','rural','periurban','urban','wetland','mixed'];
  const surfaces=['soil','grass','gravel','wet_ground','forest_path','mixed_surface'];
  const weatherBands=['cool_humid','mild_dry','mild_humid','warm_windy'];
  for(let contributorIndex=0;contributorIndex<contributors.length;contributorIndex++){
    const contributor=contributors[contributorIndex];
    for(let ordinal=0;ordinal<6;ordinal++){
      const index=contributorIndex*6+ordinal;
      const type=ordinal===5&&contributorIndex%2===0?'operational':'training';
      const environment=environments[Math.floor(random()*environments.length)];
      const session={
        sourceKey:`synthetic-session-${String(index+1).padStart(3,'0')}`,
        contributorKey:contributor.sourceKey,
        dogKey:dogs[(contributorIndex+ordinal)%dogs.length].sourceKey,
        type,
        occurredAt:stamp(index),
        environment,
        surface:surfaces[Math.floor(random()*surfaces.length)],
        experienceBand:contributor.experienceBand,
        weather:{band:weatherBands[Math.floor(random()*weatherBands.length)],humidityPct:45+Math.floor(random()*50),windBand:['low','moderate','high'][Math.floor(random()*3)],provenance:'historical_weather',quality:['high','medium','low'][index%3]},
        trackAgeBand:['under_30m','30_90m','90m_3h','3_6h','over_6h','unknown'][Math.floor(random()*6)],
        metrics:{distanceM:Math.round((650+random()*4200)/10)*10,durationSeconds:Math.round(900+random()*5000),ruptures:Math.floor(random()*4),restarts:Math.floor(random()*4),restartDelaySeconds:Math.round(8+random()*80),confidencePct:Math.round(48+random()*48)},
        trace:Array.from({length:4},(_,point)=>({x:Math.round((100+point*31+random()*10)/10)*10,y:Math.round((110+point*23+random()*10)/10)*10})),
        referenceTrace:Array.from({length:4},(_,point)=>({x:Math.round((102+point*30+random()*8)/10)*10,y:Math.round((108+point*22+random()*8)/10)*10})),
        events:['start',...(random()>.45?['indication']:[]),...(random()>.6?['rupture','restart']:[]),'finish'],
        quality:['high','medium','low','insufficient'][index%4],
        provenance:{trace:type==='training'?'phone_gps':'estimated',weather:'historical_weather',metrics:'calculated'},
        synthetic:true
      };
      sessions.push(session);
      if(index===7) inclusionEvents.push({sessionKey:session.sourceKey,state:'excluded_by_user',synthetic:true});
      if(index===23) inclusionEvents.push({sessionKey:session.sourceKey,state:'excluded_sensitive',synthetic:true});
    }
  }
  return {version:SCIENTIFIC_CONTRIBUTION_FIXTURE_VERSION,seed:String(seed),contributors,dogs,sessions,consentEvents,inclusionEvents};
}
