/* ASMO 3D bucket: procedural paint bucket wrapped with the real label art.
   Used live in the hero and offline (tools/render.html) to pre-render product images. */
(function(root){
'use strict';
const H0=0.14,H1=1.28;                         // label band (world units, bucket height ~1.6)
const rAt=y=>0.84+(y-0.10)*0.0943;            // body cone radius at height y

function makeEnv(THREE,renderer){
  // procedural studio: soft white dome + large softboxes -> PMREM environment
  const s=new THREE.Scene();
  const gc=document.createElement('canvas'); gc.width=4; gc.height=256; const gx=gc.getContext('2d');
  const gr=gx.createLinearGradient(0,0,0,256); gr.addColorStop(0,'#9a9ca3'); gr.addColorStop(.5,'#4d4e54'); gr.addColorStop(1,'#1d1d20');
  gx.fillStyle=gr; gx.fillRect(0,0,4,256); const gt=new THREE.CanvasTexture(gc); gt.encoding=THREE.sRGBEncoding;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(30,48,24),new THREE.MeshBasicMaterial({map:gt,side:THREE.BackSide}));
  s.add(dome);
  const box=(w,h,x,y,z,i)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);s.add(m);};
  box(16,22,-18,6,10,9);        // key softbox, left front
  box(12,18,20,8,6,4.5);          // fill, right
  box(26,6,0,24,2,6.5);           // top strip
  box(10,20,-4,6,-22,3.8);        // back rim
  const pm=new THREE.PMREMGenerator(renderer); const t=pm.fromScene(s,0.035).texture; pm.dispose(); return t;
}

function contactTexture(THREE){
  const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d');
  const r=g.createRadialGradient(128,128,10,128,128,128);
  r.addColorStop(0,'rgba(0,0,0,.62)'); r.addColorStop(.35,'rgba(0,0,0,.34)'); r.addColorStop(.7,'rgba(0,0,0,.08)'); r.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=r; g.fillRect(0,0,256,256); const t=new THREE.CanvasTexture(c); return t;
}
function openTexture(THREE){
  const c=document.createElement('canvas'); c.width=256; c.height=96; const g=c.getContext('2d');
  g.fillStyle='#0c0c0e'; g.fillRect(0,0,256,96);
  g.fillStyle='#5a5a60'; g.font='700 40px Arial'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('OPEN ▾',128,50);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t;
}

