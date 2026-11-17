const {chromium}=require('playwright'); const path=require('path');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1200,height:1200}});
 for(const [n,color,seed,fs] of [['blue','#587aa6',7,'.009 .009'],['brown','#b48a63',11,'.009 .009']]){
  await p.setContent(`<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><filter id="p" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${fs}" numOctaves="6" seed="${seed}" result="n"/><feDiffuseLighting in="n" lighting-color="${color}" surfaceScale="3.2" diffuseConstant="1.25"><feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting></filter><rect width="1200" height="1200" filter="url(#p)"/></svg></body>`);
  await p.screenshot({path:path.join(__dirname,`../assets/parts/plaster-${n}.jpg`),type:'jpeg',quality:84});
 }
 await b.close();
})();
