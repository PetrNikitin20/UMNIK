"""Production-handler checks with fictional accounts; no listener or external LLM."""
import json,os,urllib.request,sqlite3
from standalone_transport import build_opener
base='https://portal.example.invalid'
os.environ['APP_ORIGINS']=base
db=sqlite3.connect(os.environ['DATABASE_PATH'])
db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('cloudOwnerId','fictional-owner')");db.commit();db.close()
opener=build_opener()
def call(path,body=None,headers=None):
 h={'Host':'portal.example.invalid','X-Forwarded-Proto':'https','Origin':base,**(headers or {})}
 req=urllib.request.Request('http://internal.invalid'+path,data=json.dumps(body).encode() if body is not None else None,headers=h,method='POST' if body is not None else 'GET')
 if body is not None:req.add_header('Content-Type','application/json')
 return opener.open(req)
r=call('/api/login',{'login':'test-admin','password':'Preview-Test-Password-2026!'})
assert r.code==200 and '; Secure' in r.headers['Set-Cookie'] and 'HttpOnly' in r.headers['Set-Cookie']
assert call('/api/login',{}, {'Host':'attacker.invalid'}).code!=200
assert call('/api/login',{}, {'Origin':'https://attacker.invalid'}).code==403
assert call('/api/health').code==200
r=call('/mcp',{'id':1,'jsonrpc':'2.0','method':'tools/call','params':{'name':'read_news_status','arguments':{}}},{'oai-authenticated-user-id':'fictional-owner'})
assert json.loads(r.read())['result']['isError'] is True
assert call('/api/news/sync',{}, {'Authorization':'Bearer wrong-token'}).code==403
status=json.loads(call('/api/me').read())
assert status['hostingMode']=='standalone' and status['llmConfigured'] is False
print('7 standalone origin, cookie, database and forged-cloud-identity checks passed')
