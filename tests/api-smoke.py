"""Integration tests against an isolated local preview DB, never production."""
import concurrent.futures,sys,json,urllib.request,urllib.error,http.cookiejar
class Response:
 def __init__(self,r):self.status_code=r.code;self.headers=r.headers;self.text=r.read().decode('utf-8')
 def json(self):return json.loads(self.text)
class Session:
 def __init__(self):self.headers={};self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(self,url,method='GET',json=None,headers=None):
  h={**self.headers,**(headers or {})};data=None
  if json is not None:h['Content-Type']='application/json';data=globals()['json'].dumps(json,ensure_ascii=False).encode()
  req=urllib.request.Request(url,data=data,headers=h,method=method)
  try:return Response(self.opener.open(req,timeout=40))
  except urllib.error.HTTPError as e:return Response(e)
 def get(self,url,**kw):return self.call(url,**kw)
 def post(self,url,**kw):return self.call(url,'POST',**kw)
class Requests:
 Session=Session
 def get(self,url,**kw):return Session().get(url,**kw)
 def post(self,url,**kw):return Session().post(url,**kw)
requests=Requests()
base='http://127.0.0.1:5173'
password='Preview-Test-Password-2026!'
def session(login):
 s=requests.Session();s.headers['Origin']=base
 r=s.post(base+'/api/login',json={'login':login,'password':password});assert r.status_code==200,r.text
 assert 'HttpOnly' in r.headers['Set-Cookie'] and 'SameSite=Strict' in r.headers['Set-Cookie']
 return s
student=session('test-student');other=session('test-other');admin=session('test-admin');passed=[]
def check(name,value):assert value,name;passed.append(name)
check('anonymous data denied',requests.get(base+'/api/application').status_code==401)
check('student cannot read admin reports',student.get(base+'/api/admin/report?kind=students').status_code==403)
check('student cannot reset another password',student.post(base+'/api/admin/user',json={'id':'test-other','action':'reset'}).status_code==403)
check('cross-origin mutation rejected',student.post(base+'/api/application',headers={'Origin':'https://evil.example'},json={}).status_code==403)
d=student.get(base+'/api/application').json();p=d['payload'];p['title']='Разработка учебного модуля проверки данных';p['problem']='Проверяемый процесс, ограничение и источник для учебного исследования.'
r=student.post(base+'/api/application',json={'version':d['version'],'payload':p,'userId':'test-other'});check('save application',r.status_code==200);v=r.json()['version']
check('owner enforced regardless of submitted ID',other.get(base+'/api/application').json()['version']==0)
check('old version rejected',student.post(base+'/api/application',json={'version':v-1,'payload':p}).status_code==409)
check('invalid select rejected',student.post(base+'/api/application',json={'version':v,'payload':{**p,'age':'override'}}).status_code==400)
def write(i):return student.post(base+'/api/application',json={'version':v,'payload':{**p,'problem':p['problem']+str(i)}}).status_code
with concurrent.futures.ThreadPoolExecutor(2) as pool: codes=list(pool.map(write,[1,2]))
check('concurrent writers produce one new revision',sorted(codes)==[200,409]);v=student.get(base+'/api/application').json()['version']
check('cross-user revision inaccessible',other.get(base+f'/api/revision?version={v}').json() is None)
e=student.post(base+'/api/evaluate',json={'version':v,'llmConsent':False});check('evaluation succeeds without API key',e.status_code==200 and len(e.json()['issues'])>20 and e.json()['llm']['status']=='disabled')
check('evaluation never predicts grant',not any(k in e.json() for k in ['winProbability','grantApproved']))
check('admin can inspect saved application',admin.get(base+'/api/admin/student?id=test-student').json()['version']==v)
r=admin.post(base+'/api/admin/review',json={'id':'test-student','version':v,'status':'Требуется доработка','comment':'Уточните данные и проверьте baseline до следующего занятия.'});check('teacher review saved',r.status_code==200)
check('student receives review',len(student.get(base+'/api/application').json()['reviews'])>=1)
for kind in ['students','evaluations','changes','audit','reviews','archive']:
 r=admin.get(base+'/api/admin/report?kind='+kind);check('export '+kind,r.status_code==200 and 'password_hash' not in r.text and password not in r.text)
check('MCP news write requires bound owner',requests.post(base+'/mcp',json={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'check_competition_sources','arguments':{}}}).json()['result']['isError'])
check('history contains field changes',len(student.get(base+'/api/history').json()['revisions'])>=2)
for name in passed:print('PASS',name)
print(f'{len(passed)} integration checks passed')
