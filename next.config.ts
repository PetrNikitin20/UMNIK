import type {NextConfig} from 'next';
import path from 'node:path';
const nextConfig:NextConfig={
 output:'standalone',
 outputFileTracingRoot:process.cwd(),
 images:{unoptimized:true},
 webpack(config,{webpack}){
  config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/,(resource:{request:string})=>{resource.request=path.resolve(process.cwd(),'server/node-env.ts');}));
  return config;
 }
};
export default nextConfig;
