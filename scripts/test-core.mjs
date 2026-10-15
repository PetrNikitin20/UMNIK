import ts from 'typescript';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
const folder=mkdtempSync(join(tmpdir(),'umnik-core-tests-'));
const files=['lib/workbook.ts','lib/evaluation.ts','lib/calendar.ts','lib/news.ts','lib/learning.ts','tests/evaluation.test.ts','tests/news-calendar.test.ts','tests/learning.test.ts'];
let code=1;
try{
 writeFileSync(join(folder,'package.json'),'{"type":"commonjs"}');
 for(const file of files){const target=join(folder,file.replace(/\.ts$/,'.js'));mkdirSync(dirname(target),{recursive:true});writeFileSync(target,ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const result=spawnSync(process.execPath,['--test',...files.filter(f=>f.startsWith('tests/')).map(f=>join(folder,f.replace(/\.ts$/,'.js')))],{stdio:'inherit'});
 if(result.error)throw result.error;code=result.status??1;
}finally{
 if(dirname(resolve(folder))!==resolve(tmpdir())||!basename(folder).startsWith('umnik-core-tests-'))throw new Error('Unsafe temporary directory');
 rmSync(folder,{recursive:true,force:true});
}
process.exit(code);
