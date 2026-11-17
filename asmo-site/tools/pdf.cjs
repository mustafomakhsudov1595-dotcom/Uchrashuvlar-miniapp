const {chromium}=require('playwright'); const path=require('path');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage();
 await p.goto('file://'+path.join(__dirname,'catalog.html')); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(1500);
 await p.pdf({path:path.join(__dirname,'../ASMO-katalog.pdf'),width:'297mm',height:'210mm',printBackground:true,preferCSSPageSize:true});
 await p.screenshot({path:'/tmp/claude-0/cat.png',fullPage:false});
 await b.close();
})();
