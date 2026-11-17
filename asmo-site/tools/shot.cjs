const {chromium}=require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(root,u);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end();}else{s.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});s.end(d);}})}).listen(0);
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 for(const [n,w,h] of [['d',1440,900],['m',390,844]]){
  const p=await b.newPage({viewport:{width:w,height:h}});
  const errs=[]; p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
  await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForTimeout(2500);
  await p.screenshot({path:`/tmp/claude-0/${n}-hero.png`});
  const H=await p.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<H;y+=500){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(120);}
  await p.waitForTimeout(1200); await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(500);
  console.log(n,'scrollW',await p.evaluate(()=>document.documentElement.scrollWidth),'canvas on',await p.evaluate(()=>!!document.querySelector('#viewer canvas.on')),errs.filter(e=>!/GPU stall|ReadPixels|fonts/.test(e)).slice(0,6));
  await p.screenshot({path:`/tmp/claude-0/${n}-full.png`,fullPage:true});
 }
 await b.close(); srv.close();
})();
