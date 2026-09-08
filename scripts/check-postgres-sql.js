const fs=require('fs');
let parser;
try{parser=require('pgsql-parser')}
catch{
  console.error('pgsql-parser absent : npm install --no-save --ignore-scripts pgsql-parser@18.2.6');
  process.exit(2);
}
const {loadModule,parseSync}=parser;

const files=process.argv.slice(2);
if(!files.length){
  files.push('PISTE_V10.42.3_PATCH/PISTE_V10.42.3_VISIBILITY_DRY_RUN.sql','PISTE_V10.42.3_PATCH/PISTE_V10.42.3_VISIBILITY_APPLY.sql');
}

(async()=>{
  await loadModule();
  for(const file of files){
    const sql=fs.readFileSync(file,'utf8');
    const tree=parseSync(sql);
    console.log(`✓ ${file} — ${tree.stmts.length} instructions PostgreSQL analysées`);
  }
})().catch(error=>{
  console.error(`✗ syntaxe PostgreSQL invalide : ${error.message}`);
  process.exit(1);
});
