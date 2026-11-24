const fail=()=>{throw Object.assign(Error('Publication invalide.'),{status:400});};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const str=(v,max)=>{if(typeof v!=='string'||v.length>max)fail();return v.trim();};
export function normalizeCommunityPublication(input){
 if(!obj(input)||new TextEncoder().encode(JSON.stringify(input)).length>262144)fail();
 const text=input.text===undefined?'':str(input.text,1200),visibility=input.visibility??'contacts';if(!['private','contacts','community'].includes(visibility))fail();
 let attachment=null;
 if(input.attachment!=null){const a=input.attachment;if(!obj(a)||!['session','track'].includes(a.type)||typeof a.sourceId!=='string'||!a.sourceId.trim()||a.sourceId.length>200||!obj(a.fields))fail();const fields={};
  for(const [k,v] of Object.entries(a.fields)){
   if(!['title','dog','distance','trackAge','provenance','map'].includes(k))fail();
   if(k==='map'){
    if(!obj(v)||v.coordinateSpace!=='wgs84'||!Array.isArray(v.segments)||(!v.segments.length&&!v.poseSegments?.length)||Object.keys(v).some(k=>!['coordinateSpace','segments','poseSegments','corridor'].includes(k)))fail();let count=0;
    const segments=lines=>{if(!Array.isArray(lines))fail();return lines.map(s=>{if(!Array.isArray(s)||s.length<2)fail();count+=s.length;if(count>5000)fail();return s.map(p=>{if(!obj(p)||Object.keys(p).some(k=>!['x','y'].includes(k))||typeof p.x!=='number'||typeof p.y!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>180||Math.abs(p.y)>90)fail();return {x:p.x,y:p.y};});});};
    fields.map={coordinateSpace:'wgs84',segments:segments(v.segments)};
    if(v.poseSegments!==undefined)fields.map.poseSegments=segments(v.poseSegments);
    if(v.corridor!==undefined){
     const c=v.corridor;
     if(!obj(c)||c.provenance!=='estimated'||!Array.isArray(c.polygons)||c.polygons.length>120||Object.keys(c).some(key=>!['provenance','polygons'].includes(key)))fail();
     let total=0;
     const polygons=c.polygons.map(poly=>{if(!Array.isArray(poly)||poly.length<3||poly.length>1000)fail();total+=poly.length;if(total>6000)fail();return poly.map(p=>{if(!obj(p)||Object.keys(p).some(key=>!['x','y'].includes(key))||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>180||Math.abs(p.y)>90)fail();return {x:p.x,y:p.y};});});
     fields.map.corridor={provenance:'estimated',polygons};
    }
   }else if(k==='dog'&&obj(v)){const dog={};for(const key of ['id','name'])if(v[key]!==undefined)dog[key]=str(v[key],100);if(v.disciplines!==undefined){if(!Array.isArray(v.disciplines)||v.disciplines.length>20)fail();dog.disciplines=v.disciplines.map(d=>str(d,80));}if(!Object.keys(dog).length)fail();fields.dog=dog;
   }else if(typeof v==='number'&&['distance','trackAge'].includes(k)){if(!Number.isFinite(v)||v<0)fail();fields[k]=v;}else fields[k]=str(v,300);
  }
  if(!Object.keys(fields).length&&!text)fail();attachment={type:a.type,sourceId:a.sourceId,readOnly:true,fields};
  if(a.role!==undefined){
   if(a.type!=='session'||!a.sourceId.startsWith('coaching:')||!['driver','traceur','coach','observer'].includes(a.role))fail();
   attachment.role=a.role;
  }
 }
 if(!text&&!attachment)fail();return {text,visibility,type:attachment?.type??'text',attachment};
}
