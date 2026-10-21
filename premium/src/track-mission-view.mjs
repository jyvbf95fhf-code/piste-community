import {MissionWeatherMarkup,MissionBriefMarkup,missionLocalTime,missionAgeLabel} from './track-mission-screen.mjs';
export function mountMissionControl({root,controller,context,draw,onAction=()=>{},window:win=globalThis.window,document:doc=globalThis.document}={}){
 if(!root)return {dispose(){}};
 let disposed=false,frame=null,last=0,weatherKey='',briefKey='';
 const media=win.matchMedia('(prefers-reduced-motion: reduce)'),text=(selector,value)=>{const el=root.querySelector(selector);if(el&&el.textContent!==value)el.textContent=value;};
 function paint(){
  if(disposed||!root.isConnected)return;const s=controller.snapshot();root.hidden=!s.active;if(!s.active)return;
  draw({route:s.route,environment:s.environment,corridor:s.corridor,sample:s.sample,progress:s.progress,preview:!!context.preview});
  const distance=root.closest('[data-track-cockpit]')?.querySelector('[data-creator-distance]');if(distance)distance.textContent=(s.route.distanceM/1000).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' km'+(context.preview?' · aperçu':'');
  const weather=JSON.stringify([s.environment,s.error,s.busy]);if(weather!==weatherKey){weatherKey=weather;const target=root.querySelector('[data-mission-weather]');if(target)target.innerHTML=MissionWeatherMarkup(s);}
  const brief=JSON.stringify([s.timeline.start,s.timeline.end,s.timeline.at,s.environment,s.route.distanceM,s.route.stations,s.route.unchanged,context.dog,context.viewer,context.options]);if(brief!==briefKey){briefKey=brief;const target=root.querySelector('[data-mission-brief-content]');if(target)target.innerHTML=MissionBriefMarkup(s,context);}
  const toggle=root.querySelector('[data-mission-action="corridor"]');toggle?.setAttribute('aria-pressed',String(s.corridor));root.dataset.corridorActive=String(s.corridor);
  const badge=root.querySelector('[data-mission-hypothesis-badge]');if(badge)badge.hidden=!s.corridor;
  const load=root.querySelector('[data-mission-action="weather"]');if(load){load.disabled=s.busy;load.textContent=s.busy?'Chargement météo…':'Charger la météo horaire';}
  text('[data-mission-status]',s.error);text('[data-mission-age]',missionAgeLabel(s.timeline));
  text('[data-mission-play-status]',`${s.playing?'Lecture':s.progress>=1?'Parcours terminé':'En pause'} · ${Math.round(s.progress*100)} % · ${Math.round(s.sample.distanceM)} m virtuels`);
  text('[data-mission-observation]',s.sample.station?`${s.sample.station.label} · ralentissement pédagogique : observer la conduite, les aides et les conditions sans présumer leur cause.`:'Observer le contexte et les aides sans présumer une cause olfactive.');
  const reduced=root.querySelector('[data-mission-reduced]');if(reduced)reduced.hidden=!s.reducedMotion;
  const play=root.querySelector('[data-mission-action="play"]');if(play){play.disabled=!s.route.valid||s.playing;play.textContent=s.reducedMotion?'Avancer sans animation':s.progress>0&&s.progress<1?'Reprendre':'Lire';}
  for(const [selector,value,disabled] of [['[data-mission-progress]',Math.round(s.progress*1000),!s.route.valid],['[data-mission-position]',Math.round(s.instant*1000),!s.timeline.valid]]){const input=root.querySelector(selector);if(input){if(doc.activeElement!==input)input.value=String(value);input.disabled=disabled;}}
  if(s.playing&&frame===null&&!doc.hidden)frame=win.requestAnimationFrame(loop);
  if(!s.playing){last=0;if(frame!==null)win.cancelAnimationFrame(frame);frame=null;}
 }
 function loop(now){frame=null;if(disposed||doc.hidden)return;const s=controller.snapshot();if(!s.playing)return;if(!last)last=now;const delta=now-last;if(delta>=33){last=now;controller.advance(Math.min(delta/1000,.15));}if(controller.snapshot().playing&&frame===null)frame=win.requestAnimationFrame(loop);}
 const report=error=>text('[data-mission-status]',error.message);
 function click(event){const target=event.target.closest('[data-mission-action]');if(!target)return;event.preventDefault();const action=target.dataset.missionAction;
  try{if(action==='play')controller.play();else if(action==='pause')controller.pause();else if(action==='step')controller.step();else if(action==='reset')controller.setProgress(0);else if(action==='corridor')controller.toggleCorridor();else if(action==='weather')void controller.fetchWeather();else if(action==='preset'){const start=Date.now(),end=start+3600000;controller.setTimes(start,end);root.querySelector('[name="poseAt"]').value=missionLocalTime(start);root.querySelector('[name="departureAt"]').value=missionLocalTime(end);}else onAction(action,target);}catch(error){report(error);}
 }
 function input(event){try{if(event.target.matches('[data-mission-progress]'))controller.setProgress(Number(event.target.value)/1000);if(event.target.matches('[data-mission-position]'))controller.setInstant(Number(event.target.value)/1000);}catch(error){report(error);}}
 function submit(event){const form=event.target;if(!form.matches('[data-mission-times],[data-mission-manual]'))return;event.preventDefault();try{const values=Object.fromEntries(new FormData(form));if(form.matches('[data-mission-times]'))controller.setTimes(values.poseAt,values.departureAt);else controller.setManual(values);}catch(error){report(error);}}
 const visibility=()=>{if(doc.hidden)controller.pause();},motion=()=>controller.setReducedMotion(media.matches);
 const unsubscribe=controller.subscribe(paint);root.addEventListener('click',click);root.addEventListener('input',input);root.addEventListener('submit',submit);doc.addEventListener('visibilitychange',visibility);media.addEventListener('change',motion);motion();paint();
 return {dispose(){disposed=true;if(frame!==null)win.cancelAnimationFrame(frame);unsubscribe();controller.pause();root.removeEventListener('click',click);root.removeEventListener('input',input);root.removeEventListener('submit',submit);doc.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motion);}};
}
