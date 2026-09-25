import sys, os, json, urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
ROOT=os.path.dirname(os.path.abspath(__file__)); SITE=os.path.join(ROOT,"site"); VAULT=os.path.join(ROOT,"vault")
class H(SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=SITE,**k)
    def cors(s):
        s.send_header("Access-Control-Allow-Origin","*"); s.send_header("Access-Control-Allow-Headers","*")
    def out(s,obj):
        b=json.dumps(obj).encode(); s.send_response(200); s.cors(); s.send_header("Content-Type","application/json"); s.send_header("Content-Length",str(len(b))); s.end_headers(); s.wfile.write(b)
    def do_OPTIONS(s): s.send_response(204); s.cors(); s.end_headers()
    def do_GET(s):
        u=urllib.parse.urlparse(s.path)
        if u.path.startswith("/vault/"):
            k=urllib.parse.parse_qs(u.query).get("k",[""])[0]
            f=os.path.join(VAULT,urllib.parse.quote(k,safe="")+".json")
            if not os.path.exists(f): return s.out({"error":"notfound"})
            return s.out(json.load(open(f)))
        return super().do_GET()
    def do_POST(s):
        n=int(s.headers.get("Content-Length",0)); body=json.loads(s.rfile.read(n))
        f=os.path.join(VAULT,urllib.parse.quote(body["k"],safe="")+".json")
        json.dump(body["data"],open(f,"w")); s.out({"ok":True})
    def log_message(s,*a): pass
ThreadingHTTPServer(("127.0.0.1",int(sys.argv[1])),H).serve_forever()
