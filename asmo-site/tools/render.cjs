const {chromium}=require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const srv=http.createServer((q,s)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end();}else{s.writeHead(200,{'content-type':f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.jpg')?'image/jpeg':'application/octet-stream'});s.end(d);}})}).listen(0);
const P=[['lucida-bikser','bikser','lucida_back'],['lucida-premium','premium','lucida_back'],['perla','perla','perla_back'],['milano','milano','milano_back'],['eron-tosh','eron','eron_back'],['grunt','grunt','grunt_back'],['vodoemulsiya','vodo','vodo_back']];
const only=process.argv[2];
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1400,height:1400}}); p.on('console',m=>console.log('console',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto(`http://localhost:${srv.address().port}/tools/render.html`); await p.waitForFunction('window.ready',null,{timeout:20000});
 for(const [id,f,bk] of P){ if(only&&only!==id) continue;
  for(const [tag,rot,el] of [['front',0.0,0.17],['angle',-0.42,0.2],['back',Math.PI+0.5,0.17]]){
   const d=await p.evaluate(([a,b,c,e,g])=>window.renderProduct(a,b,c,e),[`/assets/tex/${f}.jpg`,`/assets/tex/${bk}.jpg`,rot,el]);
   fs.mkdirSync(root+'/assets/renders/raw',{recursive:true}); fs.writeFileSync(`${root}/assets/renders/raw/${id}-${tag}.png`,Buffer.from(d.split(',')[1],'base64')); console.log(id,tag);
  }}
 await b.close(); srv.close();
})();
