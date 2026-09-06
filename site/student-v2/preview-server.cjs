// Development only: serves the isolated test page. Does not load the parent app.
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const args=process.argv.slice(2);const value=(name,fallback)=>{const i=args.indexOf(name);return i>=0?args[i+1]:fallback;};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(!['/qa.html','/','/index.html','/student-v2','/student-v2/','/student-v2/index.html'].includes(url.pathname)){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');fs.createReadStream(path.join(__dirname,url.pathname==='/qa.html'?'qa.html':'index.html')).pipe(res);});
server.listen(Number(value('--port','4173')),value('--host','127.0.0.1'),()=>console.log('Student UI test preview ready'));
