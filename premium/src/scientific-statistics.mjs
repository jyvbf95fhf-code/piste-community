const round=value=>value===null?null:Math.round(value*100)/100;
const quantile=(sorted,p)=>{if(!sorted.length)return null;const position=(sorted.length-1)*p,base=Math.floor(position),rest=position-base;return round(sorted[base]+(sorted[base+1]===undefined?0:(sorted[base+1]-sorted[base])*rest));};
export function summarizeScientificValues(values=[]){
 const present=values.filter(value=>typeof value==='number'&&Number.isFinite(value)).sort((a,b)=>a-b),sum=present.reduce((a,b)=>a+b,0);
 return{n:present.length,missing:values.length-present.length,min:present.length?present[0]:null,q1:quantile(present,.25),median:quantile(present,.5),q3:quantile(present,.75),max:present.length?present.at(-1):null,mean:present.length?round(sum/present.length):null,spread:present.length?round(present.at(-1)-present[0]):null};
}
