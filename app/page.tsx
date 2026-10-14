import AcademicHome from './academic-home';
import LearningPortal from './learning-portal';
import {headers} from 'next/headers';
export default async function Home() { const host=(await headers()).get('host')||'';return host.startsWith('edu.')?<LearningPortal/>:<AcademicHome/>; }
