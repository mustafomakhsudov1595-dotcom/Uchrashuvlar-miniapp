const {chromium}=require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(root,u);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end();}else{s.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});s.end(d);}})}).listen(0);
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error'&&!/GPU/.test(m.text()))errs.push(m.text())});
 await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForTimeout(4500);
 await p.screenshot({path:'/tmp/claude-0/m-hero.png'});
 const H=await p.evaluate(()=>document.documentElement.scrollHeight);
 for(let y=0;y<H;y+=350){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(90);}
 await p.waitForTimeout(800);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(600);
 await p.screenshot({path:'/tmp/claude-0/m-full.png',fullPage:true});
 console.log('H',H,errs);
 await b.close(); srv.close();
})();
