import {env as workerEnv} from 'cloudflare:workers';
// Vite uses the native Worker binding. The standalone Next build aliases this module.
export const env=workerEnv as typeof workerEnv & {DEPLOYMENT_MODE?:string;APP_ORIGINS?:string};

