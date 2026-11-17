const {chromium}=require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(root,u);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end();}else{s.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});s.end(d);}})}).listen(0);
(async()=>{
 const b=await chromium.launch();
 const sizes=[[320,640],[390,844],[768,1024]];
 for(const [w,h] of sizes){
  const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:w<800,isMobile:w<800,deviceScaleFactor:2});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForTimeout(1200);
  const H=await p.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<H;y+=400){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(60);}
  await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{
    const out={sw:document.documentElement.scrollWidth,iw:innerWidth,over:[],small:[],tiny:[]};
    document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'){let a=e,skip=false;while(a){const s=getComputedStyle(a);if(s.overflowX==='auto'||s.overflowX==='scroll'||s.overflow==='hidden'){skip=true;break;}a=a.parentElement;}if(!skip)out.over.push((e.id||e.className||e.tagName).toString().slice(0,40)+':'+Math.round(r.right));}});
    document.querySelectorAll('a,button,select,input,textarea').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&(r.height<40||r.width<40)&&getComputedStyle(e).visibility!=='hidden'&&r.height>0&&!e.closest('.footer')){out.small.push((e.id||e.className||e.textContent||e.tagName).toString().trim().slice(0,24)+' '+Math.round(r.width)+'x'+Math.round(r.height));}});
    document.querySelectorAll('p,span,li,dd,dt,b,small,em,a,label').forEach(e=>{const s=parseFloat(getComputedStyle(e).fontSize);if(s<11.5&&e.textContent.trim()&&e.getBoundingClientRect().width)out.tiny.push(e.textContent.trim().slice(0,18)+' '+s.toFixed(1));});
    return out;});
  console.log(`${w}x${h} H=${H} overflow:${r.sw>r.iw?'YES '+r.sw:'no'}`, r.over.slice(0,5), 'small:',[...new Set(r.small)].slice(0,8), 'tiny:',[...new Set(r.tiny)].slice(0,6), errs);
  await ctx.close();
 }
 await b.close(); srv.close();
})();