function build(THREE,o){
  // o: {front:Texture, back:Texture, ratioFront, ratioBack, anisotropy}
  const g=new THREE.Group();
  const plastic=new THREE.MeshPhysicalMaterial({color:0x050507,roughness:.48,metalness:0,clearcoat:.45,clearcoatRoughness:.3,envMapIntensity:.6});
  const plasticLid=new THREE.MeshPhysicalMaterial({color:0x050507,roughness:.4,metalness:0,clearcoat:.5,clearcoatRoughness:.25,envMapIntensity:.65});
  // body
  const bp=[[0,0],[.77,0],[.815,.008],[.835,.045],[.842,.11],[rAt(1.30)-.002,1.30],[.965,1.325],[.992,1.355],[1.0,1.39],[1.0,1.45],[.975,1.47],[.94,1.47]].map(p=>new THREE.Vector2(p[0],p[1]));
  const body=new THREE.Mesh(new THREE.LatheGeometry(bp,160),plastic); body.castShadow=true; g.add(body);
  // reinforcing rings
  [.2,1.18].forEach(y=>{const t=new THREE.Mesh(new THREE.TorusGeometry(rAt(y)+.004,.008,10,160),plastic);t.rotation.x=Math.PI/2;t.position.y=y;});
  // labels
  const lab=(tex,ratio,theta0)=>{
    const hh=H1-H0, rm=rAt((H0+H1)/2)+.004, alpha=Math.min(ratio*hh/rm,Math.PI*1.1);
    const geo=new THREE.CylinderGeometry(rAt(H1)+.004,rAt(H0)+.004,hh,160,1,true,theta0-alpha/2,alpha);
    const m=new THREE.Mesh(geo,new THREE.MeshPhysicalMaterial({map:tex,roughness:.55,metalness:0,clearcoat:.5,clearcoatRoughness:.22,envMapIntensity:.7}));
    m.position.y=(H0+H1)/2; return m;
  };
  if(o.front) g.add(lab(o.front,o.ratioFront||1.92,0));
  if(o.back) g.add(lab(o.back,o.ratioBack||1.92,Math.PI));
  // lid
  const lp=[[1.04,1.29],[1.052,1.33],[1.052,1.555],[1.03,1.595],[.97,1.612],[.915,1.606],[.9,1.585],[.86,1.576],[0,1.576]].map(p=>new THREE.Vector2(p[0],p[1]));
  const lid=new THREE.Mesh(new THREE.LatheGeometry(lp,160),plasticLid); lid.castShadow=true; g.add(lid);
  const gr=new THREE.Mesh(new THREE.TorusGeometry(.74,.006,8,160),plasticLid); gr.rotation.x=Math.PI/2; gr.position.y=1.578; g.add(gr);
  const gr2=new THREE.Mesh(new THREE.TorusGeometry(.5,.005,8,160),plasticLid); gr2.rotation.x=Math.PI/2; gr2.position.y=1.577; g.add(gr2);
  const tab=new THREE.Mesh(new THREE.PlaneGeometry(.34,.1),new THREE.MeshStandardMaterial({map:openTexture(THREE),roughness:.5}));
  tab.position.set(0,1.44,1.0535); g.add(tab);
  // handle (wire) leaning back
  const hg=new THREE.Group(); hg.position.set(0,1.40,0);
  const metal=new THREE.MeshStandardMaterial({color:0x8a8d94,metalness:1,roughness:.34,envMapIntensity:.9});
  const curve=new THREE.CatmullRomCurve3(Array.from({length:41},(_,i)=>{const a=Math.PI*i/40;return new THREE.Vector3(-Math.cos(a)*1.075,Math.sin(a)*.95,0);}));
  const wire=new THREE.Mesh(new THREE.TubeGeometry(curve,120,.03,12,false),metal); wire.castShadow=true; hg.add(wire);
  const grip=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.55,24),plastic); grip.rotation.z=Math.PI/2; grip.position.set(0,.95,0); hg.add(grip);
  [-1,1].forEach(s=>{const e=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.1,24),plasticLid); e.rotation.z=Math.PI/2; e.position.set(s*1.03,0,0); g.add(e); e.position.y=1.40;});
  hg.rotation.x=-.5; g.add(hg);
  return g;
}

function stage(THREE,renderer,opts){
  opts=opts||{};
  const scene=new THREE.Scene();
  scene.environment=makeEnv(THREE,renderer);
  const key=new THREE.DirectionalLight(0xffffff,1.15); key.position.set(-4,9,6); key.castShadow=true;
  key.shadow.mapSize.set(2048,2048); key.shadow.radius=9; key.shadow.bias=-0.0004;
  Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:1,far:20}); scene.add(key);
  const rim=new THREE.DirectionalLight(0xfff3d6,.7); rim.position.set(5,4,-6); scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,14),new THREE.ShadowMaterial({opacity:.13})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4),new THREE.MeshBasicMaterial({map:contactTexture(THREE),transparent:true,depthWrite:false}));
  blob.rotation.x=-Math.PI/2; blob.position.y=.002; scene.add(blob);
  const cam=new THREE.PerspectiveCamera(opts.fov||22,1,.1,100);
  return {scene,cam,floor,blob};
}
function frame(cam,aspect,elev,zoom){
  cam.aspect=aspect;
  const dist=(aspect<1?9.2/aspect*0.78:9.2)*(zoom||1), e=(elev==null?0.19:elev);
  cam.position.set(0,1.15+Math.sin(e)*dist,Math.cos(e)*dist); cam.lookAt(0,1.1,0); cam.updateProjectionMatrix();
}
root.ASMO3D={build,stage,frame,H0,H1};
})(window);
