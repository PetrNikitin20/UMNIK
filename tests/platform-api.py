"""End-to-end checks on the isolated localhost DB, with fictional accounts only."""
import json,urllib.request,urllib.error,http.cookiejar,uuid,concurrent.futures,os
if os.environ.get('UMNIK_TEST_TRANSPORT')=='stdio':
 from standalone_transport import build_opener
 urllib.request.build_opener=build_opener
BASE=os.environ.get('UMNIK_TEST_BASE','http://127.0.0.1:5173')
PASSWORD='Preview-Test-Password-2026!'
class Session:
 def __init__(self):self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(self,path,body=None,origin=BASE):
  h={'Origin':origin};data=None
  if body is not None:h['Content-Type']='application/json';data=json.dumps(body,ensure_ascii=False).encode()
  req=urllib.request.Request(BASE+'/api/'+path,data=data,headers=h,method='GET' if body is None else 'POST')
  try:r=self.opener.open(req,timeout=40)
  except urllib.error.HTTPError as e:r=e
  text=r.read().decode('utf-8');return r.code,json.loads(text) if 'application/json' in r.headers.get('Content-Type','') else text
 def login(self,login,password=PASSWORD):
  code,data=self.call('login',{'login':login,'password':password});assert code==200,(code,data);return data
student=Session();student.login('test-student');other=Session();other.login('test-other');admin=Session();admin.login('test-admin');anon=Session();passed=[]
def check(name,truth):assert truth,name;passed.append(name)
def ok(s,path,body=None):code,data=s.call(path,body);assert code==200,(path,code,data);return data
catalog=ok(anon,'platform/catalog')
check('public catalog excludes identities',all('users' not in c and 'password' not in c for c in catalog['courses']))
check('anonymous metrics denied',anon.call('platform/metrics')[0]==401)
check('student reports denied',student.call('platform/report?kind=progress')[0]==403)
check('student cannot create course',student.call('platform/course',{})[0]==403)
check('cross-origin enrollment denied',student.call('platform/enroll',{'course':'data-analysis','active':True},'https://example.invalid')[0]==403)
ok(student,'platform/enroll',{'course':'data-analysis','active':False})
check('unselected discipline cannot be edited',student.call('platform/save',{'assignment':'data-experiment','version':0,'payload':{}})[0]==403)
ok(student,'platform/enroll',{'course':'data-analysis','active':True})
work=ok(student,'platform/work?assignment=data-experiment')
payload={k:'Проверяемый учебный протокол: фиксированные данные, контроль утечки и заранее определенные критерии сравнения.' for k in ['question','hypothesis','data','split','baseline','metric','protocol','interpretation']}
payload['codeUrl']=''
old=ok(student,'application');main_version=old['version'];main_title=old['payload']['title'];main=ok(student,'platform/work?assignment=research-umnik')
check('legacy UMNIK backfill retains current version',main['version']==main_version and main['payload']['title']==main_title)
check('foreign source work denied',student.call('platform/save',{'assignment':'data-experiment','version':work['version'],'payload':payload,'sourceWork':'test-other::research-umnik'})[0]==400)
code,data=student.call('platform/save',{'assignment':'data-experiment','version':work['version'],'payload':{**payload,'codeUrl':'javascript:alert(1)'}})
check('unsafe code URL rejected',code==400)
saved=ok(student,'platform/save',{'assignment':'data-experiment','version':work['version'],'payload':payload,'sourceWork':main['id']});version=saved['version']
check('save preserves source relation',ok(student,'platform/work?assignment=data-experiment')['source_work']==main['id'])
check('stale save rejected',student.call('platform/save',{'assignment':'data-experiment','version':version-1,'payload':payload})[0]==409)
def write(i):return student.call('platform/save',{'assignment':'data-experiment','version':version,'payload':{**payload,'question':payload['question']+str(i)},'sourceWork':main['id']})[0]
with concurrent.futures.ThreadPoolExecutor(2) as pool:codes=list(pool.map(write,[1,2]))
check('concurrent experiment writes make one version',sorted(codes)==[200,409]);work=ok(student,'platform/work?assignment=data-experiment');version=work['version']
check('other student sees no foreign revisions',ok(other,'platform/me')['works']==[] or all(w['user_id']=='test-other' for w in ok(other,'platform/me')['works']))
check('stale submission denied',student.call('platform/submit',{'assignment':'data-experiment','version':version-1})[0]==409)
ok(student,'platform/submit',{'assignment':'data-experiment','version':version})
ok(student,'platform/submit',{'assignment':'research-umnik','version':main_version})
check('student cannot assess themselves',student.call('platform/assessment',{'work':work['id'],'version':version,'phase':'final','scores':[]})[0]==403)
scores=[{'competency':'experiment','score':1,'comment':'Зафиксирован начальный план, но еще не раскрыта проверка гипотезы и интерпретация ошибки.'}]
ok(admin,'platform/assessment',{'work':work['id'],'version':version,'phase':'baseline','scores':scores})
teacher_account=ok(admin,'platform/user',{'name':'Тестовый преподаватель образовательной аналитики','role':'teacher'})
teacher=Session();teacher.login(teacher_account['login'],teacher_account['password'])
check('new teacher must change temporary password',teacher.call('platform/teacher')[0]==403)
new_password='Learning-Teacher-Test-2026!'
ok(teacher,'password',{'current':teacher_account['password'],'password':new_password});teacher.login(teacher_account['login'],new_password)
check('teacher has no course before assignment',ok(teacher,'platform/teacher')['courses']==[])
ok(admin,'platform/teacher-access',{'course':'data-analysis','user':teacher_account['id'],'active':True})
check('teacher sees only assigned discipline',{c['id'] for c in ok(teacher,'platform/teacher')['courses']}=={'data-analysis'})
check('teacher cannot read foreign course work',teacher.call('platform/teacher/work?id='+main['id'])[0]==403)
check('teacher cannot export foreign course',teacher.call('platform/report?kind=progress&course=research-seminar')[0]==403)
check('teacher cannot grant access',teacher.call('platform/teacher-access',{})[0]==403)
check('teacher cannot set an unrelated competency',teacher.call('platform/assessment',{'work':work['id'],'version':version,'phase':'final','scores':[{'competency':'product','score':3,'comment':'Основание должно относиться к компетенции данного задания.'}]})[0]==400)
final_scores=[{'competency':'experiment','score':3,'comment':'Протокол задает сравнение baseline, фиксированный test и критерий решения; применен подход из научного семинара.'}]
check('teacher needs access to both courses to verify transfer',teacher.call('platform/assessment',{'work':work['id'],'version':version,'phase':'final','scores':final_scores,'transfer':True})[0]==403)
ok(admin,'platform/assessment',{'work':work['id'],'version':version,'phase':'final','scores':final_scores,'transfer':True})
summary=ok(student,'platform/metrics');comp=next(c for c in summary['competencies'] if c['id']=='experiment')
check('same-rubric baseline and final produce delta',any(d['delta']==2 and d['courseId']=='data-analysis' for d in comp['deltas']))
check('verified cross-course transfer recorded',comp['transferCount']>=1)
research=ok(admin,'platform/report?kind=research')
check('research export removes names, logins and free comments','Тестовый' not in research and 'test-student' not in research and final_scores[0]['comment'] not in research and 'Участник' in research)
check('research export includes assignment, work and module versions','Код_задания' in research and 'Работа' in research and 'experiment-v1' in research)
archive=ok(admin,'platform/report?kind=archive')
check('full archive includes platform and legacy work without secrets','learning_revisions' in archive['tables'] and 'revisions' in archive['tables'] and 'password_hash' not in json.dumps(archive) and 'sessions' not in archive['tables'])
check('teacher cannot export full archive',teacher.call('platform/report?kind=archive')[0]==403)
for kind in ['progress','enrollments','competencies','events']:
 check('teacher scoped export '+kind,teacher.call('platform/report?kind='+kind)[0]==200)
