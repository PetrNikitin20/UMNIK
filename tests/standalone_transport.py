"""Port-free transport for the same integration suite and fictional database."""
import atexit,io,json,os,subprocess,threading,queue,itertools,email.message,http.cookiejar,pathlib
_proc=None;_pending={};_lock=threading.Lock();_ids=itertools.count(1)
def _start():
 global _proc
 if _proc:return
 _proc=subprocess.Popen([os.environ.get('UMNIK_NODE','node'),str(pathlib.Path(__file__).with_name('node-api-bridge.mjs'))],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,encoding='utf-8',bufsize=1)
 def reader():
  for line in _proc.stdout:
   data=json.loads(line)
   with _lock:q=_pending.pop(data['id'],None)
   if q:q.put(data)
 threading.Thread(target=reader,daemon=True).start()
def _close():
 if _proc:
  _proc.terminate()
  try:_proc.wait(timeout=5)
  except subprocess.TimeoutExpired:_proc.kill()
atexit.register(_close)
class Response:
 def __init__(self,data):
  if data.get('error'):raise RuntimeError(data['error'])
  self.code=data['status'];self.headers=email.message.Message()
  for k,v in data['headers']:self.headers[k]=v
  self.stream=io.BytesIO(data['body'].encode('utf-8'))
 def read(self):return self.stream.read()
 def info(self):return self.headers
class Opener:
 def __init__(self):self.cookies=http.cookiejar.CookieJar()
 def open(self,req,timeout=40):
  self.cookies.add_cookie_header(req);q=queue.Queue();ident=next(_ids)
  message={'id':ident,'url':req.full_url,'method':req.get_method(),'headers':dict(req.header_items()),'body':req.data.decode('utf-8') if req.data is not None else None}
  with _lock:
   _start();_pending[ident]=q;_proc.stdin.write(json.dumps(message,ensure_ascii=False)+'\n');_proc.stdin.flush()
  response=Response(q.get(timeout=timeout));self.cookies.extract_cookies(response,req);return response
def build_opener(*args):return Opener()
