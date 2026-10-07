export function timestampFrom(now=Date.now){
 const value=typeof now==='function'?now():now;
 const time=value instanceof Date?value.getTime():typeof value==='string'?Date.parse(value):Number(value);
 return Number.isFinite(time)?new Date(time).toISOString():null;
}

export function elapsedSeconds(start,end=Date.now()){
 const from=Date.parse(start||'');
 const to=end instanceof Date?end.getTime():typeof end==='string'?Date.parse(end):typeof end==='function'?Number(end()):Number(end);
 return Number.isFinite(from)&&Number.isFinite(to)?Math.max(0,Math.floor((to-from)/1000)):null;
}

export function formatElapsed(seconds){
 if(!Number.isFinite(seconds)||seconds<0)return 'Indisponible';
 const value=Math.floor(seconds),hours=Math.floor(value/3600),minutes=Math.floor(value%3600/60),remaining=value%60;
 return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(remaining).padStart(2,'0')}`;
}

export function formatTimestamp(value){
 if(!value||!Number.isFinite(Date.parse(value)))return 'Indisponible';
 return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'medium'}).format(new Date(value));
}
