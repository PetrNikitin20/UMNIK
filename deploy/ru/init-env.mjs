import {randomBytes} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const file=resolve('deploy/ru/.env');
if(existsSync(file))throw new Error('Existing server environment is preserved');
writeFileSync(file,'NEWS_SYNC_TOKEN='+randomBytes(32).toString('hex')+'\nGROQ_API_KEY=\nGROQ_MODEL=openai/gpt-oss-120b\n',{mode:0o600,flag:'wx'});
console.log('Private server environment created; secret values are not printed.');

