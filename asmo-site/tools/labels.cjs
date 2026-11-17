const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:2048,height:1066}});
 const L=[['milano',0],['eron',0],['grunt',0],['vodo',0],['milano',1],['eron',1],['grunt',1],['vodo',1],['lucida',1]];
 for(const [id,back] of L){
  await p.goto(`file://${__dirname}/labels.html?p=${id}&back=${back}`); await p.waitForTimeout(900); await p.evaluate(()=>document.fonts.ready);
  const out=`${__dirname}/../assets/tex/${id}${back?'_back':''}.jpg`;
  await p.screenshot({path:out,type:'jpeg',quality:92}); console.log(out);
 }
 await b.close();
})();
