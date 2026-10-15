from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
R=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**k):super().__init__(*a,directory=str(R/'site'),**k)
    def translate_path(self,path):
        if path.startswith('/strict/'):path='/game/'+path.split('/',2)[2]
        return super().translate_path(path)
    def end_headers(self):
        self.send_header('Cache-Control','no-store');self.send_header('Access-Control-Allow-Origin','*');self.send_header('Cross-Origin-Resource-Policy','cross-origin')
        if self.path.startswith(('/strict/','/qa/')):
            self.send_header('Content-Security-Policy',CSP)
            self.send_header('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()')
        super().end_headers()
    def log_message(self,fmt,*args):
        with (R/'server.log').open('a') as f:f.write(fmt%args+'\n')
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);origin=f'http://127.0.0.1:{server.server_port}'
CSP=f"sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' {origin}; style-src 'unsafe-inline' {origin}; img-src data: {origin}; connect-src https://claus-network-api.vercel.app; worker-src 'none'; font-src data:; media-src data:; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; frame-ancestors {origin}"
print(origin,flush=True);server.serve_forever()
