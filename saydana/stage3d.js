/* Saydana — 3D sahna: MRT, MSKT va rentgen apparatlari (Three.js, tayyor model fayllarsiz) */
(function () {
  'use strict';
  var host = document.getElementById('stage'), cv = document.getElementById('gl');
  if (!host || !cv) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MODES = {
    mr: { title: 'SAYDANA · MRT<br>3D MODEL', scan: 'mr' },
    ct: { title: 'SAYDANA · MSKT<br>3D MODEL', scan: 'ct' },
    xr: { title: 'SAYDANA · RENTGEN<br>3D MODEL', scan: 'xray' }
  };
  var mode = 'mr';

  /* ---- tasvirlar: kesim (inset) va kichik rasmlar ---- */
  var inset = document.getElementById('inset'), insetCtl = null;
  if (window.Scan) {
    if (inset) insetCtl = Scan.mount(inset, 'mr', { N: 168 });
    Array.prototype.forEach.call(document.querySelectorAll('.mthumb'), function (c) { Scan.mount(c, c.dataset.kind, { N: 96, fps: 0 }); });
  }
  var titleEl = document.getElementById('stTitle');
  var btns = Array.prototype.slice.call(document.querySelectorAll('.modes [data-m]'));
  var gl3 = null;
  function setMode(m) {
    if (!MODES[m]) return;
    mode = m;
    btns.forEach(function (b) { var on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    if (titleEl) titleEl.innerHTML = MODES[m].title;
    if (insetCtl) insetCtl.setKind(MODES[m].scan);
    if (gl3) gl3.wake();
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.m); }); });

  function noGL() { host.classList.add('nogl'); cv.hidden = true; }
  var THREE = window.THREE;
  if (!THREE) { noGL(); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { noGL(); return; }
  if (!renderer.getContext()) { noGL(); return; }
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(0, 1.2, 13.8); camera.lookAt(0, -.15, 0);

  /* yoritish */
  scene.add(new THREE.HemisphereLight(0xdfe3f0, 0x22222e, .62));
  var key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(4, 6, 7); scene.add(key);
  var rim = new THREE.PointLight(0xF70D45, 2.4, 26); rim.position.set(-5.5, 1.5, -3); scene.add(rim);
  var fill = new THREE.PointLight(0xffffff, .55, 20); fill.position.set(5, -1, 5); scene.add(fill);

  /* materiallar */
  var white = new THREE.MeshStandardMaterial({ color: 0xe4e7ee, roughness: .4, metalness: .08 });
  var gray = new THREE.MeshStandardMaterial({ color: 0xaab0be, roughness: .55, metalness: .05 });
  var dark = new THREE.MeshStandardMaterial({ color: 0x1d1d26, roughness: .55, metalness: .2 });
  var redEm = new THREE.MeshStandardMaterial({ color: 0xF70D45, emissive: 0xF70D45, emissiveIntensity: 1.0, roughness: .4 });
  var gown = new THREE.MeshStandardMaterial({ color: 0x5b86c0, roughness: .85 });
  var skin = new THREE.MeshStandardMaterial({ color: 0xe3c8b4, roughness: .7 });

  function rrect(w, h, r) {
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function gantry(w, h, r, holeR, depth) {
    var shape = rrect(w, h, r), hole = new THREE.Path(); hole.absarc(0, 0, holeR, 0, Math.PI * 2, true); shape.holes.push(hole);
    var geo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 4, curveSegments: 64 });
    geo.center(); return new THREE.Mesh(geo, white);
  }
  function bore(holeR, len) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(holeR, holeR, len, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x26262f, roughness: .7, side: THREE.BackSide }));
    m.rotation.x = Math.PI / 2; return m;
  }
  function ring(radius, tube, z, mat) { var t = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 16, 96), mat || redEm); t.position.z = z; return t; }

  /* yozuv: "saydana" */
  var wm = document.createElement('canvas'); wm.width = 512; wm.height = 128;
  var wmTex = new THREE.CanvasTexture(wm); wmTex.encoding = THREE.sRGBEncoding;
  function paintWordmark() {
    var c = wm.getContext('2d'); c.clearRect(0, 0, 512, 128); c.fillStyle = '#F70D45';
    c.font = '800 92px Manrope, "Segoe UI", Arial, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillText('saydana', 256, 66); wmTex.needsUpdate = true;
  }
  paintWordmark();
  if (document.fonts && document.fonts.load) document.fonts.load('800 92px Manrope').then(paintWordmark, function () {});
  function wordmark(w, y, z) {
    var p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: wmTex, transparent: true }));
    p.position.set(0, y, z); return p;
  }

  /* bemor stoli */
  function makeTable() {
    var g = new THREE.Group();
    var ped = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, .9), gray); ped.position.set(0, -1.55, 2.2); g.add(ped);
    var base = new THREE.Mesh(new THREE.BoxGeometry(1.9, .22, 1.5), dark); base.position.set(0, -2.4, 2.2); g.add(base);
    var slab = new THREE.Group();
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.25, .16, 6), white); top.position.y = -.72; slab.add(top);
    var stripe = new THREE.Mesh(new THREE.BoxGeometry(1.27, .03, 6.02), redEm); stripe.position.y = -.8; slab.add(stripe);
    var body = new THREE.Mesh(new THREE.CapsuleGeometry(.36, 1.5, 6, 20), gown); body.rotation.x = Math.PI / 2; body.position.set(0, -.28, .5); slab.add(body);
    var legs = new THREE.Mesh(new THREE.CapsuleGeometry(.26, 1.2, 6, 16), gown); legs.rotation.x = Math.PI / 2; legs.position.set(0, -.38, 2.0); slab.add(legs);
    var head = new THREE.Mesh(new THREE.SphereGeometry(.3, 24, 20), skin); head.position.set(0, -.26, -.92); slab.add(head);
    g.add(slab); g.userData.slab = slab; return g;
  }

  /* MRT */
  function makeMR() {
    var g = new THREE.Group();
    g.add(gantry(4.7, 4.4, .75, 1.32, 1.7));
    g.add(bore(1.32, 1.9));
    g.add(ring(1.35, .04, .95)); g.add(ring(1.35, .04, -.95));
    var wmk = wordmark(2.0, 1.78, .97); g.add(wmk);
    var strip = new THREE.Mesh(new THREE.BoxGeometry(2.4, .1, .02), redEm); strip.position.set(0, -1.8, .96); g.add(strip);
    [-1.45, 1.45].forEach(function (x) { var f = new THREE.Mesh(new THREE.BoxGeometry(1.2, .4, 1.5), gray); f.position.set(x, -2.4, 0); g.add(f); });
    var tbl = makeTable(); g.add(tbl); g.userData.slab = tbl.userData.slab;
    var scan = ring(1.3, .028, 0); g.userData.scan = scan; g.add(scan);
    var glow = new THREE.PointLight(0xF70D45, 1.1, 5); glow.position.set(0, 0, 0); g.add(glow);
    g.userData.depth = 1.6; return g;
  }
  /* MSKT */
  function makeCT() {
    var g = new THREE.Group();
    g.add(gantry(5.1, 5.0, 1.6, 1.65, .95));
    g.add(bore(1.65, 1.05));
    g.add(ring(1.68, .045, .56)); g.add(ring(1.68, .045, -.56));
    g.add(wordmark(2.2, 2.0, .58));
    var det = new THREE.Group();
    det.add(new THREE.Mesh(new THREE.TorusGeometry(1.58, .05, 12, 96), dark));
    var d1 = new THREE.Mesh(new THREE.BoxGeometry(.55, .3, .25), redEm); d1.position.x = 1.58; det.add(d1);
    var d2 = new THREE.Mesh(new THREE.BoxGeometry(.4, .34, .25), dark); d2.position.x = -1.58; det.add(d2);
    g.add(det); g.userData.det = det;
    [-1.55, 1.55].forEach(function (x) { var f = new THREE.Mesh(new THREE.BoxGeometry(1.2, .45, 1.2), gray); f.position.set(x, -2.72, 0); g.add(f); });
    var tbl = makeTable(); g.add(tbl); g.userData.slab = tbl.userData.slab;
    var glow = new THREE.PointLight(0xF70D45, .9, 5); g.add(glow);
    g.userData.depth = 1.3; return g;
  }
  /* Rentgen */
  function makeXR() {
    var g = new THREE.Group();
    var tb = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.0, 3.7), white); tb.position.set(.6, -1.6, 0); g.add(tb);
    var tt = new THREE.Mesh(new THREE.BoxGeometry(2.8, .12, 3.8), gray); tt.position.set(.6, -1.04, 0); g.add(tt);
    var bk = new THREE.Mesh(new THREE.BoxGeometry(2.1, .05, 2.8), dark); bk.position.set(.6, -.97, 0); g.add(bk);
    var field = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), new THREE.MeshBasicMaterial({ color: 0xF70D45, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false }));
    field.rotation.x = -Math.PI / 2; field.position.set(.6, -.94, 0); g.add(field); g.userData.field = field;
    var col = new THREE.Mesh(new THREE.BoxGeometry(.32, 5.6, .32), white); col.position.set(-2.4, .55, 0); g.add(col);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, .24, .24), white); arm.position.set(-.8, 3.1, 0); g.add(arm);
    var rod = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .7, 20), gray); rod.position.set(.6, 2.75, 0); g.add(rod);
    var head = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .95, 36), white); head.rotation.z = Math.PI / 2; head.rotation.y = Math.PI / 2; head.position.set(.6, 2.25, 0); g.add(head);
    var coll = new THREE.Mesh(new THREE.BoxGeometry(1.0, .45, 1.0), dark); coll.position.set(.6, 1.75, 0); g.add(coll);
    var lens = new THREE.Mesh(new THREE.CircleGeometry(.32, 32), redEm); lens.rotation.x = Math.PI / 2; lens.position.set(.6, 1.52, 0); g.add(lens);
    var cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.5, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xF70D45, transparent: true, opacity: .15, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    cone.position.set(.6, .26, 0); g.add(cone); g.userData.cone = cone;
    var phantom = new THREE.Mesh(new THREE.CapsuleGeometry(.5, 1.1, 6, 20), gown); phantom.rotation.x = Math.PI / 2; phantom.position.set(.6, -.56, 0); phantom.scale.set(1.15, 1, .55); g.add(phantom);
    g.position.x = -.3; return g;
  }

  var models = { mr: makeMR(), ct: makeCT(), xr: makeXR() };
  var world = new THREE.Group(); scene.add(world);
  Object.keys(models).forEach(function (k) { models[k].userData.s = k === 'mr' ? 1 : 0; world.add(models[k]); });

  /* pol: yaltiroq doira va halqalar */
  var gc = document.createElement('canvas'); gc.width = gc.height = 256;
  (function () { var c = gc.getContext('2d'), g = c.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(247,13,69,.55)'); g.addColorStop(.55, 'rgba(247,13,69,.16)'); g.addColorStop(1, 'rgba(247,13,69,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); })();
  var floor = new THREE.Mesh(new THREE.CircleGeometry(5.6, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.95; scene.add(floor);
  var rings = new THREE.Group(); rings.position.y = -2.93;
  [[3.6, 3.63, .55], [4.5, 4.52, .3], [5.3, 5.31, .16]].forEach(function (r) {
    var m = new THREE.Mesh(new THREE.RingGeometry(r[0], r[1], 128), new THREE.MeshBasicMaterial({ color: 0xF70D45, transparent: true, opacity: r[2], side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; rings.add(m);
  });
  scene.add(rings);

  /* zarrachalar */
  var PC = 150, ppos = new Float32Array(PC * 3);
  for (var i = 0; i < PC; i++) { var a = Math.random() * 6.283, rad = 3 + Math.random() * 4.5; ppos[i * 3] = Math.cos(a) * rad; ppos[i * 3 + 1] = -2.5 + Math.random() * 7; ppos[i * 3 + 2] = Math.sin(a) * rad * .7; }
  var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  var points = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xff7a99, size: .05, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(points);

  /* o'lcham */
  function resize() {
    var w = host.clientWidth || 400, h = host.clientHeight || 400;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 520 ? 1.5 : 2));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .9 ? 38 : 32; camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); render(lastT); }).observe(host); else window.addEventListener('resize', function () { resize(); render(lastT); });

  /* boshqaruv: sudrab aylantirish va sichqoncha */
  var yawUser = 0, pitchUser = 0, parX = 0, parY = 0, drag = null, lastT = reduce ? 1.4 : 0;
  host.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; try { host.setPointerCapture(e.pointerId); } catch (er) {} wake(); });
  host.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    if (drag) { yawUser += (e.clientX - drag.x) * .009; pitchUser = Math.max(-.22, Math.min(.22, pitchUser + (e.clientY - drag.y) * .004)); drag.x = e.clientX; drag.y = e.clientY; }
    else { parX = ((e.clientX - r.left) / r.width - .5) * .35; parY = ((e.clientY - r.top) / r.height - .5) * .12; }
    wake();
  });
  function endDrag() { drag = null; }
  host.addEventListener('pointerup', endDrag); host.addEventListener('pointercancel', endDrag);
  host.addEventListener('pointerleave', function () { parX = parY = 0; });

  /* chizish */
  var prev = 0;
  function render(t) {
    var dt = Math.min(.05, Math.max(0, t - prev)); prev = t;
    Object.keys(models).forEach(function (k) {
      var m = models[k], u = m.userData, target = k === mode ? 1 : 0;
      u.s += (target - u.s) * Math.min(1, dt * 7 + (reduce ? 1 : 0));
      m.visible = u.s > .02; var sc = .001 + Math.pow(u.s, 1.4) * .999; m.scale.setScalar(sc); m.position.y = (1 - u.s) * -.8;
      if (!m.visible) return;
      if (u.slab) u.slab.position.z = .65 + 1.25 * Math.sin(t * .6);
      if (u.scan) u.scan.position.z = Math.sin(t * 1.5) * (u.depth * .5);
      if (u.det) u.det.rotation.z = t * 1.4;
      if (u.cone) { var fl = Math.pow(Math.max(0, Math.sin(t * 1.2)), 14); u.cone.material.opacity = .08 + .1 * (.5 + .5 * Math.sin(t * 2.6)) + fl * .45; u.field.material.opacity = .22 + fl * .6; }
    });
    if (!drag) yawUser *= (1 - Math.min(1, dt * .5));
    world.rotation.y = -.62 + Math.sin(t * .32) * .3 + yawUser + parX;
    world.rotation.x = pitchUser + parY * .5;
    rings.rotation.y = t * .12; points.rotation.y = t * .05;
    floor.material.opacity = .8 + .2 * Math.sin(t * 1.6);
    renderer.render(scene, camera);
  }

  /* sikl: faqat ko'rinib turganda */
  var vis = true, running = false, t0 = performance.now();
  function loop(now) {
    running = false;
    if (!vis || document.hidden) return;
    lastT = (now - t0) / 1000; render(lastT);
    if (!reduce) { running = true; requestAnimationFrame(loop); }
  }
  function wake() { if (reduce) { lastT = lastT + .001; render(lastT); return; } if (!running && vis) { running = true; requestAnimationFrame(loop); } }
  gl3 = { wake: wake };
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) wake(); }, { threshold: .02 }).observe(host);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  if (reduce) { for (var k = 0; k < 8; k++) render(lastT); } else wake();
  window.Stage = { setMode: setMode };
})();
