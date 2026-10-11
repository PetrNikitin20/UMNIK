import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const builder=createRequire(require.resolve('drizzle-kit'))('esbuild');
await mkdir('.sites-runtime',{recursive:true});
await builder.build({entryPoints:['tests/evaluation.test.ts','tests/news-calendar.test.ts'],bundle:true,platform:'node',format:'esm',outdir:'.sites-runtime/tests'});
const result=spawnSync(process.execPath,['--test','.sites-runtime/tests/evaluation.test.js','.sites-runtime/tests/news-calendar.test.js'],{stdio:'inherit'});
process.exitCode=result.status??1;