event={'assignment':'data-experiment','event':'active','seconds':30,'id':str(uuid.uuid4())}
ok(student,'platform/activity',event);before=ok(student,'platform/metrics');ok(student,'platform/activity',event);after=ok(student,'platform/metrics')
check('activity retries are idempotent',sum(e['seconds'] for e in before['events'])==sum(e['seconds'] for e in after['events']))
check('oversized active interval rejected',student.call('platform/activity',{**event,'id':str(uuid.uuid4()),'seconds':3600})[0]==400)
ok(student,'platform/save',{'assignment':'data-experiment','version':version,'payload':{**payload,'interpretation':payload['interpretation']+' Новая версия.'},'sourceWork':main['id']})
check('changed final evidence is historical',not any(d['courseId']=='data-analysis' for d in next(c for c in ok(student,'platform/metrics')['competencies'] if c['id']=='experiment')['deltas']))
check('old submitted version cannot be assessed',admin.call('platform/assessment',{'work':work['id'],'version':version,'phase':'final','scores':final_scores})[0]==409)
ok(student,'platform/enroll',{'course':'data-analysis','active':False})
check('withdrawal retains work history',ok(student,'platform/work?assignment=data-experiment')['version']==version+1)
check('withdrawn discipline is read-only',ok(student,'platform/work?assignment=data-experiment')['editable'] is False)
ok(student,'platform/enroll',{'course':'data-analysis','active':True})
new_assignment='test-umnik-'+uuid.uuid4().hex[:10]
ok(admin,'platform/assignment',{'id':new_assignment,'course':'research-seminar','title':'Тестовое независимое задание УМНИК','module':'umnik','instruction':'Отдельная учебная заявка для проверки изоляции работ внутри одной дисциплины.','deadline':'','active':True,'competencies':['research','experiment']})
separate=ok(student,'application?assignment='+new_assignment);separate['payload']['title']='Независимая заявка для тестирования версии и контекста'
ok(student,'application?assignment='+new_assignment,{'payload':separate['payload'],'version':separate['version']})
check('separate UMNIK assignments keep independent versions',ok(student,'application')['version']==main_version and ok(student,'application')['payload']['title']==main_title)
check('legacy admin view uses primary UMNIK only',ok(admin,'admin/student?id=test-student')['version']==main_version)
check('assignment module cannot change after work starts',admin.call('platform/assignment',{'id':new_assignment,'course':'research-seminar','title':'Тестовое независимое задание УМНИК','module':'experiment','instruction':'Попытка изменения симулятора при наличии сохраненной работы.','deadline':'','active':True,'competencies':['research','experiment']})[0]==400)
ok(admin,'platform/assignment',{'id':new_assignment,'course':'research-seminar','title':'Тестовое независимое задание УМНИК','module':'umnik','instruction':'Отдельная учебная заявка для проверки изоляции работ внутри одной дисциплины.','deadline':'','active':False,'competencies':['research','experiment']})
check('student cannot edit closed assignment',student.call('application?assignment='+new_assignment,{'payload':separate['payload'],'version':1})[0]==403)
for name in passed:print('PASS',name)
print(str(len(passed))+' platform integration checks passed')
